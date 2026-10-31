function headerTip(x,y,w,h,body,tip){return `<g tabindex="0" role="note" data-tip="${esc(tip)}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent" pointer-events="all"/>${body}</g>`}
/* Source-ordered events: no per-event clock or overlap is inferred. */
let showBufferLife=false,hasExecutionSelection=true;
let executionStep=0,executionKey='',reuseViewer=[],lastQueueTensor=null,reuseSplit=false,reuseMainView=null,queueCursorTick=null,reuseDataKey='';
const eventBarCache=new Map();
function executionModel(){
 const c=config(),split=selected().template==='row_split_2pass',cols=c.shape[1],b=c.dtype==='fp32'?4:2,n=split&&c.dtype==='fp32'?Math.ceil(cols/4096):1,events=[],life=[];
 const add=(lane,label,id,extra={})=>{const compute={x:['x'],reread:['x'],weight:['gamma'],scale:['norm','normGamma'],y:['output'],vf:['square','mean','epsilon','rsqrt']}[id];const e={lane,label,id,compute_node_ids:compute,...extra};e.event_id=`${split?'split':'full'}/${id}/${extra.phase||'main'}/${extra.chunk??0}`;e.source_location={path:K,line:split?({weight:281,x:264,reread:278,scale:286,y:291}[id]||(extra.phase==='rstd'?270:267)):({weight:189,x:205,vf:210,scale:213,y:218}[id]||198),revision:DATA.revision};events.push(e);return events.length-1};
 if(!split){
 add(0,'γ → UB','weight');const start=add(0,'X → UB','x',{bytes:cols*b});add(1,'Σx² → rstd','vf');const norm=add(1,'X · rstd · γ','scale');const out=add(2,'Y → GM','y');
 life.push({name:'X · 保留并复用',start,end:norm+1,size:cols*b,id:'x'},{name:'γ · 常驻当前核',start:0,end:events.length,size:cols*b,id:'weight'},{name:'rstd',start:2,end:norm+1,size:4,id:'vf'},{name:'Y',start:norm,end:out+1,size:cols*b,id:'y'});
 }else{
 for(let k=0;k<n;k++){const size=Math.min(c.dtype==='fp32'?4096:cols,cols-k*(c.dtype==='fp32'?4096:cols))*b,start=add(0,`X[${k}] 首读`,'x',{bytes:size,chunk:k});add(1,`Σx[${k}]²`,'vf',{chunk:k,phase:'partial',compute_node_ids:['square','mean']});life.push({name:`X[${k}] · 第一遍`,start,end:events.length,size,id:'x'});}
 const reduction=add(1,'合并 → rstd','vf',{phase:'rstd',compute_node_ids:['mean','epsilon','rsqrt']});life.push({name:'部分和 → rstd',start:1,end:0,size:n*4+4,id:'vf'});
 for(let k=0;k<n;k++){const size=Math.min(c.dtype==='fp32'?4096:cols,cols-k*(c.dtype==='fp32'?4096:cols))*b,start=add(0,`X[${k}] 再读`,'reread',{bytes:size,reread:true,chunk:k});const g=add(0,`γ[${k}] → UB`,'weight',{chunk:k});const norm=add(1,`X[${k}] · rstd · γ`,'scale',{chunk:k});const out=add(2,`Y[${k}] → GM`,'y',{chunk:k});life.push({name:`X[${k}] · 第二遍`,start,end:norm+1,size,id:'reread'},{name:`γ[${k}]`,start:g,end:norm+1,size,id:'weight'},{name:`Y[${k}]`,start:norm,end:out+1,size,id:'y'});}
 life.find(l=>l.end===0).end=events.length;
 }
 return {events,life,split,n};
}
const hardwareColors={storage:'#3B79D2',transfer:'#FFE300',compute:'#0BB48E'};
function taskImage(label,w,active,reread,lane){const key=[label,w,active,reread,lane].join('|');if(eventBarCache.has(key))return eventBarCache.get(key);const canvas=document.createElement('canvas');canvas.width=Math.ceil(w*2);canvas.height=72;const ctx=canvas.getContext('2d');ctx.scale(2,2);PtoSwimlaneTaskPattern.drawTaskBar(ctx,{x:0,y:0,width:w,height:36,task:{label},baseColor:active?(lane===1?hardwareColors.compute:hardwareColors.transfer):'#55595d',fontFamily:'monospace'});const data=canvas.toDataURL();eventBarCache.set(key,data);return data}
function setExecutionStep(i,fromQueue=false){hasExecutionSelection=true;if(!fromQueue){lastQueueTensor=null;queueCursorTick=null}state.finding=null;state.queueSource=null;executionStep=Math.max(0,Math.min(executionModel().events.length-1,i));state.object=executionModel().events[executionStep].id;render()}

