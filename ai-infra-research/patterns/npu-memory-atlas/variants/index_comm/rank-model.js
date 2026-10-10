/* Shared, deterministic teaching model. Decimal GB throughout, as in the atlas.
 * Incorporates rank-intro step 10 configuration/selection semantics without its
 * page shell, playback script or a second memory ledger. No measured timings.
 */
(function(root){
 'use strict';
 const baseline=Object.freeze({tp:2,pp:4,dp:16,ep:8,cp:1,mode:'split',layers:48,dense:0,experts:64,shared:0,topk:8,mbs:1,seq:8192,ga:8,hbm:64,node:8});
 const H=4096,I=2048,V=128256;
 const names=['attn.q','attn.kv','attn.out','experts.gate/up','experts.down','embed','lm_head','norm','router','shared.ffn','dense.ffn'];
 const dpReplica=c=>c.dp*(c.mode==='ortho'?c.ep:1);
 const lanes=c=>dpReplica(c)*c.cp;
 const world=c=>c.tp*c.pp*lanes(c);
 function rank(id,c){const lane=Math.floor(id/c.tp)%lanes(c),dp=lane%dpReplica(c);return {id,tp:id%c.tp,dp:lane,dpIndex:dp,cp:Math.floor(lane/dpReplica(c)),pp:Math.floor(id/(c.tp*lanes(c))),ep:dp%c.ep,edp:Math.floor(lane/c.ep)};}
 function bounds(id,c){const r=rank(id,c);return [r.pp*c.layers/c.pp,(r.pp+1)*c.layers/c.pp];}
 function groups(id,c,layer=null){
  const r=rank(id,c),[lo,hi]=bounds(id,c),whole=layer===null,owned=whole||layer>=lo&&layer<hi;
  const n=owned?(whole?hi-lo:1):0,dense=owned?(whole?Math.max(0,Math.min(hi,c.dense)-lo):Number(layer<c.dense)):0,moe=n-dense;
  const counts=[n*H*H/c.tp,n*2*H*1024/c.tp,n*H*H/c.tp,moe*2*H*I*c.experts/c.ep,moe*H*I*c.experts/c.ep,
   whole&&r.pp===0?V*H/c.tp:0,whole&&r.pp===c.pp-1?V*H/c.tp:0,(n*2+(whole&&r.pp===c.pp-1?1:0))*H,moe*H*c.experts,moe*3*H*I*c.shared/c.tp,dense*3*H*I/c.tp];
  return names.map((name,i)=>[name,i===3||i===4?'专家桶':i===7||i===8?'复制':'TP 分片',counts[i],i===2||i===6?'row':i===7||i===8?'copy':'col']);
 }
 const parameters=(id,c,layer=null)=>groups(id,c,layer).reduce((n,g)=>n+g[2],0);
 const activation=c=>3.8*c.mbs*(c.seq/8192)/c.cp*(2/c.tp)*(4/c.pp);
 function memory(id,c,t=0){
  const r=rank(id,c),cycle=c.ga*3500+3000,time=Math.max(0,Math.min(cycle,t)),u=time%3500,mb=Math.min(c.ga,Math.floor(time/3500)+1),p=parameters(id,c),grad=p*2/1e9;
  const f=r.pp*1200/c.pp,b=1200+(c.pp-1-r.pp)*1900/c.pp,forward=time<c.ga*3500&&u>=f&&u<f+1200/c.pp,backward=time<c.ga*3500&&u>=b&&u<b+1900/c.pp;
  const update=time>=c.ga*3500&&time<c.ga*3500+2000,zero=time>=c.ga*3500+2000,q=forward?(u-f)/(1200/c.pp):backward?(u-b)/(1900/c.pp):0;
  const peak=activation(c)*(r.ep===0?1.15:.85);
  const act=update||zero?0:u<f?0:forward?peak*q:u<b?peak:backward?peak*(1-q):0;
  const gradient=zero?0:update||mb>1?grad:u<b?0:backward?grad*q:grad;
  const workspace=update?3*Math.sin(Math.PI*(time-c.ga*3500)/2000):forward||backward?.3+.65*Math.sin(Math.PI*q)**2:0;
  const communication=forward||backward?Math.sin(Math.PI*q*4)**2*(c.tp>1?.4:0)+((c.ep>1&&Math.max(c.dense,r.pp*c.layers/c.pp)<(r.pp+1)*c.layers/c.pp)?c.seq*c.mbs/c.cp*H*2*c.topk*(1-1/c.ep)/1e9:0):0;
  const values=[p*2/1e9,gradient,p*12/1e9,act,workspace,communication];
  // Retained allocator budget is configuration-derived, never a percentage of HBM.
  const live=values.reduce((a,b)=>a+b,0),reserve=Math.max(live,p*16/1e9+activation(c)+2.3);
  values.push(reserve-live,Math.max(0,c.hbm-reserve));
  const phase=zero?'释放梯度':update?'参数更新':forward?'前向':backward?'反向':'流水等待';
  return {values,total:reserve,live,overflow:Math.max(0,reserve-c.hbm),mb,q,phase,active:zero?'zero':update?'update':forward?'forward':backward?'backward':'idle',layer:forward?r.pp*c.layers/c.pp+Math.min(c.layers/c.pp-1,Math.floor(q*c.layers/c.pp)):backward?(r.pp+1)*c.layers/c.pp-1-Math.min(c.layers/c.pp-1,Math.floor(q*c.layers/c.pp)):null,activation:act,gradient,workspace,communication,poolActive:act+gradient+workspace,detail:'GB = 10⁹ bytes。'};
 }
 // Operator schedule refines the existing layer clock; it does not allocate memory.
 function execution(id,c,t){
  const mem=memory(id,c,t),[lo,hi]=bounds(id,c),n=hi-lo;
  if(mem.active==='idle'||mem.active==='zero')return {layer:null,keys:[],categories:[],label:mem.phase,progress:0};
  const update=mem.active==='update',q=update?Math.max(0,Math.min(.999999,(t-c.ga*3500)/2000)):mem.q;
  const layer=update?lo+Math.min(n-1,Math.floor(q*n)):mem.layer,dense=layer<c.dense;
  const params=[['norm1'],['q','kv'],['out'],['norm2'],...(dense?[['dense']]:[['router'],['experts'],...(c.shared?[['shared']]:[])])];
  const forward=[['norm1'],['q','kv'],['attention'],['out'],['residual1'],['norm2'],...(dense?[['dense']]:[['router'],['dispatch'],['experts'],['combine'],...(c.shared?[['shared']]:[])]),['residual2']];
  // Backward explicitly distinguishes input gradients, parameter gradients and EP return paths.
  const backward=[{keys:['residual2'],label:'残差梯度'},...(dense?[{keys:['dense'],label:'FFN 输入梯度'},{keys:['dense'],label:'FFN 参数梯度'}]:[
   ...(c.shared?[{keys:['shared'],label:'共享专家梯度'}]:[]),{keys:['combine'],label:'回传输出梯度'},{keys:['experts'],label:'专家输入梯度'},{keys:['experts'],label:'专家参数梯度'},{keys:['dispatch'],label:'回收输入梯度'},{keys:['router'],label:'路由梯度'}]),
   {keys:['norm2'],label:'归一化梯度'},{keys:['residual1'],label:'残差梯度'},{keys:['out'],label:'投影输入梯度'},{keys:['out'],label:'投影参数梯度'},{keys:['attention'],label:'Attention 梯度'},{keys:['q','kv'],label:'Q / KV 输入梯度'},{keys:['q','kv'],label:'Q / KV 参数梯度'},{keys:['norm1'],label:'归一化梯度'}];
  const steps=update?params.map(keys=>({keys,label:'参数更新'})):mem.active==='forward'?forward.map(keys=>({keys,label:'前向'})):backward;
  const u=(q*n%1)*steps.length,index=Math.min(steps.length-1,Math.floor(u));
  return {layer,...steps[index],categories:update?[0,1,2]:mem.active==='forward'?[0]:[0,1],progress:u-index};
 }
 function peak(c){let max=0;for(let pp=0;pp<c.pp;pp++)max=Math.max(max,parameters(pp*c.tp*lanes(c),c)*16/1e9+activation(c)*1.15+5.3);return max;}
 function validate(c){
  const errors=[],bad=new Set(),fail=(message,...fields)=>{errors.push(message);fields.forEach(f=>bad.add(f));};
  for(const k of Object.keys(baseline).filter(k=>!['mode'].includes(k)))if(!Number.isInteger(c[k])||c[k]<(k==='shared'||k==='dense'?0:1))fail(k+' 必须是有效整数',k);
  if(!['split','ortho'].includes(c.mode))fail('未知 EP 口径','mode');
  if(errors.length)return {ok:false,errors,bad:[...bad]};
  if(![1,2,4,8].includes(c.tp))fail('TP 需为 1 / 2 / 4 / 8，以均分 KV 头','tp');
  if(c.layers>128||c.layers%c.pp)fail('Layer ≤128，且必须被 PP 整除','layers','pp');
  if(c.dense>c.layers)fail('Dense 层数不能超过总层数','dense','layers');
  if(c.experts>128||c.experts%c.ep)fail('专家数 ≤128，且必须被 EP 整除','experts','ep');
  if(dpReplica(c)%c.ep)fail('切出口径下 DP 必须被 EP 整除','dp','ep');
  if(c.topk>c.experts)fail('Top-K 不能超过路由专家数','topk','experts');
  if(c.seq%c.cp)fail('Sequence Length 必须被 CP 整除','seq','cp');
  if(c.shared>16||c.ga>64||c.seq>262144||c.mbs>32)fail('配置范围：Shared ≤16、GA ≤64、Seq ≤262144、Micro Batch ≤32','shared','ga','seq','mbs');
  if(![32,64,128].includes(c.hbm))fail('请选择 32 / 64 / 128 GB 卡','hbm');
  if(world(c)>2048||world(c)<1)fail('支持 1–2048 Rank','dp','tp','pp','cp','ep');
  if(64%c.node||world(c)%c.node)fail('总卡数必须是每节点卡数的整数倍，节点需整除 64 卡机柜','node','dp');
  return {ok:!errors.length,errors,bad:[...bad]};
 }
 function repair(c){let best=null,score=Infinity;for(const ep of [1,2,4,8,16,32,64,128])for(const pp of [1,2,4,8,16,32,64,128]){const p={...c,ep,pp};if(validate(p).ok&&peak(p)<=p.hbm){const d=Math.abs(Math.log2(ep/c.ep))+Math.abs(Math.log2(pp/c.pp));if(d<score){score=d;best=p;}}}return best;}
 const api={baseline,H,I,V,names,dpReplica,lanes,world,rank,bounds,groups,parameters,activation,memory,execution,peak,validate,repair};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RankAtlasModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
