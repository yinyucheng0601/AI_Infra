// Pure training adapter for the local model-parallel-rank-deck planner.
function trainingRankState(stage,parameters){
 const config=deriveTrainingConfig(stage,parameters),{tp,ep,sp,seq,experts}=config;
 if(!config.deployed)return {config,title:'尚未映射部署',ranks:[],groups:[],pendingExperts:[],source:'logical-model',logicalBands:true};
 const plan=window.TrainingRankPatternPlanner.partitionModel({id:'current-transformer-block',layerCount:1,routedExperts:experts},{worldSize:config.worldSize,dimensions:{tp,pp:1,cp:1,ep,edp:config.expertDP},sourceLevel:'derived'},{stageRanges:[[0,0]]});
 const titles=['模型参数与输入','前向读写','输入梯度回传','参数梯度生成','TP 权重分片','SP 边界行分片','WGRAD 缓存取数','MoE 专家池','EP 专家部署'];
 const ranks=plan.manifests.map(m=>{
  const lane=m.coordinate.tp,group=m.coordinate.ep,replica=m.coordinate.edp,row=replica*ep+group,owned=stage===8?m.expertOwnership.ids:[];
  const objects=[{id:'weight-qkv',name:'Wqkv',shape:[8,24/tp]},{id:'weight-proj',name:'Wproj',shape:[8/tp,8]}];
  if(!config.moe)objects.push({id:'weight-fc1',name:'W1',shape:[8,16/tp]},{id:'weight-fc2',name:'W2',shape:[16/tp,8]});
  if(config.moe)objects.push({id:'moe-router-weight',name:'Wr',shape:[8,experts]});
  for(const e of owned)objects.push({id:'expert-'+e+'-w1',name:'E'+e+' W1',shape:[8,16/tp]},{id:'expert-'+e+'-w2',name:'E'+e+' W2',shape:[16/tp,8]});
  objects.forEach(o=>{o.instanceId='rank:'+m.rank+'/'+o.id;o.parallelIndex=lane;o.parallelCount=o.name==='Wr'?1:tp;});
  const bands=[{id:'weights',name:config.moe?'Attention / Router W':'线性权重 W',color:'#BCA0F3',detail:objects.filter(o=>!o.id.startsWith('expert-')).map(o=>o.name+' ['+o.shape+']').join('；')+(owned.length?`；专家 E${owned[0]}–E${owned.at(-1)}：每专家 W1[8,${16/tp}]、W2[${16/tp},8]，这是组内 TP 分片。`:'')}];
  bands.push({id:'activation',name:stage===0?'输入 H₀':stage>=6?(config.recollect?'缓存 Xᵣ / Aᵣ':'完整缓存 X / A'):sp?'本地激活行':'前向激活',color:'#B1EF6B',detail:sp?`子层边界 token 行 ${lane*seq}–${(lane+1)*seq-1}；AG 后线性计算读取完整 8 行。`:'当前 Block 输入与前向中间值；未按显存字节编码。'});
  if(stage>=2)bands.push({id:'gradient',name:stage>=3?'dX / dW':'输入梯度 dX',color:'#79D4F2',detail:stage>=3?'dX 传回前层，dW 供参数更新；不是两次反向执行。':'损失对激活的梯度，读取 Wᵀ 回传。'});
  if(stage>=4&&(tp>1||config.dp>1))bands.push({id:'communication',name:stage===8&&ep>1?'Dispatch / Return':stage>=6&&config.recollect?'AG · 缓存取数':sp?'AG / RS': 'AllReduce',color:'#808080',detail:stage===8&&ep>1?`EP 同 lane 组 {${Array.from({length:ep},(_,g)=>(replica*ep+g)*tp+lane)}}：按专家归属分发 token，并返回对应 TP lane 的部分输出。`:stage>=6&&config.recollect?'WGRAD 前重新收集缓存输入分片。':tp===1?'TP=1，不产生 TP 通信。':'当前 TP 组内的逻辑通信关系，不表示耗时或容量。'});
  if(stage===8)bands[0].name=`E${owned[0]}–E${owned.at(-1)} · W / ${tp}`;
  const dpPeers=plan.manifests.filter(other=>other.coordinate.tp===lane).map(other=>other.rank),expertDP=plan.groups.find(g=>g.axis==='edp'&&g.ranks.includes(m.rank)).ranks;
  bands.find(b=>b.id==='communication').detail+=` 稠密参数梯度在 DP 组 {${dpPeers}} 同步。`;
  if(stage>=3)bands.find(b=>b.id==='gradient').detail+=` 稠密参数梯度在 DP 组 {${dpPeers}} 同步；`+(stage===8?`同一专家分片在专家副本组 {${expertDP}} 同步。`:'各 TP 副本处理各自的数据。');
  return {id:m.rank,lane,group,replica,row,dpPeers,expertDP,objects,experts:owned,tokenRows:sp?Array.from({length:seq},(_,i)=>lane*seq+i):Array.from({length:8},(_,i)=>i),bands,tpGroup:plan.groups.find(g=>g.axis==='tp'&&g.ranks.includes(m.rank)).ranks,epPeers:plan.groups.find(g=>g.axis==='ep'&&g.ranks.includes(m.rank)).ranks};
 });
 return {config,title:titles[stage],ranks,groups:plan.groups.filter(g=>['tp','ep','edp'].includes(g.axis)),pendingExperts:stage===7?Array.from({length:experts},(_,i)=>i):[],source:'local-rank-pattern',logicalBands:true};
}

// Visual layout units, independent of capacity or bytes. Never normalize to the frame.
function rankBandLayout(bands){const heights={weights:100,activation:64,gradient:64,communication:36};let z=16;return bands.map(b=>{const h=heights[b.id]||48,record={...b,z,h};z+=h+10;return record;});}
