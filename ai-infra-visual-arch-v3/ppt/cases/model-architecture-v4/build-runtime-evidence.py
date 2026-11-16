"""Build scoped V4 CSA overlays from the packaged compiler/runtime sample."""
import argparse,json,re,hashlib,collections
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('source_root',type=Path);args=parser.parse_args()
base=args.source_root/'Data/DeepseekV4/_jit_l3_decode_csa_20260903_010617';out=Path(__file__).parent/'vendor/patterns/model-architecture-v4/runtime-evidence.json'
trace_path=base/'dfx_outputs/rank0/d0/merged_swimlane_20260903_010746.json';trace=json.loads(trace_path.read_text())['traceEvents']
threads={e['tid']:e['args']['name'] for e in trace if e.get('ph')=='M' and e.get('pid')==4 and e.get('name')=='thread_name'}
counts=collections.Counter();cores=collections.defaultdict(set)
for e in trace:
 if e.get('ph')!='X' or e.get('pid')!=4:continue
 name=e['name'].split('(')[0]
 if 'taskId' not in e.get('args',{}):continue
 name=name.removesuffix('_spmd');counts[name]+=1;cores[name].add('AIC' if threads.get(e['tid'],'').startswith('AIC_') else 'AIV')
ir_path=base/'passes_dump/19_after_InferTileMemorySpace.py';ir=ir_path.read_text();funcs={}
for m in re.finditer(r'    def (\w+)\(',ir):
 end=ir.find('\n    @pl.function',m.end());funcs[m.group(1)]=ir[m.start():end if end>=0 else len(ir)]
bindings={
'csa_query_projection':['qr_proj_matmul','qr_rms_norm_quant','qproj_matmul','qproj_dequant_rms_nope_rope'],
'csa_q_lora_down':['qr_proj_matmul'],'csa_q_normalization':['qr_rms_norm_quant'],'csa_main_q_rope':['qproj_matmul','qproj_dequant_rms_nope_rope'],
'csa_recent_window_kv':['kv_proj_matmul','kv_rms_norm_rope','csa_cache_writeback'],
'csa_shared_kv_projection':['kv_proj_matmul'],'csa_kv_normalization':['kv_rms_norm_rope'],'csa_kv_rope':['kv_rms_norm_rope'],
'csa_compressed_kv_path':['kv_score_proj','scatter_softmax_pool','compress_state_commit','rmsnorm_rope_cache_write'],
'csa_main_compressor_ratio4':['kv_score_proj','scatter_softmax_pool','compress_state_commit','rmsnorm_rope_cache_write'],
'csa_lightning_indexer':['idx_qr_proj_matmul','idx_qr_proj_dequant','qr_rope','qr_hadamard_matmul','qr_hadamard_quant','weights_proj','weights_proj_reduce','indexer_score_leaf_wave_aic','indexer_score_leaf_wave_aiv','indexer_topk_group_wave','indexer_topk_query_merge'],
'csa_indexer_compressor_ratio4':['kv_score_proj_0','scatter_softmax_pool_0','compress_state_commit_0','rmsnorm_rope','kv_hadamard','kv_and_cache_write'],
'csa_indexer_q_rope':['idx_qr_proj_matmul','idx_qr_proj_dequant','qr_rope','qr_hadamard_matmul','qr_hadamard_quant'],
'csa_query_index_score':['indexer_score_leaf_wave_aic','indexer_score_leaf_wave_aiv'],
'csa_score_weighting':['weights_proj','weights_proj_reduce'],
'csa_topk_select':['indexer_topk_group_wave','indexer_topk_query_merge'],
'csa_sparse_shared_kv_attention':['qk_pv_aic','qk_pv_aiv'],
'csa_sparse_attention_op':['qk_pv_aic','qk_pv_aiv'],
'csa_grouped_output_projection':['tp_o_a','tp_o_a_quant','tp_o_b','tp_o_b_dequant','tp_o_b_publish','tp_o_rs_reduce'],
'csa_grouped_low_rank_projection':['tp_o_a','tp_o_a_quant'],
'csa_output_projection':['tp_o_b','tp_o_b_dequant','tp_o_b_publish','tp_o_rs_reduce']}
mem_map={'Vec':'UB','Mat':'L1','Left':'L0A','Right':'L0B','Acc':'L0C'};nodes={}
for node,names in bindings.items():
 assert all(name in counts for name in names),(node,names)
 mem=set();refs=[]
 for name in names:
  body=funcs.get(name,funcs.get(name.removesuffix('_aic').removesuffix('_aiv'),''));mem.update(mem_map[x] for x in re.findall(r'pl.Mem.(Vec|Mat|Left|Right|Acc)\b',body))
  if body:refs.append({'path':str(ir_path.relative_to(args.source_root)),'line':ir[:ir.index(body)].count('\n')+1,'symbol':re.search(r'def (\w+)',body).group(1)})
 nodes[node]={'count':sum(counts[n] for n in names),'unit':'核任务实例','callables':{n:counts[n] for n in names},'cores':sorted(set().union(*(cores[n] for n in names))),'memory':sorted(mem),'sourceRefs':refs,'mapping':'CSA 算子实现映射；多个语义阶段可能共享同一融合 kernel，不可跨节点求和'}
cpp_path=base/'next_levels/decode_csa_test/kernels/aic/qk_pv_aic.cpp';cpp=cpp_path.read_text().splitlines();sync=[{'line':i+1,'code':s.strip(),'symbol':'qk_pv_aic' if i+1<879 else 'qk_pv_aiv'} for i,s in enumerate(cpp) if 'TPUSH<TPipe<' in s or 'TPOP<TPipe<' in s]
for key in ['csa_sparse_shared_kv_attention','csa_sparse_attention_op']:nodes[key]['synchronization']={'pipe':0,'direction':'AIC ⇄ AIV','path':str(cpp_path.relative_to(args.source_root)),'sites':sync}
sources=[trace_path,ir_path,cpp_path,base/'dfx_outputs/rank0/d0/deps.json',base/'dfx_outputs/rank0/d0/name_map.json']
data={'schema':'v4_csa_evidence.v1','scope':{'program':'decode_csa_test','capture':'20260903_010617','rank':0,'device':0,'model':'DeepSeek V4 Flash · CSA ratio 4','countMeaning':'Chrome Trace Worker View 中含 taskId 的完整事件数（去除 alloc / dummy），与 chip_swimlane_records 的核任务实例总量交叉核对','edgeWidthMeaning':'连线源节点映射的核任务实例量；不表示张量传输次数','coreTaskRecords':sum(counts.values()),'staticTasks':len(json.loads((base/'dfx_outputs/rank0/d0/deps.json').read_text())['tasks'])},'sources':[{'path':str(f.relative_to(args.source_root)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sources],'nodes':nodes}
assert sum(counts.values())==len(json.loads((base/'dfx_outputs/rank0/d0/chip_swimlane_records.json').read_text())['aicore_tasks'])
out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print(len(nodes),'bound nodes;',sum(counts.values()),'core task records;',len(sync),'TPipe source sites')