// Constructed byte layout: separate aligned reservations; first-fit reuse within each.
function mockUBLayout(){const data=queueLifetimeData();if(!data)return null;const count=executionModel().events.length,split=selected().template==='row_split_2pass',buffers=[],tensors=[];let base=0;
 for(const b of data.buffers){base=Math.ceil(base/32)*32;buffers.push({...b,base});const active=[];let cursor=0;const ts=data.tensors.filter(t=>t.buffer===b.name&&(split||!t.name.includes('行组')||t.name.endsWith('行组 0'))).map(t=>({...t,start:Math.min(t.allocTick,count-1),end:Math.min(t.freeTick,count)})).sort((a,b)=>a.start-b.start);
 for(const t of ts){const occupied=active.filter(a=>a.end>t.start).sort((a,b)=>a.local-b.local);const candidates=[0,...occupied.map(a=>Math.ceil((a.local+a.size)/32)*32)];const fits=local=>local+t.size<=b.capacity&&occupied.every(a=>local+t.size<=a.local||local>=a.local+a.size);const local=candidates.find(fits);if(local===undefined)throw Error('Mock reservation overflow: '+b.name);t.local=local;t.mockAddress=base+local;cursor=Math.ceil((local+t.size)/32)*32;if(cursor>=b.capacity)cursor=0;active.push(t);tensors.push(t);}base+=b.capacity;}
 return {buffers,tensors,capacity:Math.ceil(base/32768)*32768,evidence:'mock'};
}
function selectBufferStep(el){const id=el.dataset.bufferId,t=mockUBLayout()?.tensors.find(t=>t.id===id);if(t){if(lastQueueTensor?.id===t.id){lastQueueTensor=null;hasExecutionSelection=false;$('inspector').hidden=true;render();return true}$('inspector').hidden=false;lastQueueTensor=t;state.queueSource=[t.srcLineStart,t.srcLineEnd];setExecutionStep(+el.dataset.step,true);state.queueSource=[t.srcLineStart,t.srcLineEnd];$('detail').insertAdjacentHTML('afterbegin',`<section><h3>Mock UB 地址 · ${esc(t.buffer)}</h3><p>[0x${t.mockAddress.toString(16)}, 0x${(t.mockAddress+t.size).toString(16)}) · ${kib(t.size)}</p><p>本页构造的 32 B 对齐分配；非编译器或设备地址。</p></section>`);if(!$('sourcePanel').hidden)sourceRecord();return true}return false}
function executionAction(action){if(action==='reuse')openQueueViewer()}
function queueLifetimeData(){
 const c=config(),a=selected(),split=a.template==='row_split_2pass',k=a.kernel;if(c.dtype!=='fp32'||!k)return null;
 const {events,life,n}=executionModel(),rowBytes=Math.ceil(c.shape[1]*4/1024)*1024,rf=k.row_factor||1,tileBytes=rf*rowBytes,totalGroups=Math.ceil(k.rows_per_core/rf),shownGroups=Math.min(3,totalGroups);
 const q=split?[['inQ',32768],['gQ',32768],['outQ',32768],['rstdBuf',32],['workBuf',256]]:[['inQ',2*tileBytes],['gammaQ',rowBytes],['outQ',2*tileBytes],['rstdBuf',256]];
 const ticks=split?events.length:1+4*shownGroups,tensors=[],last={};
 function add(buffer,name,size,start,end,line,freeLine,event,kind='temp'){
  const id=buffer+'-'+tensors.length,previous=last[buffer],reuse=previous&&previous.freeTick<=start?previous:null;
  const item={id,name,buffer,offset:0,size,allocTick:start,freeTick:end,kind,reuseOf:null,reusedBy:[],srcFile:K,srcLineStart:line,srcLineEnd:freeLine||line,srcHotLine:line,eventIndex:event,relation:'same queue allocator; physical slot is not resolved',code:DATA.sources[K].text.split('\n').slice(line-1,line+1).join('\n')+(freeLine?'\n…\n'+DATA.sources[K].text.split('\n')[freeLine-1]:''),cce:''};
  tensors.push(item);last[buffer]=item;
 }
 if(split){
  for(const l of life){if(l.id==='vf')continue;const buffer=l.id==='weight'?'gQ':l.id==='y'?'outQ':'inQ',second=l.id==='reread',ln=l.id==='weight'?280:l.id==='y'?285:second?277:263,fr=l.id==='weight'?289:l.id==='y'?292:second?288:268;
   add(buffer,l.name,l.size,l.start,l.end,ln,fr,l.start,second?'loop':'temp');}
  add('rstdBuf','rstd 工作区',32,0,ticks,243,null,2*n,'resident');add('workBuf','部分和工作区',256,0,ticks,244,null,1,'resident');
 }else{
  add('gammaQ','γ · 当前核常驻',rowBytes,0,ticks,188,221,0,'resident');
  for(let g=0;g<shownGroups;g++){const base=1+g*4;add('inQ',`X · 行组 ${g}`,tileBytes,base,base+3,204,215,1,g?'loop':'temp');add('outQ',`Y · 行组 ${g}`,tileBytes,base+2,base+4,211,219,3,g?'loop':'temp');}
  add('rstdBuf','rstd 工作区',256,0,ticks,181,null,2,'resident');
 }
 return {kernel:split?'rms_norm_split · Alloc / Free':'rms_norm_full · Alloc / Free',ticks,buffers:q.map(([name,capacity])=>({name,capacity})),tensors,sourceFiles:[],summary:split?`单行 ${n} 块：inQ ${2*n} 次申请，gQ / outQ 各 ${n} 次。`:`当前核前 ${shownGroups} / ${totalGroups} 个行组，rowFactor = ${rf}。`};
}

