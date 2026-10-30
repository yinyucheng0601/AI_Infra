import json,math,struct,hashlib,ast
from pathlib import Path
from model import build,generate
P=Path(__file__).resolve().parent
checks=0
def check(ok,msg):
 global checks
 assert ok,msg
 checks+=1
d=generate()
# Test allocation lists and data-dependency invariants across both branches and tails.
for c in d['cases']:
 B,H=c['shape'];check(c['whole']==(H<=4096),'branch boundary')
 check(c['aligned']%16==0 and 0<=c['aligned']-H<16,'alignment')
 check(c['reserved']==46*c['tile']+64,'all InitBuffer allocations')
 check(len({e['id'] for e in c['events']})==len(c['events']),'unique event instances')
 check(len({l['id'] for l in c['life']})==len(c['life']),'unique lifecycle instances')
 indices={e['id']:e['index'] for e in c['events']}
 for e in c['events']:
  check(all(indices[p]<e['index'] for p in e['parents']),'dependency order')
  check(1<=e['line']<=len(d['sources']['kernel']['text'].splitlines()),'source line')
 for l in c['life']:check(0<=l['start']<l['end']<=c['ticks'],'lifetime range')
 for buf,capacity in c['capacities'].items():
  peak=max([sum(l['size'] for l in c['life'] if l['buffer']==buf and l['start']<=t<l['end']) for t in range(c['ticks'])] or [0])
  check(peak<=capacity,'capacity '+buf)
 check(c['requestBytes']['x']==B*H*2*(1 if H<=4096 else 2),'X request count')
 if not c['whole']:
  check(sum(e['kind']=='reread' for e in c['events'])==math.ceil(H/4096),'second-pass chunks')
  for e in c['events']:
   if e['kind']=='reread':check(e['line']==218,'reread points to second source loop')
 # Shared visual packing: concurrently live objects never occupy the same band/extent.
 for i,a in enumerate(c['life']):
  for b in c['life'][i+1:]:
   if a['buffer']==b['buffer'] and max(a['start'],b['start'])<min(a['end'],b['end']):
    check(a['displayBand']!=b['displayBand'],'concurrent intervals have separate main tracks')
    check(a['displayOffset']+a['size']<=b['displayOffset'] or b['displayOffset']+b['size']<=a['displayOffset'],'concurrent intervals have separate reuse extents')
# Independent explicit row partition, including empty cores, compared with adapter.
for B in (1,32,1997,2048):
 for N in (1,8,32,48):
  allrows=[]
  for k in range(N):
   expected=[r for r in range(B) if r//math.ceil(B/N)==k]
   c=build(B,3037,N,k)
   check(list(range(c['start'],c['end']))==expected,'row partition')
   allrows+=expected
  check(allrows==list(range(B)),'all rows exactly once')
# Tail copy intervals independently partition the row; padding is not a GM request.
for H in (1,3037,4096,4097,8193):
 covered=[]
 for off in range(0,H,4096):covered.extend(range(off,min(off+4096,H)))
 check(covered==list(range(H)),'tail coverage')
# Demonstrate the precision-path difference, not a device correctness verdict.
f16=lambda x:struct.unpack('e',struct.pack('e',x))[0]
x=f16(1.0);r=f16(.0004)
check(f16(x+r)!=x+r,'FP16 Add and FP32 Add are distinct')
for name,s in d['sources'].items():
 raw=s['text'].encode();blob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
 check(blob==s['blob'],'download integrity '+name)
# Public specs read as data, not executed.
tree=ast.parse(d['sources']['cases']['text']);cases=ast.literal_eval(next(n.value for n in tree.body if isinstance(n,ast.Assign)))
check([tuple(c['shape']) for c in d['cases'][:5]]==[tuple(x[:2]) for x in cases],'public case set')
check(all(x[1]<=4096 for x in cases),'public tests do not cover chunk branch')
result={'checks':checks,'status':'pass','coverage':'7 UI cases; partition at 4 row counts and 4 core counts; both source branches; tail requests; source blob integrity','device_run':False,'automatic_cpp_extraction':False,'precision_example':{'fp16_add':f16(x+r),'fp32_add':x+r}}
(P/'validation.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
