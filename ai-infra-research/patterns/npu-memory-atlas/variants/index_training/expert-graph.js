/* Stage-8 grammar from training-graph: Router, Dispatch, grouped Experts,
 * Combine. Uses its original expert artwork and grid layout; the host owns
 * shapes, routing, ETP1 replication, selection and the memory ledger.
 */
(function(root){
 'use strict';
 const old=root.RankComputeGraph,M=root.RankAtlasModel,S=root.TrainingGraphState;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function bindings(c,id,layer){
  const b=old.bindings(c,id,layer),r=M.rank(id,c);
  for(let e=0;e<c.experts;e++)b.comm['expert-'+e]={members:root.TrainingModel.owners(c,id,e),enabled:true};
  b.comm['expert-sync']={members:Array.from({length:M.world(c)},(_,i)=>i).filter(i=>{const q=M.rank(i,c);return q.pp===r.pp&&q.ep===r.ep;}),enabled:M.dpReplica(c)*c.cp*c.tp/c.ep>1};
  return b;
 }
 function render(c){
  if(c.layer<c.dense)return old.render(c);
  const conf=c.config||atlasConfig,id=c.rank??selectedRank,r=M.rank(id,conf),G=root.RankApprovedGlyphs;
  if(S.searchExpert!==null&&S.searchExpert>=conf.experts)return {html:`<svg class="approved-compute-svg" viewBox="0 0 1330 500"><text x="40" y="60" fill="currentColor">没有该编号的专家；有效范围 E0–E${conf.experts-1}</text></svg>`,notes:{}};
  if(S.searchExpert!==null&&S.searchExpert<conf.experts)S.bucket=Math.floor(S.searchExpert/(conf.experts/conf.ep));
  if(S.bucket!==null&&S.bucket>=conf.ep)S.bucket=null;
  const selectedMatch=/^expert-(\d+)$/.exec(c.selected||'');S.selectedExpert=selectedMatch?+selectedMatch[1]:null;
  const memory=M.memory(id,conf,simTime),execution=M.execution(id,conf,simTime),mb=Math.max(0,Math.min(conf.ga-1,memory.mb-1)),event=root.TrainingModel.route(conf,id,c.layer,mb),source=event.ids.indexOf(id);
  S.token=Math.min(S.token,event.assignments[source].length-1);
  const chosen=event.assignments[source][S.token],alphas=event.routingWeights[source][S.token],notes={},positions={},edges=[];
  const role={i:'#B1EF6B',w:'#BCA0F3',g:'#79D4F2'},nodeW=260,nodeH=48;
  let nodes='',wires='',frames='';
  const label=(x,y,t,color='#ababab',size=16,anchor='middle')=>`<text class="cg-annotation" x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="${size}">${esc(t)}</text>`;
  function hit(key,body,title,description,extra={}){
   notes[key]={title,description,...(c.bindings.comm[key]?{communication:c.bindings.comm[key]}:{}),...(c.bindings.tensors[key]?{tensor:c.bindings.tensors[key]}:{}),...extra};
   const execKey={'ep-dispatch':'dispatch','ep-combine':'combine','dw':'experts','updated':'experts'}[key]||key,executing=execution.layer===c.layer&&execution.keys.includes(execKey);
   return `<g class="cg-hit${executing?' is-executing':''}" tabindex="0" role="button" data-cg-node="${key}" data-wb-tip="${esc(description)}" aria-label="${esc(title)}" aria-pressed="${c.selected===key}">${body}</g>`;
  }
  function op(key,title,x,y,desc,comm=false){positions[key]={x,y,w:nodeW,h:nodeH};nodes+=hit(key,G.draw(comm?'comm':'op',x,y,title),title,desc);}
  function wire(a,b,tone='i',via=null,dash=false){const p=positions[a],q=positions[b];if(!p||!q)return;const start=[p.x+p.w/2,p.y+p.h],end=[q.x+q.w/2,q.y];const d=via||`M${start}V${(start[1]+end[1])/2}H${end[0]}V${end[1]}`;wires+=`<path class="cg-edge" data-edge-from="${a}" data-edge-to="${b}" d="${d}" fill="none" stroke="${role[tone]}" stroke-width="2" ${dash?'stroke-dasharray="6 5"':''} marker-end="url(#training-arrow-${tone})"/>`;edges.push({from:a,to:b,start,end});}
  op('attention','Attention · Q / KV / Out',535,10,'当前层 Attention，Q/KV/Out 参数遵循宿主 TP 分片。');
  op('router',`Router · Top-${conf.topk}`,535,95,`L${c.layer} · Router [${M.H}, ${conf.experts}]；当前跟踪 R${id} / μb${mb+1} / token ${S.token}。`);
  op('ep-dispatch',conf.ep>1?'Dispatch · All-to-All':'Dispatch · 本地分组',535,180,'按专家归属分发激活；EP 组保持 PP、CP、TP lane 与专家副本组不变。',true);
  wire('attention','router');wire('router','ep-dispatch');
  const n=conf.experts/conf.ep,count=S.bucket===null?conf.ep:n;
  // Reuse source layout to order experts and determine EP ownership. Compact
  // review geometry is projected uniformly into the current drawer viewport.
  const sourceLayout=layoutExpertGrid(conf.experts,conf.ep);
  const cols=Math.min(4,count),rows=Math.ceil(count/cols),stride=310,rowH=174,firstY=305;
  const combineY=firstY+rows*rowH+28;
  for(let i=0;i<count;i++){
   const bucket=S.bucket===null?i:S.bucket,e=S.bucket===null?i*n:S.bucket*n+i,src=sourceLayout.cards[e];
   const x=200+(i%cols)*stride,y=firstY+Math.floor(i/cols)*rowH,width=72,h=width*91/71;
   const selected=S.selectedExpert===e,active=S.bucket===null?chosen.some(k=>Math.floor(k/n)===bucket):chosen.includes(e),key=S.bucket===null?'bucket-'+bucket:'expert-'+e;
   const target=root.TrainingModel.representative(conf,id,e),members=root.TrainingModel.owners(conf,id,e);
   const title=S.bucket===null?`E${e}–E${e+n-1} · R${target}`:`Expert ${e} · R${target}`;
   positions[key]={x:x-width/2,y,w:width,h};
   const artwork=expertGlyph(S.bucket===null?`${e}–${e+n-1}`:e,x,y,width);
   let body=`<g class="training-expert ${active?'is-route':''}" data-owner="${src.owner}">${artwork}${label(x,y+h+24,S.bucket===null?`EP${bucket} · R${target}`:`R${target} · ETP1`)}</g>`;
   const desc=S.bucket===null?`${title}；${n} 个完整专家。点击展开。`:`L${c.layer} / E${e}；Gate/Up 各 [${M.H}, ${M.I}]，Down [${M.I}, ${M.H}]；ETP1；${members.length} 个参数副本，Rank {${members.slice(0,8).join(',')}${members.length>8?', …':''}}。${active?' 当前 token 入选，α='+alphas[chosen.indexOf(e)].toFixed(3)+'。':''}`;
   if(S.bucket===null)nodes+=`<g role="button" tabindex="0" class="cg-hit" data-training-bucket="${bucket}" data-wb-tip="${esc(desc)}" aria-label="${esc(title)}">${body}</g>`;
   else nodes+=hit(key,body,title,desc);
   if(active){const p=positions['ep-dispatch'];wire('ep-dispatch',key,'i',`M${p.x+p.w/2} ${p.y+p.h}V${y-35}H${x}V${y}`,target!==id);}
  }
  op('ep-combine',conf.ep>1?'Combine · 返回 / 加权合并':'Combine · 加权合并',535,combineY,'按原 token 索引恢复输出，入选专家贡献按路由权重合并。',true);
  for(let i=0;i<count;i++){
   const e=S.bucket===null?i*n:S.bucket*n+i,key=S.bucket===null?'bucket-'+i:'expert-'+e,p=positions[key];
   const active=S.bucket===null?chosen.some(k=>Math.floor(k/n)===i):chosen.includes(e);if(!active)continue;
   wire(key,'ep-combine','i',`M${p.x+p.w/2} ${p.y+p.h}V${p.y+p.h+12}H${p.x+p.w+24}V${combineY-24}H665V${combineY}`,root.TrainingModel.representative(conf,id,e)!==id);
  }
  const gradY=combineY+100;
  op('dgrad','MoE · 输入梯度 dX',1050,combineY-70,'反向从 Combine 回传输出梯度，专家计算输入梯度，Dispatch 的反向返回并合并输入梯度。Router 对输入的梯度贡献也需要相加。');
  const reverseSource=positions['ep-combine'],reverseEnd=positions['dgrad'];
  wires+=`<path class="cg-edge backward-edge" d="M${reverseSource.x+reverseSource.w} ${reverseSource.y+24}H${reverseEnd.x+130}V${reverseEnd.y+48}" fill="none" stroke="${role.g}" stroke-width="2" marker-end="url(#training-arrow-g)"/><path class="cg-edge backward-edge" d="M${reverseEnd.x+130} ${reverseEnd.y}V250H920V204H795" fill="none" stroke="${role.g}" stroke-width="2" marker-end="url(#training-arrow-g)"/>`;
  op('dw','参数梯度 · 累积',70,gradY,'当前层本地参数梯度；微批梯度累积后参与各自副本组同步。');
  op('dp-gradient','稠密参数 · 梯度同步',450,gradY,'稠密参数在对应 DP/CP 副本中同步。',true);
  op('expert-sync','专家副本 · 梯度同步',830,gradY,'同一专家的完整参数副本同步；ETP1 不表示按 TP 切分专家。',true);
  op('updated','优化器 · 权重更新',535,gradY+100,'梯度累积与同步完成后，更新参数和优化器状态。');
  wire('dw','updated','g');wire('dp-gradient','updated','g');wire('expert-sync','updated','g');
  if(S.selectedExpert!==null){const e=S.selectedExpert;frames+=label(665,gradY+190,`E${e} · Gate/Up ${M.H}×${M.I} · Down ${M.I}×${M.H} · ETP1`,role.w);}
  const height=gradY+220,defs=Object.entries(role).map(([k,v])=>`<marker id="training-arrow-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${v}"/></marker>`).join('');
  root.TrainingGraphSnapshot={layer:c.layer,rank:id,chosen:[...chosen],alpha:[...alphas],sourceToken:S.token,mb,positions,edges,bucket:S.bucket,experts:conf.experts,topk:conf.topk};
  return {html:`<svg class="approved-compute-svg training-compute" data-training-phase="${memory.active}" data-layout-key="${conf.experts}:${conf.ep}:${S.bucket}" data-height="${height}" viewBox="0 0 1330 ${height}" role="group" aria-label="L${c.layer} 专家分布计算图"><defs>${defs}</defs>${frames}${wires}${nodes}</svg>`,notes};
 }
 root.RankComputeGraph={...old,bindings,render};
})(globalThis);
