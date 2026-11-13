/* Layout adapter for the approved SVG glyphs. P18 supplies the layer topology;
 * the atlas configuration supplies which communication boundaries are active.
 * This is a mechanism view, not a measured schedule or a ZeRO memory model.
 */
(function(root){
 'use strict';
 const color={i:'#B1EF6B',w:'#BCA0F3',g:'#79D4F2',muted:'#ababab'};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const shard=(config,id,index)=>root.RankAtlasModel.parameterShard(config,id,index);
 function bindings(config,id,layer){
  const M=root.RankAtlasModel,r=M.rank(id,config),T=config.mbs*config.seq/config.cp,H=M.H,I=M.I,tp=config.tp;
  const groups=M.groups(id,config,layer),moe=layer>=config.dense;
  const size=n=>(n*2/1e6).toFixed(2)+' MB';
  const entry=(shape,n,category,detail)=>({shape,elements:n,bytes:n*2,category,summary:shape+' · '+size(n),description:detail+'；2 bytes/元素；'+n.toLocaleString()+' 元素；'+size(n)});
  const act=entry(`${T} × ${H}`,T*H,3,`R${id} · L${layer}；[Micro Batch ${config.mbs}, Sequence ${config.seq/config.cp}, Hidden ${H}]；CP 本地序列，不启用 SP`);
  const tensors={};
  for(const key of ['input','norm-x','attn-result','boundary-y','norm-y','ffn-result','output'])tensors[key]={...act};
  tensors.dz={...act,category:null,target:{kind:'activation-gradient',rank:id,layer,indices:[]},description:act.description+'；边界激活梯度；当前显存账未单独分配该区域'};
  const aggregate=(indices,detail,category=0)=>{indices=indices.filter(i=>groups[i][2]>0);const n=indices.reduce((s,i)=>s+groups[i][2],0);return {...entry(n.toLocaleString()+' 元素',n,category,detail),target:{kind:category===1?'parameter-gradient':'parameter',rank:id,layer,indices}};};
  tensors['weight-attn']=aggregate([0,1,2],`Q [${H}, ${H/tp}]；K/V 各 [${H}, ${1024/tp}]；Out [${H/tp}, ${H}]；TP${r.tp}`);
  tensors['weight-ffn']=moe?aggregate([3,4],`E${r.ep*config.experts/config.ep}–E${(r.ep+1)*config.experts/config.ep-1}；每专家 Gate/Up 各 [${H}, ${I}]，Down [${I}, ${H}]；ETP1`):aggregate([10],`Gate/Up 各 [${H}, ${I/tp}]；Down [${I/tp}, ${H}]；TP${r.tp}`);
  tensors['weight-ffn'].shard=shard(config,id,moe?3:10);
  tensors.dw=aggregate(groups.map((_,i)=>i),'当前层全部本地参数梯度',1);
  tensors.updated=aggregate(groups.map((_,i)=>i),'当前层全部本地参数');
  for(const [key,index] of [['weight-norm',7],['weight-router',8],['weight-shared',9]])tensors[key]=aggregate([index],M.names[index]);
  for(const [key,index] of [['weight-embedding',5],['weight-head',6]]){const w=weightSelection(config,id,layer,index);if(w)tensors[key]=w;}
  if(layer===config.layers-1)tensors['weight-finalnorm']={...entry(`${H}`,H,0,'最终 RMSNorm 参数'),target:{kind:'parameter',rank:id,layer:null,indices:[7]}};
  const remoteT=T*(config.cp>1?config.cp-1:1);
  tensors['kv-remote']=entry(`2 × ${remoteT} × ${1024/tp}`,2*remoteT*1024/tp,config.cp>1?5:3,config.cp>1?'远端 CP 的 K/V 总逻辑数据量；不代表同时驻留的通信缓冲区':'本地 K/V');
  const all=Array.from({length:M.world(config)},(_,i)=>M.rank(i,config));
  const comm={};
  const set=(key,predicate,enabled=true)=>{comm[key]={members:enabled?all.filter(predicate).map(x=>x.id):[id],enabled};};
  const sameStage=x=>x.pp===r.pp;
  for(const key of ['tp-attn','tp-ffn','tp-shared'])set(key,x=>sameStage(x)&&x.dpIndex===r.dpIndex&&x.cp===r.cp,tp>1);
  set('cp',x=>sameStage(x)&&x.dpIndex===r.dpIndex&&x.tp===r.tp,config.cp>1);
  for(const key of ['ep-dispatch','ep-combine'])set(key,x=>sameStage(x)&&x.cp===r.cp&&x.tp===r.tp&&Math.floor(x.dpIndex/config.ep)===Math.floor(r.dpIndex/config.ep),config.ep>1);
  const width=config.layers/config.pp,end=(layer+1)%width===0&&r.pp<config.pp-1;
  for(const key of ['pp-forward','pp-backward'])set(key,x=>x.tp===r.tp&&x.cp===r.cp&&x.dpIndex===r.dpIndex&&(x.pp===r.pp||x.pp===r.pp+1),end);
  set('pp-input',x=>x.tp===r.tp&&x.cp===r.cp&&x.dpIndex===r.dpIndex&&(x.pp===r.pp||x.pp===r.pp-1),layer%width===0&&r.pp>0);
  set('dp-gradient',x=>sameStage(x)&&x.tp===r.tp, M.dpReplica(config)*config.cp>1);
  comm['dp-gradient'].denseMembers=[...comm['dp-gradient'].members];
  comm['dp-gradient'].expertMembers=moe?all.filter(x=>sameStage(x)&&x.ep===r.ep).map(x=>x.id):[];
  comm['dp-gradient'].members=[...new Set([...comm['dp-gradient'].denseMembers,...comm['dp-gradient'].expertMembers])].sort((a,b)=>a-b);
  comm['dp-gradient'].enabled=comm['dp-gradient'].members.length>1;
  return {tensors,comm};
 }
 function weightSelection(config,id,layer,index){
  const M=root.RankAtlasModel,[lo,hi]=M.bounds(id,config),global=index===5||index===6;
  const candidates=Array.from({length:hi-lo},(_,i)=>lo+i).filter(l=>M.groups(id,config,l)[index]?.[2]>0);
  if(!global&&!candidates.includes(layer))layer=candidates[0];
  const group=M.groups(id,config,global?null:layer)[index];
  if(!group||!group[2]||(!global&&layer===undefined))return null;
  const H=M.H,I=M.I,t=config.tp,e=config.experts/config.ep;
  const metadata=M.parameterMetadata(config,id,index),consumers=metadata.consumers;
  const names=['Attention · Q projection','Attention · K/V projection','Attention · Output projection','Experts · Gate/Up','Experts · Down','Embedding','LM Head','RMSNorm × 2','Router · Top-K','Shared Expert FFN','Dense FFN'];
  const n=group[2],summary=metadata.shape+' · '+(n*2/1e6).toFixed(2)+' MB';
  const partition=shard(config,id,index);
  return {target:{kind:'parameter',rank:id,layer:global?null:layer,indices:[index]},rank:id,layer:global?(index===6?hi-1:lo):layer,index,label:group[0],consumers,consumer:names[index],scope:global?'全局参数':`L${layer}`,shape:metadata.shape,elements:n,bytes:n*2,category:0,shard:partition,summary,description:`R${id} · ${global?'全局参数':'L'+layer} · ${group[0]}；${summary}；${partition.label}；分片索引从 0 开始；2 bytes/元素；${n.toLocaleString()} 元素`};
 }
 function render(c){
  c={...c,bindings:{...c.bindings,tensors:{...c.bindings.tensors}}};
  const G=root.RankApprovedGlyphs,moe=c.layer>=c.dense,notes={};
  const weightKey=c.weight?(['weight-attn','weight-attn','weight-attn','weight-ffn','weight-ffn','weight-embedding','weight-head','weight-norm','weight-router','weight-shared','weight-ffn'][c.weight.index]):null;
  if(weightKey)c.bindings.tensors[weightKey]=c.weight;
  let lines='',nodes='';
  const label=(x,y,s,tone=color.muted,size=14,anchor='start')=>`<text class="cg-annotation" x="${x}" y="${y}" fill="${tone}" font-size="${size}" text-anchor="${anchor}">${esc(s)}</text>`;
  function hit(key,body,title,description,op=null,enabled=true){
   notes[key]={title,description,op,...(c.bindings?.tensors[key]?{tensor:c.bindings.tensors[key]}:{}),...(c.bindings?.comm[key]?{communication:c.bindings.comm[key]}:{})};
   const selected=c.selected===key||op&&c.op===op||c.weight?.consumers.includes(key)||key===weightKey||c.weight&&(key==='weight-attn'&&c.weight.index<3||key==='weight-ffn'&&[3,4,10].includes(c.weight.index));
   return `<g class="cg-hit${enabled?'':' cg-inactive'}" data-cg-node="${key}" data-weight-focus="${!!c.weight&&(key===weightKey||c.weight.consumers.includes(key))}" data-wb-tip="${esc(description)}" ${op?`data-op="${op}"`:''} tabindex="0" role="button" aria-label="${esc(title)}" aria-pressed="${!!selected}">${body}</g>`;
  }
  function wire(d,tone='i',dash=false,owner=null){lines+=`<path class="cg-edge" data-weight-focus="${!!weightKey&&owner===weightKey}" d="${d}" fill="none" stroke="${color[tone]}" stroke-width="2" ${dash?'stroke-dasharray="6 5"':''} marker-end="url(#cg-arrow-${tone})"/>`;}
  const vertical=(x,y1,y2,tone='i',dash=false,owner=null)=>wire(`M${x} ${y1}V${y2}`,tone,dash,owner);
  function op(key,text,x,y,opId,desc){nodes+=hit(key,G.draw('op',x,y,text),text,desc,opId);}
  function comm(key,text,x,y,enabled,desc){nodes+=hit(key,G.draw('comm',x,y,text),text,desc,null,enabled);}
  function tensor(key,text,x,y,tone='i',desc='',side=true){
   const data=c.bindings?.tensors[key];
   const width=key==='kv-remote'?240:260;
   if(key===weightKey)text=c.weight.label;
   nodes+=hit(key,G.tensor(x+60.45-width/2,y,width,text,data?.summary||'',color[tone],c.weight&&key!==weightKey?null:data?.shard),text,data?.description||desc);
  }
  function add(key,x,y,opId,formula){nodes+=hit(key,G.draw('add',x-24,y-24)+label(x+45,y+6,formula,'#e8e8e8',16),formula,'逐元素残差相加，两个输入均为 T × H。',opId);}
  function frame(x,y,w,h,title){nodes+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#191919" stroke="#545454" stroke-width="1.2"/>`+label(x+15,y+27,title);}
  // Frames must be behind both links and nodes.
  const add2=moe?1370:1160;
  frame(270,120,710,620,'01 Attention 子层');
  frame(270,840,710,add2-800,'02 '+(moe?'MoE':'Dense FFN')+' 子层');
  const frames=nodes;nodes='';
  tensor('input','层输入 X · T × H',420,25);
  if(c.layer===0){
   op('embedding','Embedding',350,-90,'embed','词表行分片映射到层输入。');
   tensor('weight-embedding','W_Embedding',750,-97.2,'w');wire('M680.45 -66H610','w',false,'weight-embedding');vertical(480,-42,25);
  }
  vertical(480,87.4,160);
  op('norm1','RMSNorm',350,160,'norm1','对当前层输入归一化。');
  tensor('weight-norm','W_Norm · 本层两组',75,152.8,'w');wire('M265.45 184H350','w',false,'weight-norm');
  vertical(480,208,250);tensor('norm-x','归一化激活',420,250);
  vertical(480,312.4,370);
  op('attention','Attention · 本地计算',350,370,'attention','折叠 Q/K/V 投影、Attention 与输出投影；可在定位与查找中选择具体算子。');
  vertical(480,418,471);
  comm('tp-attn','TP · AllReduce',350,475,c.tp>1,c.tp>1?'对行并行输出投影的局部部分和求和，再进入残差。此图不启用 SP。':'TP1：输出保持本地，无跨 Rank 归约。');
  vertical(480,525,570);tensor('attn-result','R_Attn · T × H',420,570);
  vertical(480,632.4,686);wire('M350.45 56H300V710H456');add('residual1',480,710,'residual1','Y = X + R_Attn');
  vertical(480,734,765);tensor('boundary-y','子层边界 Y · T × H',420,765);
  tensor('kv-remote',c.cp>1?'远端 K / V':'K / V · CP1',65,c.cp>1?210:362.8,'i','CP1 时不交换远端 K/V。',false);
  if(c.cp>1){
   vertical(125.45,272.4,366);
   comm('cp','CP · K/V 交换',15,370,true,'取得远端序列位置的 K/V，供本地 Q 计算 Attention。');
   wire('M279 393H350');
  }else{
   wire('M245.45 394H350');
  }
  tensor('weight-attn','W_Attn · 本地参数',750,362.8,'w','ZeRO 关闭；此视图已是当前 TP Rank 所需的参数部分。',false);
  wire('M680.45 394H610','w',false,'weight-attn');nodes+=label(810,347,'ZeRO 关闭',color.muted,13,'middle');
  vertical(480,827.4,890);op('norm2','RMSNorm',350,890,'norm2','FFN / MoE 子层输入归一化。');
  wire('M265.45 184H285V914H350','w',false,'weight-norm');
  vertical(480,938,975);tensor('norm-y','归一化激活',420,975);
  let computeY=1070;
  if(moe){
   vertical(480,1037.4,1070);op('router','Router · Top-K',350,1070,'router',`按 token 选择 ${c.topk} 个专家。路由系数是输入相关中间值。`);
   tensor('weight-router','W_Router',750,1062.8,'w');wire('M680.45 1094H610','w',false,'weight-router');
   vertical(480,1118,1151);comm('ep-dispatch','EP · All-to-All',350,1155,c.ep>1,'Dispatch：按专家目的地分发激活与路由元数据；本地块留在本地。');
   vertical(480,1205,1235);computeY=1235;
   op('experts','Experts · FFN',350,1235,'experts','本 Rank 持有的专家计算；ETP=1。选择后可查询专家归属。');
   vertical(480,1283,1306);comm('ep-combine','EP · All-to-All',350,1310,c.ep>1,'Combine：专家结果回到来源 Rank，并按路由权重合并；通信本身不求和。');
   // Keep a full tensor and residual gap after Combine.
  }else{
   vertical(480,1037.4,1070);op('dense','FFN · 本地计算',350,1070,'dense','Dense FFN 本地参数分片的计算。');
  }
  // Extend the FFN frame for a readable branch-output and residual boundary.
  const resultY=moe?1430:1240,mergeY=resultY+130,outputY=mergeY+60,ppY=outputY+115,lossY=ppY+100,fullHeight=lossY+115;
  const frameMarkup=frames.replace(`height="${add2-800}"`,`height="${mergeY-800}"`);
  if(!moe){vertical(480,1118,1151);comm('tp-ffn','TP · AllReduce',350,1155,c.tp>1,'归约 FFN 行并行输出投影的局部部分和。');vertical(480,1205,resultY);}
  else if(c.shared>0){vertical(480,1360,resultY-54);add('shared-merge',480,resultY-30,null,'R_MoE = Routed + Shared');vertical(480,resultY-6,resultY);}
  else vertical(480,1360,resultY);
  tensor('ffn-result',(moe?'R_MoE':'R_FFN')+' · T × H',420,resultY);
  vertical(480,resultY+62.4,mergeY-24);wire(`M350.45 796H300V${mergeY}H456`);add('residual2',480,mergeY,'residual2',moe?'Z = Y + R_MoE':'Z = Y + R_FFN');
  vertical(480,mergeY+24,outputY);tensor('output','层输出 Z · T × H',420,outputY);
  tensor('weight-ffn',moe?'W_Experts · 本地参数':'W_FFN · 本地参数',750,computeY-7.2,'w',moe?'按 EP 分布的专家参数；ETP=1，ZeRO 关闭。':'当前 TP Rank 的 FFN 参数，ZeRO 关闭。',false);
  wire(`M680.45 ${computeY+24}H610`,'w',false,'weight-ffn');
  const stageWidth=c.layers/c.pp,stage=Math.floor(c.layer/stageWidth),atEnd=(c.layer+1)%stageWidth===0&&stage<c.pp-1;
  vertical(480,outputY+62.4,ppY-4);
  if(c.layer===c.layers-1){op('finalnorm','Final RMSNorm',350,ppY,'finalnorm','最后一层之后的最终归一化。');tensor('weight-finalnorm','W_Final Norm',750,ppY-7.2,'w');wire(`M680.45 ${ppY+24}H610`,'w');}
  else comm('pp-forward','PP · P2P 激活',350,ppY,atEnd,atEnd?'当前层为 stage 末层，向下一 stage 发送 Z。':'当前层无需 PP 发送：在 stage 内继续下一层，或已处于最后 stage。');
  vertical(480,ppY+50,lossY);op(c.layer===c.layers-1?'head':'following',c.layer===c.layers-1?'LM Head / Loss':'后续层 / Loss',350,lossY,c.layer===c.layers-1?'head':null,'后续层与损失计算的折叠视图。');
  if(c.layer===c.layers-1){tensor('weight-head','W_LM Head',750,lossY-7.2,'w');wire(`M680.45 ${lossY+24}H610`,'w',false,'weight-head');}
  // Folded backward lane retains real dependencies and upstream direction.
  wire(`M610 ${lossY+24}H1160V${ppY+50}`,'g',true);
  comm('pp-backward','PP · P2P dZ',1030,ppY,atEnd,'仅在对应 PP 边界接收后级的激活梯度；stage 内为本地反向依赖。');
  vertical(1160,ppY-4,1102.4,'g',true);tensor('dz','边界激活梯度 ∂L/∂Z',1100,1040,'g','当前层反向输入，和边界激活 Z 同形状。',false);
  vertical(1160,1040,968,'g',true);op('backward','本层反向 B',1030,920,null,'折叠子层、残差求导和内部反向通信，产生 dX 与参数梯度。');
  vertical(1160,920,832.4,'g',true);tensor('dw','参数梯度 ∂L/∂W',1100,770,'g','参数梯度与边界激活梯度分别表示。',false);
  vertical(1160,770,700,'g',true);comm('dp-gradient','梯度 · AllReduce',1030,650,c.bindings.comm['dp-gradient'].enabled,'ZeRO 关闭。Dense 参数在对应 DP×CP 副本组归约；专家参数仅在相同专家副本组归约。');
  vertical(1160,646,578,'g');op('update','本地优化器更新',1030,530,null,'当前配置不使用 ZeRO 状态分片。');
  vertical(1160,530,425.2,'w');tensor('updated','更新后的本地参数',1100,362.8,'w','完成当前训练步的本地参数更新。',false);
  // Updated weights become inputs of the next training step, not this forward pass.
  wire('M1030.45 394H940.45','w',true);
  wire(`M960 394V${computeY+24}H940.45`,'w',true);
  wire('M960 394V4H290V168H265.45','w',true);
  if(moe)wire('M960 394V1094H940.45','w',true);
  if(moe&&c.shared>0)wire('M290 168V1151H265.45','w',true);
  nodes+=label(1160,346,'下一训练步 · Wₜ₊₁',color.w,12,'middle');
  wire('M1030 944H1005V184H1026','g',true);comm('pp-input','PP · P2P dX',1030,160,c.layer%stageWidth===0&&stage>0,'仅在 stage 输入边界向上游返回输入梯度，其余在本地继续反向。');
  nodes+=label(1160,250,'B 折叠子层与残差求导',color.muted,14,'middle');
  if(moe&&c.shared>0){
   tensor('weight-shared','W_Shared',75,1120,'w');vertical(135.45,1182.4,1235,'w',false,'weight-shared');
   op('shared','Shared · FFN',0,1235,'shared',`${c.shared} 个共享专家，Gate/Up 与 Down 按 TP 分片。`);
   wire('M350.45 1006H280V1259H260');
   vertical(130,1283,1306);comm('tp-shared','TP · AllReduce',0,1310,c.tp>1,'归约共享专家行并行输出。');
   wire(`M130 1360V${resultY-30}H456`);
  }
  const defs=Object.keys(color).filter(k=>k!=='muted').map(k=>`<marker id="cg-arrow-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${color[k]}"/></marker>`).join('');
  const top=c.layer===0?120:0;
  return {html:`<svg class="approved-compute-svg" data-weight-isolation="${!!c.weight}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1330 ${fullHeight+top}" preserveAspectRatio="xMidYMin meet" role="group" aria-label="Transformer 层计算与通信机制图"><defs>${defs}</defs><g transform="translate(0 ${top})"><g class="cg-frames">${frameMarkup}</g>${lines}${nodes}</g></svg>`,notes};
 }
 root.RankComputeGraph={render,bindings,weightSelection};
})(globalThis);
