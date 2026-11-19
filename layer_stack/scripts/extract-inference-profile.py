"""Extract portable Qwen TP2 evidence; raw host metadata never enters output."""
import argparse, csv, json
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--source',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
a=parser.parse_args();root=a.source
ops=['RMS','QKV','QKV post','attention prepare','QK','softmax','PV','context cast','O projection','AllReduce O','FFN RMS','gate/up','SwiGLU','down','AllReduce down','residual tail']
captures=[]
for stage in ['prefill','decode']:
 d=json.loads((root/f'tp2/swimlane/{stage}.json').read_text())
 tasks=d['aicore_tasks'];assert len(tasks)==643
 order={str(x['task_id']):x['submit_idx'] for x in d['aicpu_orchestrator_phases'][0]}
 assert len(order)==len(d['aicpu_orchestrator_phases'][0])
 tasks=sorted(tasks,key=lambda x:order[str(x[1])]);assert len(set(str(x[1]) for x in tasks))==643
 freq=d['metadata']['clock_freq_hz'];origin=min(x[3] for x in tasks)
 events=[]
 for i,row in enumerate(tasks):
  core,token,registered,start,end,*_=row
  layer=(i-1)//16 if 1<=i<=640 else None
  op=ops[(i-1)%16] if layer is not None else ['Embedding','Final RMS','LM Head'][0 if i==0 else i-640]
  events.append(dict(id=f'{stage}:r0:{token}',runtimeTaskId=str(token),registeredTaskId=registered,layer=layer,operator=op,core=core,coreType=d['metadata']['core_types'][core],startUs=(start-origin)*1e6/freq,durationUs=(end-start)*1e6/freq,mapping='derived-submit-order'))
 captures.append(dict(id=f'l2-{stage}',kind='L2',rank=0,stage=stage,invocationId=None,source=f'tp2/swimlane/{stage}.json',events=events))
files=list(root.glob('tp2/torch/prof/**/kernel_details.csv'));assert len(files)==1
rows=[x for x in csv.DictReader(files[0].open()) if x['Name']=='aicore_kernel_0'];assert len(rows)==5
rows.sort(key=lambda x:float(x['Start Time(us)']));origin=float(rows[0]['Start Time(us)'])
invocations=[dict(id=f'invocation-{i}',stage='prefill' if i==0 else 'decode',decodeIndex=i or None,rank=0,startUs=float(x['Start Time(us)'])-origin,durationUs=float(x['Duration(us)']),blockNum=int(x['Block Num']),mixBlockNum=int(x['Mix Block Num']),tokenPosition=None,tokenId=None) for i,x in enumerate(rows)]
out=dict(schemaVersion=1,id='qwen3-14b-tp2',model='Qwen3-14B',layerCount=40,tp=2,ranks=[dict(id=0,hasFineCapture=True),dict(id=1,hasFineCapture=False)],invocations=invocations,captures=captures,promptLength=None,physicalPageMapping=None,kvPageSize=None,endReason='capture-end',missing=['prompt length','generated token IDs/text','physical KV mapping','rank1 fine capture'],provenance={'invocationOrder':'collector order: prefill then four decode calls','captures':'Independent L2 and torch process lifetimes; no shared timeline','rank1':'Declared TP participant; no copied rank0 metrics'})
a.output.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(f'Validated {len(invocations)} invocations, {sum(len(c["events"]) for c in captures)} L2 events')
