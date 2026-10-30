"""Independent byte-count, allocation, routing-boundary and CPU arithmetic checks."""
import json,math,random,hashlib,sys,subprocess
from pathlib import Path
P=Path(__file__).resolve().parent
d=json.loads((P/'model.json').read_text())
checks=[]
def check(label,condition):
    assert condition,label
    checks.append(label)
for c in d['cases']:
    rows,cols=c['shape'];b=4 if c['dtype']=='fp32' else 2
    footprint=sum([2*cols*b,cols*b,2*cols*b])
    check(c['id']+'/resident footprint',footprint==c['resident_footprint_bytes'])
    check(c['id']+'/routing',c['auto']==('row_resident_1pass' if footprint<=d['ub_bytes'] else 'row_split_2pass'))
    for a in c['alternatives']:
        if not a['feasible']:continue
        split=a['template']=='row_split_2pass';m=a['case_dict']['memory'];r=a['result']
        check(c['id']+'/'+a['template']+'/GM bytes',m['gm_read_bytes']==rows*cols*b*(2 if split else 1)+cols*b and m['gm_write_bytes']==rows*cols*b and m['gm_reread_bytes']==rows*cols*b*int(split))
        check(c['id']+'/'+a['template']+'/target',math.isclose(r['cp4_target_time_us'],r['theoretical_time_us']/.6))
        check(c['id']+'/'+a['template']+'/finite',all(math.isfinite(r[k]) and r[k]>0 for k in ['mte2_time_us','vector_time_us','mte3_time_us','theoretical_time_us']))
        if a['kernel']:
            k=a['kernel'];gamma=0
            for core in range(k['blocks']):
                start=core*k['rows_per_core'];end=min(rows,start+k['rows_per_core'])
                if start>=end:continue
                if split:
                    for row in range(start,end):
                        for col in range(0,cols,k['chunk']):gamma+=min(k['chunk'],cols-col)*4
                else:gamma+=cols*4
            check(c['id']+'/'+a['template']+'/independent gamma requests',gamma==k['gamma_read_bytes'])
# CPU full vs chunked reduction; include partial final chunk. Not an AscendC instruction emulator.
random.seed(17)
for h,chunk in [(17,8),(64,16),(67,32)]:
    x=[random.uniform(-2,2) for _ in range(h)];g=[random.uniform(.1,2) for _ in range(h)]
    inv=1/math.sqrt(sum(v*v for v in x)/h+1e-6)
    full=[v*inv*w for v,w in zip(x,g)]
    parts=[sum(v*v for v in x[i:i+chunk]) for i in range(0,h,chunk)]
    inv2=1/math.sqrt(sum(parts)/h+1e-6)
    split=[]
    for i in range(0,h,chunk):split.extend(x[j]*inv2*g[j] for j in range(i,min(i+chunk,h)))
    check(f'CPU full/split H={h} chunk={chunk}',max(abs(a-b) for a,b in zip(full,split))<1e-12)
for p,s in d['sources'].items():check('source hash/'+p,hashlib.sha256(s['text'].encode()).hexdigest()==s['sha256'])
if len(sys.argv)>1:
    src=Path(sys.argv[1]);expected={}
    for folder in ['scripts','references','tests']:
        for e in json.load(open('/private/tmp/rmsnorm-'+folder+'-tree.json'))['tree']:
            if e['type']=='blob':expected[folder+'/'+e['path']]=e['sha']
    for p,s in d['sources'].items():
        b=(src/p).read_bytes();blob=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
        check('Git blob/'+p,blob==expected[p])
    run=subprocess.run([sys.executable,str(src/'tests/run.py')],capture_output=True,text=True)
    (P/'offline-test.log').write_text(run.stdout+run.stderr)
    check('upstream full offline gate',run.returncode==0 and '46 cases / 10' in run.stdout)
report={'status':'pass','checks':len(checks),'items':checks,'device':'not run','CPU_scope':'Python arithmetic equivalence; not compiled Kernel or hardware accuracy','browser':'see REVIEW.md'}
(P/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(f'PASS {len(checks)} checks')