function destroyQueueOverview(){reuseViewer.forEach(v=>v.destroy());reuseViewer=[];}
function openQueueViewer(){showBufferLife=!showBufferLife;render();}
$('reuseHost').addEventListener('pto-memory-reuse-open-source',e=>{if(!reuseSplit)closeQueueOverview();state.object=e.detail.tensor?.buffer==='gQ'||e.detail.tensor?.buffer==='gammaQ'?'weight':'ub';state.source='kernel';state.queueSource=e.detail.tensor?[e.detail.tensor.srcLineStart,e.detail.tensor.srcLineEnd]:null;$('sourcePanel').hidden=false;sourceRecord()});
$('reuseHost').addEventListener('pto-memory-reuse-tensor-select',e=>{lastQueueTensor=e.detail.tensor;queueCursorTick=lastQueueTensor?.allocTick;const i=e.detail.tensor?.eventIndex;if(Number.isInteger(i)){setExecutionStep(i,true);if(reuseSplit){const x=220+(executionStep+.5)*1400/executionModel().events.length,screenX=view.x+x*view.scale;if(screenX<24||screenX>innerWidth*.5-24){view.x=innerWidth*.25-x*view.scale;transform()}}}});

function eventSourceLine(e){return e.source_location.line}
function eventHardwarePath(){const e=executionModel().events[executionStep];return !e?'':e.lane===0?'GM → L2 → MTE2 → UB':e.lane===1?'UB ↔ SIMD / Vector':'UB → MTE3 → L2 → GM'}
function syncImplementation(){const c=config(),a=selected(),options=c.alternatives.filter(v=>v.feasible),control=$('implementationPicker'),fixed=$('implementationFixed');control.hidden=options.length<2;fixed.hidden=options.length>1;if(options.length>1){$('implementationTrigger').textContent=a.template==='row_resident_1pass'?'整行驻留':'两遍分块';$('implementationMenu').innerHTML=options.map(v=>`<button role="option" aria-selected="${v.template===a.template}" data-mode="${v.template==='row_resident_1pass'?'full':'split'}" data-tip="切换到${v.template==='row_resident_1pass'?'整行驻留':'两遍分块'}实现">${v.template==='row_resident_1pass'?'整行驻留':'两遍分块'}</button>`).join('')}else{fixed.textContent='两遍分块';fixed.dataset.tip=`整行 live ${kib(c.resident_footprint_bytes)} 超过可用 UB ${kib(DATA.ub_bytes)}，当前仅有分块估算`;fixed.tabIndex=0}}

