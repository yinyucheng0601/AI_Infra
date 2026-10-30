"""Read-only adapter. python3 collect.py /path/to/upstream/ops/ops-theoretical-performance-estimation"""
import copy, hashlib, json, math, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = Path(sys.argv[1]).resolve()
REV = 'f305e200aa4b1e1fed73cd21ff1f083b8df25a1e'
sys.path.insert(0, str(SRC / 'scripts'))
import _engine_bridge as bridge
import flow_runtime as flow
import perf

hardware, instructions, db = bridge.load_dbs()
ub = hardware['common']['memory_capacity_bytes_per_core']['ub']
ctx = bridge.Ctx(db, ub)
spec = json.loads((SRC / 'references/examples/rms_norm_cases.json').read_text())
cases = copy.deepcopy(spec['cases'])
for h in [12672, 12704]:
    cases.append({'case_id': f'boundary_2048x{h}', 'inputs': [
        {'name': 'x', 'shape': [2048,h], 'dtype': 'fp32'},
        {'name': 'weight', 'shape': [h], 'dtype': 'fp32'}]})
rows = []
for case in cases:
    r,h = case['inputs'][0]['shape']; dtype = case['inputs'][0]['dtype']; b = db[dtype]
    attrs = bridge.tc.merged_attrs(spec, case)
    alternatives = []
    for template in flow.load_flow('rms_norm')['templates']:
        forced = copy.deepcopy(case); forced['template'] = template['name']
        if template['name'] == 'row_resident_1pass' and 5*h*b > ub:
            alternatives.append({'template':template['name'], 'feasible':False}); continue
        cd = flow.build('rms_norm', forced, attrs, ctx)
        cd.update(case_id=case['case_id'],hardware_variant=spec['hardware_variant'])
        result = bridge.engine.evaluate_case(cd, hardware, instructions)
        split = template['name'] == 'row_split_2pass'
        # FP32 source-side GM requests, not HBM transactions. Gamma is loaded per core / per row.
        kernel = None
        if dtype == 'fp32':
            cores = min(r,64); rpc = math.ceil(r/cores); nonempty = math.ceil(r/rpc)
            rowbytes = math.ceil(h*4/1024)*1024
            rf = max(1,(ub-rowbytes-4096)//(4*rowbytes)); rf=min(rf,rpc)
            kernel = {'x_read_bytes': r*h*4*(2 if split else 1),
                'gamma_read_bytes': r*h*4 if split else nonempty*h*4,
                'y_write_bytes':r*h*4, 'blocks':cores,'rows_per_core':rpc,
                'row_factor':None if split else rf,
                'chunk':4096 if split else None,
                'allocation_bytes':6*4096*4+288 if split else (4*rf+1)*rowbytes+256,
                'vf_structure':'ChunkSumsqVF → WorkToRstdVF → NormVF' if split else 'RstdVF → NormVF'}
        alternatives.append({'template':template['name'],'feasible':True,'case_dict':cd,'result':result,'kernel':kernel})
    auto = flow.build('rms_norm',case,attrs,ctx)['_template']
    rows.append({'id':case['case_id'],'shape':[r,h],'dtype':dtype,'origin':'upstream' if case in spec['cases'] else 'boundary experiment',
        'resident_footprint_bytes':5*h*b,'auto':auto,'alternatives':alternatives})

paths=['references/examples/rms_norm_flow.json','references/examples/rms_norm_cases.json',
 'scripts/flow_runtime.py','scripts/evaluate_a5_vector_roofline.py','references/hardware/ascend950pr.json',
 'references/vector_instruction_types.json','tests/onboard/kernels/rms_norm/rms_norm_direct.asc',
 'tests/calibration/bench_results/insn_throughput.csv','tests/calibration/bench_results/membw_bandwidth.csv',
 'tests/calibration/bench_results/membw_copy_sweep.csv','tests/calibration/instruments/regbase-microbench/data/overlap_raw.jsonl']
sources={p:{'sha256':hashlib.sha256((SRC/p).read_bytes()).hexdigest(),
 'url':f'https://github.com/hicann/cannbot-skills/blob/{REV}/ops/ops-theoretical-performance-estimation/{p}',
 'text':(SRC/p).read_text()} for p in paths}
data={'revision':REV,'hardware':'ascend950pr_9589','ub_bytes':ub,'cases':rows,'sources':sources,
 'calibration':hardware['common'],'scope':'Ascend950 / DAV_3510 · RegBase pure Vector',
 'device_validation':'not run locally','fixed_overhead_us':0}
(HERE/'model.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
print(f'{len(rows)} configurations; immutable upstream calibration; model.json written')
