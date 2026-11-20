
// One graph schema for all stages. Row positions come from visible records, not stage-specific drawings.
// Row-vector convention: Y=XW; T=8,H=8,F=16,heads=4. Batch dimension omitted.
let graphModel=null;
// Router inputs and weights reused from dense-ffn-to-moe-v1; pad H=3 to H=8.
const MOE_INPUT_BASE=[[1,0,1],[0,1,0],[1,1,0],[0,0,1]];
const MOE_WR_BASE=[[2,.1,-1,-1],[0,1.8,-1,1.2],[.2,.3,2,1.5]];
function moeRoute(t,count=4){
 const input=MOE_INPUT_BASE[t%4].concat([0,0,0,0,0]);
 const scores=Array.from({length:count},(_,e)=>input.slice(0,3).reduce((s,v,j)=>s+v*(e<4?MOE_WR_BASE[j][e]:2*Math.sin((e+1)*(j+2)*1.37)),0));
 const chosen=Array.from({length:count},(_,e)=>e).sort((a,b)=>scores[b]-scores[a]||a-b).slice(0,2),m=scores[chosen[0]],z=chosen.reduce((a,e)=>a+Math.exp(scores[e]-m),0);
 return {input,scores,chosen,alpha:chosen.map(e=>Math.exp(scores[e]-m)/z)};
}
function moeStatistics(count){
 const loads=Array(count).fill(0);for(let t=0;t<8;t++)for(const e of moeRoute(t,count).chosen)loads[e]++;
 return {loads,active:loads.filter(n=>n>0).length,assignments:16,expertParameters:256,totalParameters:264*count,perTokenParameters:512+8*count};
}