function prepareExecution(){const key=config().shape.join()+'/'+config().dtype+'/'+selected().template;if(executionKey!==key){executionKey=key;executionStep=0;hasExecutionSelection=true;state.finding=null;state.queueSource=null;state.object=executionModel().events[0].id;}}

function closeQueueOverview(){const win=$('reuseWindow'),restore=reuseSplit&&reuseMainView?{...reuseMainView}:null;win.close();reuseSplit=false;reuseMainView=null;document.body.classList.remove('reuse-split');if(restore){Object.assign(view,restore);transform()}$('reuseSplit').setAttribute('aria-pressed','false');destroyQueueOverview();}
function syncQueueSelection(){
 if(!reuseViewer.length||!$('reuseWindow').open)return;if(reuseDataKey!==executionKey){if(!queueLifetimeData()){closeQueueOverview();return}openQueueViewer()}const tick=queueCursorTick??executionStep;
 for(const v of reuseViewer){const active=v.data.tensors.find(t=>t.allocTick<=tick&&tick<t.freeTick);v.state.selected=active?.id||null;if(!lastQueueTensor){v.detailPopover.hidden=true;v.tip.style.display='none'}v.draw()}
 if(reuseSplit&&!lastQueueTensor){const object=executionModel().events[executionStep]?.id,buffer=object==='weight'?(selected().template==='row_split_2pass'?'gQ':'gammaQ'):object==='y'||object==='scale'?'outQ':object==='vf'?'workBuf':'inQ',i=reuseViewer.findIndex(v=>v.data.buffers[0].name===buffer);if(i>=0){const sc=$('reuseHost').querySelector('.queue-scroll'),col=sc.querySelectorAll('.queue-column')[i];if(col.offsetLeft<sc.scrollLeft||col.offsetLeft+col.offsetWidth>sc.scrollLeft+sc.clientWidth)sc.scrollLeft=col.offsetLeft-sc.querySelector('.queue-columns').offsetLeft;}}
}
$('reuseSplit').hidden=true;$('reuseClose').onclick=closeQueueOverview;


