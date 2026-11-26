// Runs inside the original trainingGraph renderer. Keep its Router/Dispatch/
// full expert grid/Combine geometry; bind ownership to the host's ETP1 model.
function drawMoe(r){
 const ys=r.y,t=parameterState.token,{chosen,alpha}=moeRoute(t,experts),source=CTX.rank,conf=CTX.config;
 nodes+=glyph('moe-router',cf,ys,`Router · Top-${conf.topk}`,'router','路由系数来自当前来源 token 的 Top-K 路径。',['moe']);
 nodes+=matrixNode('moe-router-weight',cf+240,ys-10,'Wr',[H,experts],'w',`Router 参数 [${H}, ${experts}]。`,['moe']);
 links+=edge('moe-wr-router',port('moe-router-weight',cf+198,ys+oh/2),port('moe-router',cf+128,ys+oh/2),'w',true,`M${cf+198} ${ys+oh/2}H${cf+128}`);
 nodes+=glyph('moe-dispatch',cf,ys+95,ep>1?'Dispatch · All-to-All':'Dispatch · 本地分组','exchange','按专家归属分发输入激活；CP 与 TP lane 保持不变。',['moe'],ep>1);
 links+=edge('moe-router-dispatch',port('moe-router',cf,ys+oh),port('moe-dispatch',cf,ys+95));
 for(let owner=0;owner<ep;owner++){
  const cards=expertLayout.cards.filter(c=>c.owner===owner),left=cf+Math.min(...cards.map(c=>c.x-c.width/2))-10,right=cf+Math.max(...cards.map(c=>c.x+c.width/2))+10,top=ys+Math.min(...cards.map(c=>c.y))-60,bottom=ys+Math.max(...cards.map(c=>c.y+c.height));
  const target=window.TrainingModel.representative(conf,source,owner*experts/ep);
  notes+=`<rect class="module-frame" x="${left}" y="${top}" width="${right-left}" height="${bottom-top}" rx="12"/>`+text(left+14,top+20,`EP ${owner} · Rank ${target} · ETP1`,'small');
 }
 for(const card of expertLayout.cards){
  const e=card.id,x=cf+card.x,y=ys+card.y,active=chosen.includes(e),target=window.TrainingModel.representative(conf,source,e),id='moe-e'+e,width=expertLayout.compact?card.width:72,height=width*91/71;
  const replicas=window.TrainingModel.owners(conf,source,e),desc=`E${e} · Gate/Up 各 [${H},${F}]，Down [${F},${H}]；ETP1；参数副本 ${replicas.length} 个。`;
  nodes+=`<g class="compact-expert ${active?'is-route':'off-route'}" data-expert="${e}">`+hit(id,expertGlyph(e,x,y,width),`Expert ${e}`,desc)+text(x,y+height+20,`R${target}`,'small','middle')+'</g>';
  remember(id,`Expert ${e}`,desc,['moe'],{expert:e});positions[id]={x:x-width/2,y,width,height};
  if(active){
   links+=edge('moe-dispatch-'+e,port('moe-dispatch',cf,ys+95+oh),port(id,x,y),'i',target!==source,`M${cf} ${ys+95+oh}H${cf-expertLayout.halfWidth+40}V${y-12}H${x}V${y}`);
   links+=edge('moe-return-'+e,port(id,x,y+height),port('moe-combine',cf,ys+expertLayout.combineY),'i',target!==source,`M${x} ${y+height}V${y+height+5}H${x+width/2+10}V${y+height+35}H${cf+expertLayout.halfWidth-40}V${ys+expertLayout.combineY-20}H${cf}V${ys+expertLayout.combineY}`);
  }
 }
 nodes+=glyph('moe-combine',cf,ys+expertLayout.combineY,ep>1?'返回 All-to-All · 加权合并':'按 token 加权合并','mix','按原 token 索引恢复顺序，按路由系数合并专家贡献。',['moe'],ep>1);
 registry['module-moe']={title:'MoE FFN',body:`${experts} experts · Top-${conf.topk} · ETP1`,docs:['moe'],audited:true};positions['module-moe']={x:cf-expertLayout.halfWidth,y:ys,width:expertLayout.halfWidth*2,height:expertLayout.height};
}
