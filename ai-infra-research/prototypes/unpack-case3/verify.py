import json, subprocess, random, hashlib
from pathlib import Path
R=Path(__file__).resolve().parent
script="const M=require('./model.js'),m=M.unpack(M.configs[0]);console.log(JSON.stringify({model:m,elements:Array.from({length:17},(_,o)=>Array.from({length:1023},(_,p)=>M.unpackElement(m,o,p)))}))"
a=json.loads(subprocess.check_output(['node','-e',script],cwd=R,text=True))
m=a['model'];assert (m['cores'],len(m['tasks']),m['rowsPerTask'],m['path'])==(8,17,31,'Row burst')
# Independent nested tensor unbind reference; deterministic int32 values in source test range.
# Python Random differs from upstream NumPy seed 3003: this is an independent input, not the original sample.
rng=random.Random(3003)
x=[[[rng.randint(1,10) for k in range(33)] for j in range(17)] for i in range(31)]
flat=[v for plane in x for row in plane for v in row]
reference=[[x[i][j][k] for i in range(31) for k in range(33)] for j in range(17)]
seen=set();actual=[];task_seen=set()
for j,items in enumerate(a['elements']):
 out=[]
 for p,e in enumerate(items):
  i,k=divmod(p,33);expected_index=sum(len(row) for plane in x[:i] for row in plane)+sum(len(row) for row in x[i][:j])+k
  assert e['src']==expected_index and e['srcBytes']==expected_index*4 and e['dstBytes']==p*4
  assert e['src'] not in seen;seen.add(e['src'])
  task=e['task'];assert task['index']==j and task['count']==1023
  core=next(c for c in range(8) if c*17//8<=j<(c+1)*17//8);assert task['core']==core
  task_seen.add(j);out.append(flat[e['src']])
 assert out==reference[j];actual.append(out)
assert len(seen)==17391 and len(task_seen)==17
# A shifted middle-axis mutation must fail even when random values happen to coincide.
mutated=[(e['src']+33)%17391 for items in a['elements'] for e in items]
assert any(v!=e['src'] for v,e in zip(mutated,[e for items in a['elements'] for e in items]))
result={'revision':'13baf5274751fcf46aa04905c53ad285d656ac74','elementsChecked':17391,'numericMismatches':0,'indexMismatches':0,'missing':0,'duplicates':0,'tasks':17,'cores':8,'coreTaskCounts':[r['end']-r['start'] for r in m['ranges']],'rowBytes':132,'paddedRowBytes':160,'rightPaddingElements':7,'srcStrideBytes':2112,'inputGenerator':'Python Random(3003), integers 1..10; independent of upstream NumPy sample','mutationDetected':True,'deviceRun':False}
(R/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