function renderComparison(){
 prepareExecution();$('memoryReuseButton').setAttribute('aria-pressed',String(showBufferLife));const c=config(),a=selected(),{events,life,split,n}=executionModel();
 executionStep=Math.min(executionStep,events.length-1);const current=events[executionStep];
 $('identity').textContent=`${c.shape.join(' × ')} · ${c.dtype.toUpperCase()} · ${DATA.revision.slice(0,12)}`;$('caseName').textContent=`${c.shape.join(' × ')} / ${c.dtype.toUpperCase()}`;
 syncImplementation();
 const x0=220,ww=1400,cw=ww/events.length,at=i=>x0+i*cw,rh=state.object==='estimate'&&a.feasible?108:82,ys=[155,155+rh,155+2*rh],my=ys[2]+rh+40;
 let s=' '+tx(25,49,c.dtype==='fp32'?(split?`${n} chunks · 4096 elements / chunk`:'整行 X 保留至归一化'):'BF16 · flow 聚合依赖','muted');
 s+=hit('estimate',`<rect data-focus-target="estimate" class="hit" x="1245" y="-2" width="380" height="60" rx="7" fill="transparent"/>`+tx(1610,20,a.feasible?`${fmt(a.result.theoretical_time_us)} µs`:'容量不满足','lane-title local-label')+tx(1610,46,'全张量 · 模型估算','muted local-sub'),'核对整张量模型时延与带宽口径');
 const phase=(l,r,name)=>{s+=`<path d="M${at(l)} 79H${at(r)-8}" stroke="#505050"/>`+headerTip(at(l),55,Math.max(30,at(r)-at(l)-8),27,tx(at(l)+5,71,name,'phase-label'),name==='rstd'?'rstd = 1 / sqrt(mean(X²) + ε)，由整行平方和计算的归一化系数。':name.includes('第一遍')?'读取各块并累加平方和，为整行计算归一化系数。':name.includes('第二遍')?'重新读取输入，乘以整行归一化系数及权重 γ，再写回输出。':'当前阶段按源码顺序排列；横向长度不表示实际耗时。')};
 if(split){phase(0,n*2,'第一遍 · 平方和');phase(n*2,n*2+1,'rstd');phase(n*2+1,events.length,'第二遍 · 重读与归一化')}else{phase(0,2,'装入');phase(2,4,'归约 → 归一化');phase(4,5,'写回')}
 for(let i=0;i<events.length;i++)s+=`<rect x="${at(i)}" y="88" width="${cw}" height="29" fill="${i===executionStep?getComputedStyle(document.documentElement).getPropertyValue('--hi').trim():'transparent'}"/><text x="${at(i)+cw/2}" y="108" text-anchor="middle" font-size="12" fill="${i===executionStep?'#111':'#aaa'}">${i+1}</text>`;
 if(state.object==='estimate')s+=`<rect data-focus-target="resources" x="18" y="128" width="1610" height="${3*rh-4}" fill="#ffffff0c"/>`;
 s+=headerTip(20,86,195,36,tx(30,110,'指令执行','resource-label'),'按源码步骤排列的执行泳道；横向位置表示顺序，不表示实际耗时。');
 const names=['MTE2','Vector','MTE3'],subs=['GM → UB','归约 / 归一化','UB → GM'];
 names.forEach((name,k)=>{const y=ys[k];s+=`<rect x="18" y="${y-23}" width="1610" height="${rh}" fill="${state.object==='estimate'?'#292929':k%2?'#1b1b1b':'#141414'}"/>`+headerTip(20,y-23,195,rh,tx(30,y+12,name,'life-label')+tx(30,y+34,subs[k],'muted'),['MTE2：将输入从全局内存 GM 搬入核内统一缓冲 UB。','Vector：执行平方和归约、倒平方根及归一化乘法。','MTE3：将 UB 中的输出写回全局内存 GM。'][k]);if(state.object==='estimate'&&a.feasible)s+=tx(30,y+62,fmt([a.result.mte2_time_us,a.result.vector_time_us,a.result.mte3_time_us][k])+' µs · 总需求','muted');

 });
 s+=`<g tabindex="0" role="note" aria-label="源码步骤轴说明" data-tip="源码步骤顺序，等宽排列，非时间轴；横向距离不表示耗时或重叠。"><rect x="220" y="88" width="1400" height="29" fill="transparent" pointer-events="all"/></g>`;
 // Only immediate dependencies of the selected source event are shown.
 for(const i of [executionStep-1,executionStep]){if(i<0||i>=events.length-1)continue;const e=events[i],d=events[i+1];s+=`<path d="M${at(i+1)-7} ${ys[e.lane]+17}H${at(i+1)}V${ys[d.lane]+17}H${at(i+1)+5}" fill="none" stroke="#bdbdbd" stroke-width="1.5" marker-end="url(#arrow)"/>`;}
 function short(e,i){if(!split)return e.id==='weight'?'γ → UB':e.id==='x'?'X → UB':e.id==='vf'?'Σx² → rstd':e.id==='scale'?'X · rstd · γ':'Y → GM';const m=e.label.match(/\[(\d+)\]/),k=m?m[1]:'';return e.id==='x'||e.id==='reread'?'X'+k:e.id==='weight'?'γ'+k:e.id==='y'?'Y'+k:e.id==='scale'?'×'+k:k!==''?'Σ'+k:'rstd'}
 events.forEach((e,i)=>{const w=cw-8,y=ys[e.lane],shortName=short(e,i);s+=`<g class="event-button" data-step="${i}" role="button" tabindex="0" aria-label="${esc(e.label)}" data-tip="${esc(e.label)} · 点击查看当前事件证据"><image x="${at(i)+4}" y="${y}" width="${w}" height="36" href="${taskImage(shortName,w,hasExecutionSelection&&(i===executionStep||(goldenRelated&&goldenMatches(goldenRelated,e))),e.reread,e.lane)}"/></g>`});
 s+=hit('ub',`<rect class="hit" x="20" y="${my-38}" width="215" height="38" rx="7" fill="transparent"/>`+tx(30,my-10,'UB · 数据驻留','resource-label local-label'),'定位 UB 数据驻留与队列复用');if(state.object==='ub')s+=tx(275,my-10,`模型 live ${kib(c.resident_footprint_bytes)} / 可用 ${kib(DATA.ub_bytes)} · Kernel ${a.kernel?kib(a.kernel.allocation_bytes):'—'}`,'caption');if(state.object==='ub')s+=`<rect data-focus-target="ub" x="20" y="${my+8}" width="1600" height="240" rx="6" fill="#ffffff14"/>`;
 state.memoryAnchor={x:1620,y:my-36};$('memoryReuseButton').hidden=c.dtype!=='fp32';
 const track=l=>l.id==='x'||l.id==='reread'?0:l.id==='weight'?1:l.id==='vf'?2:3;
 ['X','γ · 权重','部分和 / rstd','Y'].forEach((name,k)=>s+=`<rect x="18" y="${my+9+k*60}" width="1610" height="60" fill="${k%2?'#1b1b1b':'#141414'}"/>`+headerTip(20,my+9+k*60,195,60,tx(30,my+45+k*60,name,'life-label'),['X：输入数据；两遍分块时同一块先用于平方和，再读入用于归一化。','γ（gamma）：逐元素缩放权重，不是输出 Y。','部分和：各块的平方和累加值；rstd = 1 / sqrt(mean(X²) + ε)，用于整行归一化。','Y：归一化并乘以 γ 后的输出。'][k]));
 for(const l of life){const y=my+21.5+track(l)*60,w=(l.end-l.start)*cw-8,live=hasExecutionSelection&&l.start<=executionStep&&executionStep<l.end;const match=l.name.match(/\[(\d+)\]/),label=match?(l.id==='weight'?'γ':l.id==='y'?'Y':'X')+match[0]:l.id==='x'?'X · 保留':l.id==='weight'?'γ · 常驻':l.id==='vf'?'部分和 → rstd':'Y';
  s+=`<g data-step="${l.start}" class="event-button" role="button" tabindex="0" aria-label="检查 ${esc(l.name)} 存活区间" data-tip="${esc(l.name)} · ${kib(l.size)} · 步骤 ${l.start+1}—${l.end}">${live?`<rect class="tensor-live-marker" x="${at(l.start)}" y="${y-4}" width="${w+8}" height="43" rx="7"/>`:''}${GridTensor.render(at(l.start)+4,y,w,label,live?(l.id==='weight'?VisualSystem.tokens.role.weight:l.id==='vf'?VisualSystem.tokens.role.aggregate:VisualSystem.tokens.role.activation):'#858585',l.id)}</g>`;
 }

 const cm=current.label.match(/\[(\d+)\]/);if(split&&cm){const k=Number(cm[1]),first=life.find(l=>l.id==='x'&&l.name.includes(`[${k}]`)),second=life.find(l=>l.id==='reread'&&l.name.includes(`[${k}]`));if(first&&second){const left=at(first.end)-5,right=at(second.start)+5;s+=`<path d="M${left} ${my+18}V${my+3}H${right}V${my+18}" fill="none" stroke="#bdbdbd" stroke-width="1.2" stroke-dasharray="3 4" pointer-events="none"/>`;}}
 let bufferBottom=my+249;
 const mock=mockUBLayout();
 if(showBufferLife&&mock){const top=my+300,sy=640/mock.capacity,plotEnd=Math.min(mock.capacity,Math.ceil(Math.max(...mock.tensors.map(t=>t.mockAddress+t.size))/8192)*8192),h=plotEnd*sy;bufferBottom=top+h;
 for(let bytes=0;bytes<=plotEnd;bytes+=32768){const y=top+bytes*sy;s+=`<path d="M${x0} ${y}H${x0+ww}" stroke="#303030" stroke-width="1"/>`+tx(30,y+4,(bytes/1024)+' KiB · 0x'+bytes.toString(16),'muted');}
 s+=headerTip(20,top-46,500,36,tx(30,top-20,'UB 地址 · 生命周期','resource-label'),'本案例用于编译前开发分析，地址数据来自 Mock。实际 UB 地址布局属于编译后观测，需接入编译器分配报告；这是应用阶段与输入产物的区别。');
 for(let b=8192;b<plotEnd;b+=8192){if(b%32768===0)continue;const y=top+b*sy;s+=`<path d="M${x0} ${y}H${x0+ww}" stroke="#202020" stroke-width="1"/>`;}
 for(let i=0;i<=events.length;i++){s+=`<path d="M${at(i)} ${top}V${top+h}" stroke="#252525" stroke-width="1"/>`;}

 for(const t of mock.tensors){const start=t.start,end=t.end,y=top+t.mockAddress*sy,height=t.size*sy,roleColor=/gamma|gQ/.test(t.buffer)?'#BCA0F3':/rstd|work/.test(t.buffer)?'#F2C45F':'#79D4F2',e=events[executionStep],eventId=e?.id,live=start<=executionStep&&executionStep<end,sameChunk=!e?.label.match(/\[(\d+)\]/)||!t.name.match(/\[(\d+)\]/)||e.label.match(/\[(\d+)\]/)[1]===t.name.match(/\[(\d+)\]/)[1],uses=eventId==='scale'?true:eventId==='vf'?/inQ|rstd|work/.test(t.buffer):eventId==='weight'?/gamma|gQ/.test(t.buffer):eventId==='y'?t.buffer==='outQ':t.buffer==='inQ',related=hasExecutionSelection&&live&&sameChunk&&uses,color=related||lastQueueTensor?.id===t.id?roleColor:'#666';s+=`<g data-step="${t.eventIndex}" data-buffer-id="${t.id}" role="button" tabindex="0" aria-label="${esc(t.buffer+' / '+t.name)}" data-tip="${esc(t.buffer+' / '+t.name+' · Mock UB [0x'+t.mockAddress.toString(16)+', 0x'+(t.mockAddress+t.size).toString(16)+') · '+kib(t.size)+' · 源码 L'+t.srcLineStart+'—'+t.srcLineEnd)}">${MemoryInspectorBlock.render({x:at(start)+1,y,width:(end-start)*cw-2,height,name:t.name,size:t.size,line:t.srcLineStart,endLine:t.srcLineEnd,color,selected:false})}</g>`;}
 }
 const cx=at(executionStep)+cw/2;s+=`<path d="M${cx} 117V${bufferBottom}" stroke="#bdbdbd" stroke-dasharray="2 5" opacity=".4"/>`;
 const read=events.slice(0,executionStep+1).reduce((s,e)=>s+(e.bytes||0),0),reread=events.slice(0,executionStep+1).filter(e=>e.reread).reduce((s,e)=>s+e.bytes,0),statusY=bufferBottom+44;
 const active=life.filter(l=>l.start<=executionStep&&executionStep<l.end);
 s+=headerTip(20,statusY-22,640,65,tx(25,statusY,`步骤 ${executionStep+1} · ${current.label}`,'caption')+tx(25,statusY+25,`本行累计装入 ${kib(read)} · 其中再读 ${kib(reread)}`,'muted'),`统计本行源码步骤 1—${executionStep+1} 的 X 搬运请求字节；再读包含在装入总量内。`);
 s+=headerTip(680,statusY-22,560,65,tx(700,statusY,'关联 UB 数据','caption')+tx(700,statusY+25,active.map(l=>l.name.replace(' · 第一遍','').replace(' · 第二遍','').replace(' · 保留并复用','').replace(' · 常驻当前核','')).join(' · ')||'等待装入','muted'),'当前步骤对应的数据使用区间；不代表已采集到设备访存。');
 s+=hit('reread',box(1290,statusY-22,330,65)+tx(1305,statusY,`全张量 X 再读 ${mib(split?c.shape[0]*c.shape[1]*(c.dtype==='fp32'?4:2):0)}`,'caption')+tx(1305,statusY+25,'全部行 · 完整执行累计','muted'),'全部行完成执行的 X 再读请求总量；点击核对模型容量分支');
 $('business').innerHTML=(showComputeGraph?computeGoldenGraph():'')+`<g transform="translate(0 ${showComputeGraph?(goldenLayer?770:350):0})">${s}</g>`;transform();syncGoldenPanel();if(!$('inspector').hidden)detail();if(!$('auditPanel').hidden)audits();if(!$('sourcePanel').hidden)sourceRecord();syncMenu();
}

window.addEventListener('keydown',e=>{if(e.key==='Escape'){hasExecutionSelection=false;lastQueueTensor=null;render()}});
