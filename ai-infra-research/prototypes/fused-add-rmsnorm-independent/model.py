"""Fixed-revision source adapter, deliberately independent of DOM and 950 engine."""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parent
SOURCE=json.loads((ROOT/'sources.json').read_text())
K=SOURCE['sources']['kernel']['text'].splitlines()
def line(text,after=0):
    return next(i+1 for i,s in enumerate(K) if i>=after and text in s)
def build(B,H,cores=48,core=0,origin='public'):
    A=math.ceil(H/16)*16; T=min(A,4096); whole=A<=T
    rows=math.ceil(B/cores); start=core*rows; end=min(B,start+rows)
    if start>=end: end=start
    shown=list(range(start,min(end,start+3)))
    cid=f'{B}x{H}/aiv{cores}/core{core}'
    events=[]; life=[]
    def event(lane,label,kind,row=None,chunk=None,src='',parents=(),after=0):
        i=len(events); eid=f'{cid}/event/{i}'
        events.append(dict(id=eid,index=i,lane=lane,label=label,kind=kind,row=row,chunk=chunk,line=line(src,after),parents=list(parents)))
        return i
    def interval(buffer,name,size,s,e,role='activation',slot=None,row=None,chunk=None,semantics='allocation'):
        life.append(dict(id=f'{cid}/life/{len(life)}',buffer=buffer,name=name,size=size,start=s,end=e,role=role,slot=slot,row=row,chunk=chunk,eventId=events[s]['id'],line=events[s]['line'],semantics=semantics))
    capacities={'inQueX':4*T,'inQueRes':4*T,'outQueY':4*T,'outQueResOut':4*T,'weightHalfBuf':2*T,'weightFp32Buf':4*T,'resoFp32Buf':4*T,'sqBuf':4*T,'meanBuf':4*T,'nrBuf':4*T,'resOutHalfBuf0':2*T,'resOutHalfBuf1':2*T,'yHalfBuf0':2*T,'yHalfBuf1':2*T,'scalarBuf':32,'reduceTmpBuf':32}
    if shown and whole:
        w=event(0,'γ → UB','weight',src='LoadWeightRow(weightFp32, 0')
        cast=event(1,'γ FP16 → FP32','cast',src='Cast(wFp32, wHalf')
        loads={}; outputs=[]
        def load(row,pre=False):
            e=event(0,f'r{row} X + R'+(' 预取' if pre else ' 首读'),'input',row,src='CopyInRow(xNext' if pre else 'CopyInRow(xPrefetch')
            loads[row]=e
        load(shown[0])
        for r in shown:
            if r+1<end: load(r+1,True)
            slot=r%2
            if r>=start+2:
                wait=event(3,f'等待槽 {slot} 写回','wait',r,src='WaitFlag<AscendC::HardEvent::MTE3_V>(eid);')
                for l in outputs:
                    if l['slot']==slot and l['end'] is None: l['end']=wait+1
            add=event(1,f'r{r} Add FP16','add',r,src='if (eid == 0) AscendC::Add',parents=[events[loads[r]]['id']])
            red=event(1,f'r{r} Σ / Rsqrt / NR','reduce',r,src='ReduceNormal(scalar, sq, H);',parents=[events[add]['id']])
            norm=event(1,f'r{r} × γ → Y','norm',r,src='Mul(resoFp32, resoFp32, sq, alignH);',parents=[events[red]['id']])
            write=event(2,f'r{r} R_out + Y → GM','write',r,src='CopyOutRow(resOutHalf0',parents=[events[norm]['id']])
            free=event(3,f'r{r} Free X / R','free',r,src='inQueX.FreeTensor(xLocal);')
            for buf,n in [('inQueX','X'),('inQueRes','R')]: interval(buf,f'{n}[r{r}]',A*2,loads[r],free+1,row=r)
            for buf,n,s in [(f'resOutHalfBuf{slot}','R_out',add),(f'yHalfBuf{slot}','Y',norm)]:
                interval(buf,f'{n}[r{r}] · slot {slot}',A*2,s,None,slot=slot,row=r,semantics='explicit TBuf content until reuse wait');outputs.append(life[-1])
        drain=event(3,'Drain · 等待末两次写回' if end<=start+3 else '视窗截断 · 后续行继续', 'drain' if end<=start+3 else 'window',src='// Drain: wait for last 2 MTE3 operations' if end<=start+3 else 'for (int64_t row = this->startRow')
        for l in life:
            if l['end'] is None:
                l['end']=len(events)
                if end>start+3:l['semantics']='content continues beyond display window'
        # A prefetch from the next undisplayed iteration remains live at the cut.
        for r,s in loads.items():
            if r not in shown:
                for buf,n in [('inQueX','X'),('inQueRes','R')]:interval(buf,f'{n}[r{r}] · 窗口外预取',A*2,s,len(events),row=r,semantics='allocation continues beyond display window')
        interval('weightHalfBuf','γ FP16',A*2,w,cast+1,'weight',semantics='content use')
        interval('weightFp32Buf','γ FP32 · 当前核',A*4,cast,len(events),'weight',semantics='content retained across rows')
    elif shown:
        r=shown[0]; chunks=math.ceil(H/T); chunk_start=line('inline void ProcessChunkedRows'); second=line('off = 0;',line('float meanPlusEps = sumSq',chunk_start))
        for c in range(chunks):
            n=min(T,H-c*T);na=math.ceil(n/16)*16
            s=event(0,f'c{c} X + R 首读','input',r,c,src='CopyInChunk(xLocal')
            v=event(1,f'c{c} Cast → Add FP32 → Σ','reduce',r,c,src='ReduceNormal(scalar, sq, n);',parents=[events[s]['id']])
            f=event(3,f'c{c} Free X / R','free',r,c,src='inQueX.FreeTensor(xLocal);',after=chunk_start)
            for buf,nm in [('inQueX','X'),('inQueRes','R')]:interval(buf,f'{nm}[c{c}] · 第一遍',na*2,s,f+1,row=r,chunk=c)
        event(3,'sumSq / H + eps','scalar',r,src='float meanPlusEps = sumSq * invH + this->eps;',after=chunk_start)
        for c in range(chunks):
            n=min(T,H-c*T);na=math.ceil(n/16)*16
            s=event(0,f'c{c} X + R 再读','reread',r,c,src='CopyInChunk(xLocal',after=second)
            v=event(1,f'c{c} Add FP32','add',r,c,src='Add(resoFp32, resoFp32, sq, nAlign);',after=second,parents=[events[s]['id']])
            # Locate second-loop Free separately, not the first occurrence.
            f=event(3,f'c{c} Free X / R','free',r,c,src='inQueX.FreeTensor(xLocal);',after=second)
            ro=event(1,f'c{c} Cast → R_out','cast',r,c,src='Cast(resOutLocal, resoFp32',parents=[events[v]['id']])
            wr=event(2,f'c{c} R_out → GM','write',r,c,src='CopyOutChunk(resOutLocal',parents=[events[v]['id']])
            rs=event(1,f'c{c} Rsqrt / NR','reduce',r,c,src='Rsqrt<float>(sq, mean, nAlign);')
            w=event(0,f'c{c} γ → UB','weight',r,c,src='LoadWeightRow(weightFp32, off')
            norm=event(1,f'c{c} × γ → Y','norm',r,c,src='Mul(resoFp32, resoFp32, weightFp32',parents=[events[w]['id'],events[rs]['id']])
            wy=event(2,f'c{c} Y → GM','write',r,c,src='CopyOutChunk(yLocal',parents=[events[norm]['id']])
            for buf,nm in [('inQueX','X'),('inQueRes','R')]:interval(buf,f'{nm}[c{c}] · 第二遍',na*2,s,f+1,row=r,chunk=c)
            interval('outQueResOut',f'R_out[c{c}]',na*2,ro,wr+1,row=r,chunk=c)
            interval('outQueY',f'Y[c{c}]',na*2,norm,wy+1,row=r,chunk=c)
            interval('weightFp32Buf',f'γ[c{c}] FP32',na*4,w,norm+1,'weight',row=r,chunk=c,semantics='content use')
    ticks=len(events)
    for l in life:
        l['freeLine']=events[min(l['end']-1,ticks-1)]['line']
    # Display packing is shared by both views; these are logical bands, not TQue slots.
    for buffer in capacities:
        active=[]; bands=[]
        for l in sorted((l for l in life if l['buffer']==buffer),key=lambda l:l['start']):
            active=[a for a in active if a['end']>l['start']]
            offset=0
            for a in sorted(active,key=lambda a:a['displayOffset']):
                if offset+l['size']<=a['displayOffset']:break
                offset=max(offset,a['displayOffset']+a['size'])
            l['displayOffset']=offset
            band=next((j for j,end in enumerate(bands) if end<=l['start']),len(bands))
            if band==len(bands):bands.append(l['end'])
            else:bands[band]=l['end']
            l['displayBand']=band
            active.append(l)
    whole_notes=[dict(id='precision',title='分支相加精度不同',text='整行分支先 FP16 Add，再转 FP32；分块分支先转 FP32，再 Add。需要在 H=4096/4097 边界做误差对照。',line=line('if (eid == 0) AscendC::Add') if whole else line('Add(resoFp32, resoFp32, sq, nAlign);'))]
    findings=whole_notes+[dict(id='coverage',title='公开用例没有覆盖分块分支',text='五个公开用例 H 都不超过 4096；4097 与 8193 是本轮增加的源码边界配置，尚无设备测试结果。',line=line('else { ProcessChunkedRows(); }'))]
    if whole: findings.append(dict(id='slots',title='显式输出槽与输入队列不同',text='输出按 row & 1 选 TBuf，隔两次迭代等待 MTE3 后复用；输入由 TQue 分配，不推定物理槽号。',line=line('int32_t eid = static_cast<int32_t>(row & 1)')))
    if A!=H: findings.append(dict(id='tail',title=f'尾部 padding {A-H} 个 FP16',text=f'每行有效 {H*2} B；行对齐 {A*2} B。'+('整行归约长度传 H。' if whole else '尾块归约长度传 n，按 nAlign 对齐。')+'写回仅传有效元素。',line=line('ReduceNormal(scalar, sq, H);') if whole else line('ReduceNormal(scalar, sq, n);')))
    return dict(id=cid,shape=[B,H],cores=cores,core=core,origin=origin,aligned=A,tile=T,whole=whole,start=start,end=end,shown=shown,ticks=ticks,events=events,life=life,capacities=capacities,reserved=sum(capacities.values()),findings=findings,requestBytes=dict(x=B*H*2*(1 if whole else 2),residual=B*H*2*(1 if whole else 2),gamma=H*2*(sum(i*rows<B for i in range(cores)) if whole else B),outputs=B*H*4))
def generate():
    public=[(32,4096),(256,1024),(1,4096),(1997,3037),(2048,4096)]
    cases=[build(b,h,origin='public') for b,h in public]+[build(4,h,origin='source-boundary') for h in (4097,8193)]
    return dict(**SOURCE,cases=cases,contract=dict(axis='source order; equal steps; not measured time',cores='48 AIV is an editable analysis parameter, not a discovered device count',window='whole: first three rows of selected core, next prefetch retained; chunk: first row',performance='950 engine intentionally not invoked for 910B'),adapter='manual source adapter at fixed revision; not a general C++ parser')
if __name__=='__main__':
    (ROOT/'model.json').write_text(json.dumps(generate(),ensure_ascii=False,indent=2))