function trainingGraph(){
 const config=deriveTrainingConfig(current,parameterState);
 const {moe,ep,experts,detailed,training,wgrad,tp,sp,seq,recollect}=config;
 const expertLayout=layoutExpertGrid(experts,ep),stats=moeStatistics(experts);
 const cf=358,cw=moe?1850:1030,cb=moe?2600:wgrad?1702:1030,ow=256,oh=ow*64/360;
 const {rows,byId}=buildTrainingRows(config),positions={},semanticEdges=[],sides={forward:cf,backward:cb,wgrad:cw};
 const cursorY=layoutTrainingRows(rows,{expertLayout});
 const color=C.i;let links='',nodes='',notes='';
 function remember(id,name,body,docs,extra={}){Object.assign(registry[id],{title:name,body,docs,audited:true,...extra});}
 function edge(id,a,b,col='i',dash=false,via=null){semanticEdges.push({id,from:a.id,to:b.id,role:col,relation:'data-dependency',sourcePort:{x:a.x,y:a.y},targetPort:{x:b.x,y:b.y}});const d=via||`M${a.x} ${a.y}V${b.y}`;return `<path class="wire" data-edge="${id}" d="${d}" stroke="${C[col]}" ${dash?'stroke-dasharray="6 5"':''} marker-end="url(#m-${col})"/>`;}
 function port(id,x,y){return {id,x,y};}
 function glyph(id,x,y,name,category,body,docs,communication=false){const icon=window.PtoOpIcons.find(i=>i.id===category);if(!icon)throw Error('Unknown op category '+category);let g=opNode({...icon,name},0,0).replace('<rect ','<rect class="outline" ');if(communication)g=g.replace('fill="#4f4f4f"','fill="#292929" stroke="#aaa" stroke-width="2" stroke-dasharray="7 6"');const s=hit(id,`<g data-kind="${communication?'communication':'op'}" data-category="${category}" transform="translate(${x-128} ${y}) scale(${ow/360})">${g}</g>`,name,body);remember(id,name,body,docs);positions[id]={x:x-128,y,width:ow,height:oh};return s;}
 function matrixNode(id,cx,top,name,shape,role,body,docs,objectId=id){const g=valueGeometry(cx,top-36+Math.max(42,72*shape[0]/Math.max(...shape))/2,shape);const y=top+(Math.max(42,72*shape[0]/Math.max(...shape))-72)/2;const s=matrixValue(cx,y,name,shape,role,id,objectId,body,'right');remember(id,name+' ['+shape+']',body,docs,{shape,role,objectId});positions[id]={x:g.left,y:g.top,width:g.right-g.left,height:g.bottom-g.top};return s;}
 function addNode(id,x,cy,body,role='i'){const icon=window.PtoOpIcons.find(i=>i.id==='add'),s=hit(id,`<g data-kind="op" transform="translate(${x-126} ${cy-22.4}) scale(.7)">${opNode(icon,0,0)}</g>`,role==='i'?'Residual Add':'梯度相加',body);remember(id,role==='i'?'Residual Add':'梯度相加',body,['model','grad']);positions[id]={x:x-22,y:cy-22,width:44,height:44};return s;}

 function drawMoe(r){
 const deployed=current>=8;
 const t=parameterState.token,{chosen,alpha,scores}=moeRoute(t,experts),ys=r.y;
 // Same Top-2 / dispatch / independent expert / weighted-combine grammar as dense-ffn-to-moe-v1.
 nodes+=glyph('moe-router',cf,ys,'Router · Top-2','router',`S=A·Wr，Wr[8,${experts}]。每个 token 选两位专家，对入选分数做 softmax。本例路由输入与 Wr 复用 Dense→MoE 报告的数值，扩展至 H=8；当前 t${t} 的分数为 [${scores.map(s=>s.toFixed(1))}]，系数由 top-2 softmax 实际计算。`,['moe']);
 if(deployed)nodes+=text(cf+190,ys+118,ep>1?'来源组 0 · 虚线跨组 / 实线本组':'EP=1 · 所有专家在同一 TP 组','small','start');
 nodes+=glyph('moe-dispatch',cf,ys+95,!deployed?'按专家重排 token':ep>1?'Dispatch · All-to-All':'Dispatch · 本地分组','reshape',ep>1?'EP 组之间按专家归属交换 token。每个 TP lane 与其他专家组的相同 TP lane 组成 EP 通信组。':'按专家重排 token，保留原 token 索引和合并系数；EP=1 不产生跨专家组通信。',['moe','parallel'],ep>1);
 links+=edge('moe-router-dispatch',port('moe-router',cf,ys+oh),port('moe-dispatch',cf,ys+95));
 nodes+=matrixNode('moe-router-weight',cf+240,ys-10,'Wr',[8,experts],'w','Router 参数在前向中共享于所有 token；每列对应一位专家的评分。',['moe']);
 links+=edge('moe-wr-router',port('moe-router-weight',cf+198,ys+oh/2),port('moe-router',cf+128,ys+oh/2),'w',true,`M${cf+198} ${ys+oh/2}H${cf+128}`);
 if(deployed){for(let g=0;g<ep;g++){
 const members=expertLayout.cards.filter(c=>c.owner===g),left=cf+Math.min(...members.map(c=>c.x-c.width/2))-10,right=cf+Math.max(...members.map(c=>c.x+c.width/2))+10,top=ys+Math.min(...members.map(c=>c.y))-70,bottom=ys+Math.max(...members.map(c=>c.y+c.height));
 notes+=`<rect class="module-frame" x="${left}" y="${top}" width="${right-left}" height="${bottom-top}" rx="12"/>`+text(left+14,top+20,`组 ${g} · Rank {${Array.from({length:tp},(_,i)=>g*tp+i).join(',')}}`,'small','start');
 }}
 for(const card of expertLayout.cards){
 const e=card.id,owner=card.owner,x=cf+card.x,y=ys+card.y,active=chosen.includes(e),a=active?alpha[chosen.indexOf(e)]:0;
 const ranks=Array.from({length:tp},(_,i)=>owner*tp+i),remote=owner!==0;
 if(expertLayout.compact){
 const id='moe-e'+e,iconHeight=card.width*91/71;
 const body=`专家 E${e}：当前 8 token 样本分到 ${stats.loads[e]} 次调用。每位专家全局 W1[8,16]、W2[16,8]，256 个参数；${deployed?'Rank {'+ranks+'}。':''}点击查看内部计算。`;
 nodes+=`<g data-expert="${e}" class="compact-expert ${active?'is-route':'off-route'}">`+hit(id,expertGlyph(e,x,y,card.width), '专家 E'+e,body)+text(x,y+iconHeight+20,`${stats.loads[e]} tokens${active?' · α '+a.toFixed(2):''}`,'small','middle')+'</g>';
 remember(id,'专家 E'+e,body,['moe','linear'],{expert:e});positions[id]={x:x-card.width/2,y,width:card.width,height:iconHeight};
 if(active){links+=edge('moe-dispatch-'+e,port('moe-dispatch',cf,ys+95+oh),port(id,x,y),'i',remote,`M${cf} ${ys+95+oh}H${cf-expertLayout.halfWidth+40}V${y-12}H${x}V${y}`);links+=edge('moe-return-'+e,port(id,x,y+iconHeight),port('moe-combine',cf,ys+expertLayout.combineY),'i',remote,`M${x} ${y+iconHeight}V${y+iconHeight+5}H${x+card.width/2+10}V${y+iconHeight+35}H${cf+expertLayout.halfWidth-40}V${ys+expertLayout.combineY-20}H${cf}V${ys+expertLayout.combineY}`);}

 continue;
 }
 notes+=`<rect class="module-frame" x="${x-140}" y="${y-55}" width="280" height="300" rx="10"/>`+text(x,y-32,`专家 E${e} · nᵢ=${stats.loads[e]}`,'small','middle');
 const start=nodes.length;
 nodes+=glyph('moe-e'+e+'-fc1',x,y,'E'+e+' · FC1','linear',`专家 E${e} 的参数独立。${deployed?'位于 Rank {'+ranks+'}。':''}W1ᵢ[8,${16/tp}]，W2ᵢ[${16/tp},8]；专家组内 TP=${tp}。各专家的参数相互独立。`,['moe','linear','tp']);
 nodes+=glyph('moe-e'+e+'-gelu',x,y+65,'GeLU','activation','沿用 Dense 的 GeLU，不改变专家激活函数；Vᵢ=GELU(AᵢW1ᵢ)。',['gelu','moe']);
 nodes+=text(x,y+226,`W1ᵢ [8,${16/tp}] · W2ᵢ [${16/tp},8]`,'tiny','middle',C.w);
 nodes+=glyph('moe-e'+e+'-fc2',x,y+130,'E'+e+' · FC2','linear',`E${e}(a)=GELU(aW1ᵢ)W2ᵢ。此处保留组内各 TP lane 的部分输出，返回来源后加权合并，再由外部 TP 归约得到完整结果或 SP 分片。`,['moe','tp']);
 if(deployed&&tp>1)nodes+=text(x,y+198,'TP 部分输出 [nᵢ,8] · 外部归约','tiny','middle');
 const chunk=nodes.slice(start);nodes=nodes.slice(0,start)+`<g class="moe-expert ${active?'is-route':'off-route'}" data-expert="${e}">${chunk}</g>`;
 const id='moe-e'+e+'-fc1';links+=`<g class="${active?'is-route':'off-route'}">`+edge('moe-dispatch-'+e,port('moe-dispatch',cf,ys+95+oh),port(id,x,y),'i',remote,`M${cf} ${ys+95+oh}V${y-18}H${x}V${y}`)+text(x,y-7,active?`t${t}${deployed?' · '+(remote?'跨组':'本组'):''} · α=${a.toFixed(2)}`:'','tiny','middle')+edge('moe-fc1-gelu-'+e,port(id,x,y+oh),port('moe-e'+e+'-gelu',x,y+65))+edge('moe-gelu-fc2-'+e,port('moe-e'+e+'-gelu',x,y+65+oh),port('moe-e'+e+'-fc2',x,y+130))+edge('moe-return-'+e,port('moe-e'+e+'-fc2',x,y+130+oh),port('moe-combine',cf,ys+expertLayout.combineY),'i',remote,`M${x} ${y+130+oh}V${ys+expertLayout.combineY-25}H${cf}V${ys+expertLayout.combineY}`)+'</g>';
 }
 nodes+=glyph('moe-combine',cf,ys+expertLayout.combineY,ep>1?'返回 All-to-All · 加权合并':'按 token 加权合并','mix','按原 token 索引恢复顺序，rₜ=Σᵢ αₜ,ᵢ Eᵢ(aₜ)。这是专家路径合并；下方 Residual Add 才是子层残差相加。',['moe'],ep>1);
 // Virtual module endpoints connect the outer FFN boundary to the expanded subgraph.
 registry['module-moe']={title:'MoE FFN',body:`${experts} 位 GeLU 专家、Top-2。每位专家 256 个参数，输入输出保持 H=8。`,docs:['moe'],audited:true};
 positions['module-moe']={x:cf-expertLayout.halfWidth,y:ys,width:expertLayout.halfWidth*2,height:expertLayout.height};
 }
 const roleBodies={
 'model-input-H0':'H₀ 是当前 Block 的输入。SP 开启时仅持有本 Rank 的 token 行。',
 'model-boundary-Y':'Hₐ = H₀ + R_Attn；同一张量同时进入 Norm₂ 和第二条恒等残差旁路。',
 'model-output':'H₁ = Hₐ + Y，是当前 Block 的输出。输入、分支结果与残差相加保持相同隐藏维。',
 'model-attn-result':'R_Attn 是 Attention 输出投影经 TP 归约后的分支输出，与 H₀ 逐元素相加。',
 'full-value-f-9':'Y 是 FFN 分支结果，经第二次残差相加形成 H₁。',
 'full-input-X':'X = Norm₁(H₀)，供 QKV 投影使用。SP 开启时，先保存本地 token 分片 Xᵣ，再通过 AG 取得完整 X。',
 'full-value-f-4':moe?'A = Norm₂(Hₐ)，供 Router 与入选专家共同读取；SP 开启时先收集 token 行。':'A = Norm₂(Hₐ)，供 FC1 使用。SP 开启时本 Rank 持有 Aᵣ，计算前经 AG 恢复 A。',
 'full-value-f-0':`X 由 TP 组内 ${tp} 份 Xᵣ 沿 token 维拼接得到，供 QKV 使用。`,
 'full-value-f-1':`QKVᵣ = X Wqkvᵣ，合并 ${4/tp} 个注意力头的 Q、K、V；每头宽度为2。`,
 'full-value-f-2':`Oᵣ 由本 Rank 的 ${4/tp} 个头执行 P·V 后拼接得到，供 PROJ 使用。`,
 'full-value-f-3':'Zprojᵣ = Oᵣ Wprojᵣ，是本 Rank 对 Attention 分支结果的数值贡献；不能当作完整 R_Attn。',
 'full-value-f-5':`A 由 ${tp} 份 Aᵣ 沿 token 维拼接得到，供 FC1 使用。`,
 'full-value-f-6':'Uᵣ = A W1ᵣ，是 FC1 的输出，也是 GELU 求导所需的前向输入。',
 'full-value-f-7':'Vᵣ = GELU(Uᵣ)，供 FC2 前向及 FC2_WGRAD 读取。',
 'full-value-f-8':'Z2ᵣ = Vᵣ W2ᵣ，是本 Rank 对 FFN 分支结果的贡献，随后经 TP 求和。'};
 for(let i=0;i<rows.length;i++){
 const r=rows[i];
 if(r.kind==='moe'){drawMoe(r);}
 else if(r.kind==='value')nodes+=matrixNode(r.id,cf,r.y,r.name,r.shape,'i',(roleBodies[r.id]||'前向计算产生的激活；形状由相邻矩阵乘法和 TP 切分决定。')+' 形状 ['+r.shape+']。',['model','linear','tp']);
 else if(r.kind==='add')nodes+=addNode(r.id,cf,r.cy,r.id==='module-add1'?'Hₐ = H₀ + R_Attn。反向时，上游梯度分别传给两条输入路径。':'H₁ = Hₐ + Y。反向时 dH₁ 同时传给 FFN 分支和恒等旁路。');
 else{
 let body=r.id==='module-norm1'?'LayerNorm₁ 沿每个 token 的隐藏维归一化 H₀，得到 X。':r.id==='module-norm2'?'LayerNorm₂ 归一化 Hₐ，得到 A。':r.id==='module-attn'?'QKV 投影生成查询、键和值；各头执行因果 Attention，合并后作输出投影。':r.id==='module-mlp'?'FFN = Linear(8→16) → GELU → Linear(16→8)，每个 token 使用同一组参数。':r.communication?(r.category==='expand'?`AG 沿 token 维拼接 ${tp} 份 [${seq},8] 激活，所有 Rank 得到 [8,8]。`:sp?`RS(sum) 合并 ${tp} 个 Rank 的 [8,8] 部分和，再沿 token 维分发 [${seq},8]。`:`AllReduce(sum) 合并 ${tp} 个 Rank 的 [8,8] 部分和，每 Rank 得到同一完整结果。`):r.name==='MHA'?`本 Rank 有 ${4/tp} 个头，每头宽度2。P=softmax(mask(QKᵀ/√2))；O=PV。因果 Mask 排除未来 token，无 Attention dropout。`:r.name==='GeLU'?'V = GELU(U) = U Φ(U)，不改变形状。':`${r.name} 是线性变换，前向 Y=XW。权重按输入×输出维记，与 PyTorch weight 的存储方向相反。`;
 nodes+=glyph(r.id,cf,r.y,r.name,r.category,body,r.communication?['nccl','tp']:r.category==='norm'?['model']:r.category==='attention'?['attention']:r.category==='activation'?['gelu']:['linear','tp'],!!r.communication);
 }
 if(i){const prev=rows[i-1];links+=edge('f-'+prev.id+'-'+r.id,port(prev.id,cf,prev.bottom),port(r.id,cf,r.top));}
 }
 for(const [src,dst] of [['model-input-H0','module-add1'],['model-boundary-Y','module-add2']]){const a=byId[src],b=byId[dst],rail=moe&&dst==='module-add2'?cf-expertLayout.halfWidth+20:cf-220;links+=edge('residual-'+dst,port(src,cf-25,a.cy),port(dst,cf-22,b.cy),'i',false,`M${cf-25} ${a.cy}H${rail}V${b.cy}H${cf-22}`);}
 const bands=[['module-norm1','module-add1','Attention 子层'],['module-norm2','module-add2','FFN 子层']];for(const [first,last,label] of bands){const a=byId[first],b=byId[last];notes+=`<rect class="module-frame" x="${moe&&first==='module-norm2'?cf-expertLayout.halfWidth:cf-250}" y="${a.y-20}" width="${moe&&first==='module-norm2'?expertLayout.halfWidth*2:550}" height="${b.bottom-a.y+40}" rx="12"/>`+text(cf-234,a.y-30,label,'small');}
 if(!detailed){graphModel={experts,stats,moe,ep,tp,sp,seq,rows,positions,edges:semanticEdges};graphModel.snapshot=trainingGraphSnapshot(config,rows,positions,semanticEdges,registry);return svg(notes+links+nodes,820,cursorY+30);}
 // Shared parameter identity is retained when TP changes shape.
 const weights={qkv:[8,24/tp],proj:[8/tp,8],...(!moe?{fc1:[8,16/tp],fc2:[16/tp,8]}:{})},inputId={qkv:sp?'full-value-f-0':'full-input-X',proj:'full-value-f-2',fc1:sp?'full-value-f-5':'full-value-f-4',fc2:'full-value-f-7'};
 const outputId={qkv:'full-value-f-1',proj:tp>1?'full-value-f-3':'model-attn-result',fc1:'full-value-f-6',fc2:tp>1?'full-value-f-8':'full-value-f-9'};
 for(const key of Object.keys(weights)){const r=byId['full-f-'+key],sh=weights[key];nodes+=matrixNode('full-param-f-'+key,cf+238,r.cy-36,LINEAR_WEIGHTS[key].name,sh,'w',`前向读取 W${shapeText(sh)}，DGRAD 读取 Wᵀ。两处引用为同一对象。`,['linear','tp'],'weight-'+key);links+=edge('param-f-'+key,port('full-param-f-'+key,cf+196,r.cy),port(r.id,cf+128,r.cy),'w',true,`M${cf+196} ${r.cy}H${cf+128}`);}
 function shapeText(a){return '['+a.join(',')+']';}
 if(training){
 const gradRows=[];function backValue(id,r,name,shape,body){nodes+=matrixNode(id,cb,r.y,name,shape,'g',body,['grad','linear','tp']);return {id,y:r.y,cy:r.cy,top:r.top,bottom:r.bottom};}
 // Each backward record occupies its corresponding forward row; no forward node is replaced.
 let reverse=[];
 const bOpMap={
 'module-moe':['moe-backward','MoE · 输入梯度','router'],
 'full-f-qkv':['full-b-dq','QKV_DGRAD','linear'], 'full-f-mha':['full-b-dm','MHA grad','attention'], 'full-f-proj':['full-b-dp','PROJ_DGRAD','linear'],
 'full-f-fc1':['full-b-d1','FC1_DGRAD','linear'],'full-f-gelu':['full-b-dg','GeLU grad','activation'],'full-f-fc2':['full-b-d2','FC2_DGRAD','linear'],
 'full-f-agq':['full-b-rsq','RS(dX)','reduce'],'full-f-agf':['full-b-rs1','RS(dA)','reduce'],
 'full-f-rsp':sp?['full-b-agp','AG(dR_Attn)','expand']:null,'full-f-rsf':sp?['full-b-ag2','AG(dY)','expand']:null,
 'module-norm1':['model-back-norm1','Norm 1 grad','norm'],'module-norm2':['model-back-norm2','Norm 2 grad','norm']};
 const gradValueMap={
 'full-input-X':['full-value-b-0','dXᵣ',[seq,8]],'full-value-f-0':['full-value-b-1','dX⁽ᵖ⁾ᵣ',[8,8]],
 'full-value-f-1':['full-value-b-2','dQKVᵣ',[8,24/tp]],'full-value-f-2':['full-value-b-3','dOᵣ',[8,8/tp]],
 'full-value-f-3':['full-value-b-4','dR_Attn',[8,8]],'model-attn-result':['model-grad-attn-result','dR_Attnᵣ',[seq,8]],
 'model-boundary-Y':['model-grad-boundary','dHₐ,Norm',[seq,8]],'full-value-f-4':['full-value-b-5','dAᵣ',[seq,8]],'full-value-f-5':['full-value-b-6','dA⁽ᵖ⁾ᵣ',[8,8]],
 'full-value-f-6':['full-value-b-7','dUᵣ',[8,16/tp]],'full-value-f-7':['full-value-b-8','dVᵣ',[8,16/tp]],
 'full-value-f-8':['full-value-b-9','dY',[8,8]],'full-value-f-9':['model-grad-ffn-result','dYᵣ',[seq,8]],
 'model-output':['full-input-dY','dH₁ᵣ',[seq,8]]};
 if(!sp&&tp>1){gradValueMap['full-input-X'][1]='dX⁽ᵖ⁾ᵣ';gradValueMap['full-value-f-4'][1]='dA⁽ᵖ⁾ᵣ';}
 for(const r of rows){
 if(r.id==='model-input-H0'){nodes+=addNode('model-back-add0',cb,r.cy,'dH₀ = Norm₁grad(dX) + dHₐ。后一项来自第一条恒等残差旁路。','g');nodes+=text(cb+38,r.cy+5,'dH₀','small','start',C.g);reverse.push({id:'model-back-add0',top:r.cy-22,bottom:r.cy+22,cy:r.cy});continue;}
 if(r.id==='module-add1'){nodes+=addNode('model-back-add1',cb,r.cy,'dHₐ = Norm₂grad(dA) + dH₁。dH₁ 来自第二条恒等残差旁路；dHₐ 随后同时送往 Attention 分支和 H₀ 的恒等旁路。','g');nodes+=text(cb+38,r.cy+5,'dHₐ','small','start',C.g);reverse.push({id:'model-back-add1',top:r.cy-22,bottom:r.cy+22,cy:r.cy});continue;}
 if(r.id==='module-add2')continue; // Add adjoint is a fan-out, not an addition.
 if(gradValueMap[r.id]){const [id,name,shape]=gradValueMap[r.id];const partial=name.includes('⁽ᵖ⁾')||!sp&&tp>1&&['full-input-X','full-value-f-4'].includes(r.id);const body=r.id==='model-boundary-Y'?'dHₐ,Norm 仅来自 Norm₂ 的反向路径；还要与第二条残差旁路返回的 dH₁ 相加，才得到完整 dHₐ。':r.id==='full-value-f-9'?'H₁=Hₐ+Y 的加法反向将 dH₁ 原样传给 Y 分支，因此 dY=dH₁。':partial?'这是本 Rank 对输入梯度的部分贡献；TP 归约完成后才得到完整的输入梯度或其序列分片。':`损失对 ${r.name} 的梯度，形状 ${shapeText(shape)}。它传给前一项计算，与优化器使用的参数梯度 dW 不同。`;reverse.push(backValue(id,r,name,shape,body));}
 else if(bOpMap[r.id]){const [id,name,cat]=bOpMap[r.id];let body=r.id==='module-moe'?'合并的反向将 αᵢ·dY 送回入选专家；各专家计算 dAᵢ，分发的反向将贡献送回来源并求和；Router 的分数梯度也贡献给 dA。Top-k 的离散专家编号不作连续求导。':name.includes('DGRAD')?'输入梯度 dX=dY·Wᵀ。它读取输出梯度与权重，不需要该线性层的前向输入。':name.includes('Norm')?'归一化的反向读取前向输入与当前输出梯度，计算对归一化输入的梯度。':name==='GeLU grad'?'dU=dV ⊙ GELU′(U)，需要前向 U。':name==='MHA grad'?'从 dO 和前向 Q/K/V/P 的数学依赖计算 dQ、dK、dV；融合实现可保存其他中间量或重计算。':cat==='expand'?'AG 拼接输出梯度的 token 分片，恢复 [8,8]。':'RS(sum) 归约输入梯度的各 Rank 贡献，并沿 token 维分片。';nodes+=glyph(id,cb,r.y,name,cat,body,r.id==='module-moe'?['moe','grad']:['grad','tp','attention'],r.communication);reverse.push({id,top:r.y,bottom:r.y+oh,cy:r.cy});}
 }
 for(let i=reverse.length-1;i>0;i--){const a=reverse[i],b=reverse[i-1];if(tp>1&&!sp&&['model-back-norm1','model-back-norm2'].includes(b.id)){const id=b.id==='model-back-norm1'?'full-b-rsq':'full-b-rs1',name=b.id==='model-back-norm1'?'AR(dX)':'AR(dA)',x=cb-230,y=a.top-20;nodes+=glyph(id,x,y,name,'reduce','各 TP Rank 的输入梯度只是部分贡献；AllReduce(sum) 合并为完整 [8,8] 输入梯度，再进入 Norm 的反向。',['tp','nccl'],true);links+=edge('ar-input-'+id,port(a.id,cb,a.top),port(id,x+128,y+oh/2),'g',true,`M${cb} ${a.top}V${y+oh/2}H${x+128}`);links+=edge('ar-output-'+id,port(id,x,y),port(b.id,cb,b.bottom),'g',true,`M${x} ${y}V${b.bottom+12}H${cb}V${b.bottom}`);continue;}links+=edge('b-'+a.id+'-'+b.id,port(a.id,cb,a.top),port(b.id,cb,b.bottom),'g',true);}
 const identity2=byId['model-output'],sum1=byId['module-add1'],sum0=byId['model-input-H0'];
 links+=edge('grad-residual2',port('full-input-dY',cb+38,identity2.cy),port('model-back-add1',cb+22,sum1.cy),'g',true,`M${cb+38} ${identity2.cy}H${cb+225}V${sum1.cy}H${cb+22}`);
 links+=edge('grad-residual1',port('model-back-add1',cb,sum1.cy-22),port('model-back-add0',cb+22,sum0.cy),'g',true,`M${cb} ${sum1.cy-22}H${cb+260}V${sum0.cy}H${cb+22}`);
 for(const key of Object.keys(weights)){const r=byId['full-f-'+key],sh=weights[key];nodes+=matrixNode('full-param-b-'+key,cb-238,r.cy-36,LINEAR_WEIGHTS[key].name,sh,'w','读取与前向相同的参数对象；DGRAD 使用其转置。',['linear','grad'],'weight-'+key);links+=edge('param-b-'+key,port('full-param-b-'+key,cb-196,r.cy),port(bOpMap[r.id][0],cb-128,r.cy),'w',true,`M${cb-196} ${r.cy}H${cb-128}`);}
 // Nonlinear and normalization backward dependencies keep explicit object mappings.
 for(const [source,target,backId] of [['model-input-H0','module-norm1','model-back-norm1'],['model-boundary-Y','module-norm2','model-back-norm2'],...(!moe?[['full-value-f-6','full-f-gelu','full-b-dg']]:[])]){const a=byId[source],b=byId[target];links+=edge('saved-'+backId,port(source,cf+38,a.cy),port(backId,cb-128,b.cy),'i',false,`M${cf+38} ${a.cy}H${cf+330}V${b.cy}H${cb-128}`);}
 const mha=byId['full-f-mha'];links+=edge('save-attention-state',port('full-f-mha',cf+128,mha.cy),port('full-attention-state',cf+190,mha.cy),'i',false,`M${cf+128} ${mha.cy}H${cf+190}`);nodes+=cachedCollection(cf+190,mha.y-8,'full-attention-state');remember('full-attention-state','Attention 前向状态',`每 Rank ${4/tp} 个头；Q/K/V 各 [8,${8/tp}]，每头 P[8,8]。这是数学反向依赖；实际保存内容由内核和重计算策略决定。`,['attention','grad']);links+=edge('attention-state',port('full-attention-state',cf+350,mha.cy),port('full-b-dm',cb-128,mha.cy),'i',false,`M${cf+350} ${mha.cy}H${cb-128}`);
 if(wgrad){for(const key of Object.keys(weights)){
 const r=byId['full-f-'+key],inp=byId[inputId[key]],out=byId[outputId[key]],sh=weights[key],name=key==='qkv'?'QKV':key==='proj'?'PROJ':key.toUpperCase();
 nodes+=glyph('full-w-'+key,cw,r.y,name+'_WGRAD','linear',`dW = Xᵀ·dY，shape ${shapeText(sh)}。它与 DGRAD 属于同一次反向；WGRAD 需要该线性层的前向输入。`,['linear','grad']);
 nodes+=matrixNode('full-dw-'+key,cw+220,r.cy-36,'d'+LINEAR_WEIGHTS[key].name,sh,'g','参数梯度与权重分片同形状；优化器使用该梯度更新参数，不作为上游激活梯度传播。',['grad'],'grad-weight-'+key);
 links+=edge('dw-'+key,port('full-w-'+key,cw+128,r.cy),port('full-dw-'+key,cw+178,r.cy),'g',true,`M${cw+128} ${r.cy}H${cw+178}`);
 const gradId=gradValueMap[out.id][0];links+=edge('wgrad-dy-'+key,port(gradId,cb-38,out.cy),port('full-w-'+key,cw+64,r.y+oh),'g',true,`M${cb-38} ${out.cy}H${cw+285}V${r.y+80}H${cw+64}V${r.y+oh}`);
 if(recollect&&['qkv','fc1'].includes(key)){
 const source=byId[key==='qkv'?'full-input-X':'full-value-f-4'];nodes+=glyph('full-cache-'+key,cw,r.y+95,key==='qkv'?'AG(Xᵣ)':'AG(Aᵣ)','expand','本例只保存序列分片；WGRAD 前重新收集完整输入。保留完整输入时可以省去该次 AG。',['tp','grad'],true);
 nodes+=matrixNode('full-regather-'+key,cw,r.y-95,key==='qkv'?'X':'A',[8,8],'i','从缓存的序列分片重新收集得到完整线性层输入。',['tp','grad']);
 links+=edge('cache-source-'+key,port(source.id,cf+38,source.cy),port('full-cache-'+key,cw-128,r.y+95+oh/2),'i',false,`M${cf+38} ${source.cy}H${cf+380}V${r.y+95+oh/2}H${cw-128}`);
 links+=edge('cache-up-'+key,port('full-cache-'+key,cw,r.y+95),port('full-regather-'+key,cw,r.y-23),'i',false,`M${cw} ${r.y+95}H${cw-190}V${r.y-59}H${cw-38}`);
 links+=edge('cache-to-w-'+key,port('full-regather-'+key,cw,r.y-23),port('full-w-'+key,cw,r.y),'i');
 }else{links+=edge('wgrad-x-'+key,port(inp.id,cf+38,inp.cy),port('full-w-'+key,cw-128,r.cy),'i',false,`M${cf+38} ${inp.cy}H${cf+380}V${r.cy}H${cw-128}`);}
 }}
 }
 if(moe&&training){const r=byId['module-moe'];nodes+=glyph('moe-wgrad',cw,r.y+400,'专家 / Router WGRAD','linear','各专家保存 dispatch 后的前向输入和 GeLU 输出，计算 dW1=AᵀdU、dW2=VᵀdE；Router 参数梯度来自被选分数的 softmax 路径。每位专家的权重独立。',['moe','grad']);if(recollect){nodes+=glyph('moe-router-regather',cw,r.y+280,'AG(Aᵣ) · Router WGRAD','expand','只保存序列分片时，Router WGRAD 重新收集完整 A。专家 WGRAD 另外读取保留的 dispatch 后输入。',['moe','tp','grad'],true);links+=edge('moe-router-cache',port('full-value-f-4',cf+38,byId['full-value-f-4'].cy),port('moe-router-regather',cw-128,r.y+280+oh/2),'i',false,`M${cf+38} ${byId['full-value-f-4'].cy}H${cw-190}V${r.y+280+oh/2}H${cw-128}`);links+=edge('moe-router-cache-wgrad',port('moe-router-regather',cw,r.y+280+oh),port('moe-wgrad',cw,r.y+400));}else{const source=byId[sp?'full-value-f-5':'full-value-f-4'];links+=edge('moe-wgrad-input',port(source.id,cf+38,source.cy),port('moe-wgrad',cw-128,r.y+400+oh/2),'i',false,`M${cf+38} ${source.cy}H${cw-180}V${r.y+400+oh/2}H${cw-128}`);} links+=edge('moe-wgrad-packed',port('moe-dispatch',cf+128,r.y+95+oh/2),port('moe-wgrad',cw-128,r.y+400+oh/2),'i',false,`M${cf+128} ${r.y+95+oh/2}H${cw-220}V${r.y+400+oh/2}H${cw-128}`);links+=edge('moe-wgrad-grad',port('moe-backward',cb-128,r.y+oh/2),port('moe-wgrad',cw,r.y+400),'g',true,`M${cb-128} ${r.y+oh/2}H${cw}V${r.y+400}`);}
 const titles=text(cf,28,'Forward / 前向','text','middle')+(training?text(cb,28,'DGRAD / 输入梯度','text','middle'):'')+(wgrad?text(cw,28,'WGRAD / 参数梯度','text','middle'):'');
 graphModel={experts,stats,moe,ep,tp,sp,seq,rows,positions,edges:semanticEdges,weights,inputId,outputId,recollect};graphModel.focusBounds=current>=7?{x:cf-(moe?expertLayout.halfWidth+50:330),y:byId['module-norm2'].y-50,width:moe?expertLayout.halfWidth*2+100:800,height:byId['model-output'].bottom-byId['module-norm2'].y+100}:null;graphModel.snapshot=trainingGraphSnapshot(config,rows,positions,semanticEdges,registry);return svg(notes+links+nodes+titles,training?cb+320:850,cursorY+30);
}
