/* Source-backed attribute projection. Never mutates the canonical hierarchy or edges. */
(function(global){
'use strict';
const names={shape:'Shape',precision:'精度',storage:'存储及执行',control:'状态 / 控制',count:'执行次数',sync:'同步'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ref=(a,b,symbol)=>({path:'sources/inference/model.py',line_start:a,line_end:b,symbol});
function facts(n,data){
 const id=n.attrs?.source_node||n.id,a=n.attrs||{},refs=n.sourceRefs||[],links=data.edges.filter(e=>e.source===id||e.target===id);
 const result=Object.fromEntries(Object.keys(names).map(k=>[k,[]]));
 const add=(k,value,evidenceKind='source',evidenceRef=refs,scope='当前静态节点')=>result[k].push({value,evidenceKind,evidenceRef,scope});
 for(const key of ['shape','input','output'])if(a[key])add('shape',`${key}: ${a[key]}`,'derived');
 if(['op','module'].includes(n.kind))add('count','静态图位置：1 个；不代表运行调用 1 次','source',refs,'当前稳定节点 ID');
 const seen=new Set();for(const e of links){const key=[e.source===id?'输出':'输入',e.tensor?.shape,e.tensor?.dtype].join(' · ');if(seen.has(key))continue;seen.add(key);if(e.tensor?.shape)add('shape',`${e.source===id?'输出':'输入'} ${e.tensor.name}: ${e.tensor.shape}`,'derived',e.provenance||[],e.id);if(e.tensor?.dtype)add('precision',`${e.source===id?'输出':'输入'} ${e.tensor.name}: ${e.tensor.dtype}`,'source',e.provenance||[],e.id);}
 if(a.dtype)add('precision',`配置 dtype: ${a.dtype}`);
 if(/(?:^|\/)norm$/.test(id)&&id.startsWith('v41/layer/'))add('precision','RMSNorm: FP32 归约，输出回到输入 dtype','source',[ref(287,294,'RMSNorm.forward')]);
 if(/\/(attention|ffn)\/pre$/.test(id))add('precision','HC Pre: FP32 加权求和，输出回到输入 dtype','source',[ref(959,962,'Block.hc_pre')]);
 if(/\/(attention|ffn)\/mixes$/.test(id))add('precision','HC Mixes: flatten 后转 FP32','source',[ref(950,957,'Block.hc_mixes')]);
 if(/\/moe\/reduce$/.test(id))add('precision','路由专家输出使用 FP32 累加','source',[ref(891,906,'MoE.forward')]);
 if(/\/attn\/index\/q$/.test(id))add('precision','Q 执行 FP4 act quant；此标记不表示缓存物理打包位宽','source',[ref(551,553,'Indexer.forward')]);
 if(n.stateType)add('storage',`源码角色: ${n.stateType}${a.persistent!==undefined?' · persistent='+a.persistent:''}`);
 if(/\/attn\/window(?:\/cache)?$/.test(id)){
  add('storage','window_kv_cache: 128 token 环形缓存','source',[ref(701,721,'Attention._window_kv')]);
  add('control','Prefill 使用当前块 KV 并填充窗口；Decode 写 start_pos % 128 槽位','source',[ref(701,721,'Attention._window_kv')]);
 }
 if(a.source_layer!==undefined)add('control',`复用 L${a.source_layer} 状态`);
 for(const key of ['compress_ratio','kv_source_layer','index_source_layer','coefficient_source','pre_mix_for','iterations'])if(a[key]!==undefined)add('control',`${key}: ${a[key]}`);
 if(/\/attn\/compress(?:\/|$)/.test(id))add('control','ratio > 1 时，未完成的压缩组跨 Decode step 保存在 kv_state / score_state','source',[ref(458,489,'Compressor.forward')]);
 if(/\/moe\/experts(?:\/|$)/.test(id))add('count','每个 token 选择 6 / 384；每个 rank 仅调用 counts[i] > 0 的本地专家。实际调用数取决于路由','source',[ref(891,906,'MoE.forward')],'当前主干层、当前 forward');
 if(a.iterations)add('count',`配置迭代次数: ${a.iterations}`,'source',refs,'当前节点配置；不等于 kernel/task 数');
 if(/^v41\/layer\/\d+$/.test(id))add('count','此具体主干层在一次 Transformer.forward 中调用一次','derived',[ref(1264,1270,'Transformer.forward')],'单次主干 forward；不含独立 forward_spec');
 if(/^v41\/layer\/\d+\/attn\/index\/weight$/.test(id))add('sync','world_size > 1: dist.all_reduce(index_score)','source',[ref(556,560,'Indexer.forward')]);
 if(/^v41\/layer\/\d+\/attn\/output\/row$/.test(id))add('sync','RowParallelLinear: world_size > 1 时 dist.all_reduce(y)','source',[ref(269,277,'RowParallelLinear.forward')]);
 if(/^v41\/layer\/\d+\/moe\/reduce$/.test(id))add('sync','world_size > 1: dist.all_reduce(y)','source',[ref(903,904,'MoE.forward')]);
 return result;
}
const missing={shape:'未记录该节点的 Shape',precision:'未记录该节点的精度',storage:'GM / UB / L1 / L0、AIC / AIV 分配未绑定',control:'未记录额外状态 / 控制属性',count:'实测次数未绑定；动态调用次数未求值',sync:'未绑定 event / fence / push / pop / wait / notify'};
function detail(n,data,active){if(!names[active])return '';const rows=facts(n,data)[active];return `<section class="v41-information-details"><strong>${names[active]}</strong>${rows.map(r=>`<p>${esc(r.value)}<br><small>${esc(r.evidenceKind)} · ${esc(r.scope)}</small></p>${r.evidenceRef.map(e=>`<button class="btn btn-ghost btn-sm" data-evidence-path="${esc(e.path)}" data-evidence-from="${e.line_start}" data-evidence-to="${e.line_end}">${esc(e.symbol||e.path)} · ${e.line_start}–${e.line_end} ↗</button>`).join('')}`).join('')}${!rows.length||['storage','count','sync'].includes(active)?`<p class="v41-evidence-gap">${missing[active]}</p>`:''}${active==='sync'&&rows.length?'<small>以上为源码通信调用；硬件同步事件和运行完成时间需编译产物 / trace。</small>':''}</section>`;}
const normalize=active=>Object.keys(names).filter(k=>(Array.isArray(active)?active:[active]).includes(k));
const toggle=(active,key)=>normalize(normalize(active).includes(key)?normalize(active).filter(k=>k!==key):[...normalize(active),key]);
function details(n,data,active){return normalize(active).map(key=>detail(n,data,key)).join('');}
// Match Toolkit Studio's channels: property strips, typed relationships,
// and evidence-gated execution decks / frequency widths / synchronization bridges.
const width=count=>Math.min(6,1.5+.9*Math.log2(Math.max(1,count)));
const validExecution=e=>Number.isFinite(e?.count)&&e.count>=0&&e.evidenceRef?.length&&e.scope;
function capabilities(data){
 const nodes=[];const walk=items=>items.forEach(n=>{nodes.push(n);walk(n.children||[]);});walk(data.roots);
 return {shape:true,precision:true,control:true,
  storage:nodes.some(n=>n.attrs?.memory_space||n.attrs?.execution_unit),
  count:data.edges.some(e=>validExecution(e.execution)),
  sync:!!data.synchronizations?.some(e=>e.producer?.nodeId&&e.consumer?.nodeId&&e.evidenceRef?.length)};
}
const unavailable={storage:'V4.1 尚未绑定内存空间与 AIC / AIV 编译映射',count:'V4.1 尚未绑定 Task、样例参数与逻辑执行次数',sync:'V4.1 尚未绑定跨核 Event 的生产者 / 消费者；all_reduce 源码调用不等于 READY Event'};
function summary(n,data,active){const keys=normalize(active),all=facts(n,data);return keys.map(key=>({key,label:names[key],rows:all[key]}));}
function decorate(host,graph,data,active){
 const enabled=new Set(normalize(active));if(!enabled.size)return;
 const ns='http://www.w3.org/2000/svg';
 const make=(tag,attrs={})=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;};
 for(const n of graph.nodes){
  if(n.role==='residual-annotation'||/HC Post.*Residual Merge/.test(n.label||''))continue;
  const el=host.querySelector(`[data-node-id="${CSS.escape(n.id)}"]`);if(!el)continue;
  const all=facts(n,data),rows=[];
  if(enabled.has('shape')){const shapes=[...new Set(all.shape.flatMap(r=>r.value.match(/\[[^\]]+\]/g)||[]))];if(shapes.length)rows.push({key:'shape',value:shapes.slice(0,2).join(' → ')});}
  if(enabled.has('precision')){const dtype=[...new Set(all.precision.flatMap(r=>r.value.match(/(?:bf16|fp32|fp16|fp8|fp4|int32|int64)/gi)||[]).map(v=>v.toUpperCase()))];if(dtype.length)rows.push({key:'precision',value:dtype.join(' / ')});}
  if(rows.length===2&&rows[0].key==='shape'&&rows[1].key==='precision'){rows[0]={key:'shape precision',shape:rows[0].value,precision:rows[1].value,value:rows[0].value+' · '+rows[1].value};rows.pop();}
  if(enabled.has('storage'))for(const key of ['memory_space','execution_unit'])if(n.attrs?.[key])rows.push({key:'storage',value:n.attrs[key]});
  if(enabled.has('control')&&['cache','buffer'].includes(n.stateType)){el.classList.add('v41-control-object');const rect=el.querySelector('rect');if(rect){rect.style.strokeDasharray='6 4';rect.style.strokeWidth='2';}}
  if(!rows.length)continue;
  const title=make('title');title.textContent=summary(n,data,[...enabled]).filter(p=>p.rows.length).map(p=>p.label+'\n'+p.rows.map(r=>r.value).join('\n')).join('\n\n');el.append(title);
  // Preserve names and side-input source labels; only replace the property strip.
  const spans=el.querySelectorAll('tspan');if(n.tensorName&&spans.length){if(spans[1])spans[1].remove();spans[0].setAttribute('y',rows.length>1?'-15':'-9');}else{const label=el.querySelector('.pto-model-graphviz-node-label');if(label)label.setAttribute('y',Number(label.getAttribute('y'))-(rows.length>1?15:9));}
  rows.slice(0,2).forEach((row,i)=>{const text=make('text',{x:0,y:rows.length>1?6+i*16:18,'text-anchor':'middle',class:'v41-information-label','pointer-events':'none','data-layer':row.key});const budget=Math.max(10,Math.floor((n.width-30)/7));if(row.precision){const shapeBudget=Math.max(6,budget-row.precision.length-3);const shape=row.shape.length>shapeBudget?row.shape.slice(0,shapeBudget-1)+'…':row.shape;text.textContent=shape+' · '+row.precision;}else text.textContent=row.value.length>budget?row.value.slice(0,budget-1)+'…':row.value;el.append(text);});
 }
 for(const edge of graph.edges){
  const paths=host.querySelectorAll(`[data-source="${CSS.escape(edge.source)}"][data-target="${CSS.escape(edge.target)}"]`);
  const canonical=(edge.canonicalIds||[edge.id]).map(id=>data.edges.find(e=>e.id===id)).filter(Boolean);
  const type=edge.semanticEdgeType;
  for(const path of paths){
   if(enabled.has('control')&&['state','control','feedback'].includes(type)){path.classList.add('v41-control-edge');path.style.strokeDasharray=type==='feedback'?'3 4 10 4':type==='control'?'7 5':'6 4';path.style.strokeWidth='3';path.style.opacity='1';}
   const executions=enabled.has('count')?canonical.map(e=>e.execution).filter(validExecution):[];
   if(executions.length){const count=Math.max(...executions.map(e=>e.count));path.style.strokeWidth=String(width(count));path.dataset.executionCount=String(count);const title=make('title');title.textContent=executions.map(e=>`×${e.count} · ${e.scope}`).join('\n');path.append(title);}
  }
 }
 if(enabled.has('sync')){const svg=host.querySelector('svg');for(const event of data.synchronizations||[]){if(!event.evidenceRef?.length)continue;const producer=graph.nodes.find(n=>n.id===event.producer?.nodeId),consumer=graph.nodes.find(n=>n.id===event.consumer?.nodeId);if(!producer||!consumer||!svg)continue;const x1=producer.x+producer.width/2,y1=producer.y,x2=consumer.x+consumer.width/2,y2=consumer.y,lane=Math.max(x1,x2)+40;const bridge=make('path',{d:`M ${x1} ${y1} H ${lane} V ${y2} H ${x2}`,class:'v41-sync-bridge',fill:'none','data-sync-id':event.id});const title=make('title');title.textContent=`${event.name||'READY'} #${event.eventId} · ${event.producer.pipe||''} SET → ${event.consumer.pipe||''} WAIT`;bridge.append(title);svg.append(bridge);const marker=make('text',{x:lane+8,y:(y1+y2)/2,class:'v41-sync-marker'});marker.textContent=`${event.name||'READY'} #${event.eventId}`;svg.append(marker);}}
 // Execution decks apply only to explicitly bound logical node invocations.
 if(enabled.has('count'))for(const n of graph.nodes){if(!validExecution(n.execution))continue;const el=host.querySelector(`[data-node-id="${CSS.escape(n.id)}"]`);if(!el)continue;const count=n.execution.count;for(let i=Math.min(4,count-1);i>0;i--){const r=make('rect',{x:-n.width/2+i*3,y:-n.height/2+i*1.5,width:n.width,height:n.height,rx:6,class:'v41-execution-deck','pointer-events':'none'});el.insertBefore(r,el.firstChild);}const badge=make('text',{x:n.width/2-12,y:-n.height/2-8,'text-anchor':'end',class:'v41-execution-count'});badge.textContent='×'+count;el.append(badge);}
}
global.PtoV41InformationLayers={names,facts,details,decorate,normalize,toggle,summary,capabilities,unavailable,width,validExecution};
})(window);
