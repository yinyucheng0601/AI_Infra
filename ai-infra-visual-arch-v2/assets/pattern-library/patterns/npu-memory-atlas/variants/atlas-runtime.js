/* Shared model-to-scene adapter; no UI is mounted here. */
window.installRankAtlasRuntime=function(){
 const M=RankAtlasModel,legacy={simulationState,shardOwnership,shardSpec};
 const fmt=n=>n<.01?(n*1000).toFixed(2)+" MB":n.toFixed(2)+" GB";
 // Single configuration ledger: all views read the same model and runtime state.
 baseGroups.splice(0,baseGroups.length,...M.groups(0,atlasConfig));
 makeRanks=()=>Array.from({length:worldSize},(_,i)=>M.rank(i,atlasConfig));
 rankGroups=id=>M.groups(id,atlasConfig);
 moduleOrder.splice(0,moduleOrder.length,5,7,0,1,2,7,8,3,4,9,10,7,6);
 ranks=makeRanks();params=ranks.map(r=>M.parameters(r.id,atlasConfig));rankReserved=params.map(n=>n*16/1e9+M.activation(atlasConfig)+BASE_RESERVE);
 const memoryCache=new Map();let memoryConfig=null,memoryStamp='';
 function sceneMemory(id,t){
  const stamp=[t,mode,viewMode,epIncidentActive,relationRank].join(':');
  if(memoryConfig!==atlasConfig||memoryStamp!==stamp){memoryCache.clear();memoryConfig=atlasConfig;memoryStamp=stamp;}
  if(memoryCache.has(id))return memoryCache.get(id);
  const mem=M.memory(id,atlasConfig,t);
  if(mode==='comm'){
   const event=(epIncidentActive&&viewMode==='Front'&&id!==relationRank)||M.moeLayer(id,atlasConfig)===null?null:epEventAt(t,viewMode==='Top'?relationRank:id);
   const eventRank=viewMode==='Top'?event?.frame.ranks.find(r=>r.id===id):event?.rank,bytes=event?.available&&event.active?(eventRank?.bufferBytes||0):0;
   mem.communication=mem.values[5]=bytes/1e9;
   mem.live=mem.values.slice(0,6).reduce((a,b)=>a+b,0);
   mem.total=Math.max(mem.total,mem.live);mem.values[6]=mem.total-mem.live;mem.values[7]=Math.max(0,HBM-mem.total);mem.overflow=Math.max(0,mem.total-HBM);
  }
  memoryCache.set(id,mem);return mem;
 }
 simulationState=(t,id=renderRank)=>ATLAS_EMBED&&atlasHostState?legacy.simulationState(t,id):sceneMemory(id,t);
 applySimulation=function(){
  const st=simulationState(simTime),mem=sceneMemory(renderRank,simTime);
  cats.forEach((c,i)=>{c.value=mem.values[i];});
  if(ATLAS_EMBED&&atlasHostState){cats[1].value=st.gradient;cats[3].value=st.activation;cats[4].value=st.workspace;cats[5].value=st.communication;cats[6].value=Math.max(0,mem.total-cats.slice(0,6).reduce((a,c)=>a+c.value,0));cats[7].value=Math.max(0,HBM-cats.slice(0,7).reduce((a,c)=>a+c.value,0));}
  cats[6].sub='进程预留；已释放空间可复用';cats[7].sub=mem.overflow?'容量不足 '+fmt(mem.overflow):'容量减去进程预留';
  if(mode==='comm'&&viewMode==='Front'&&epIncidentActive&&renderRank===relationRank){const fault=incidentAt();cats[5].value=fault.usedBytes/1e9;const live=cats.slice(0,6).reduce((n,c)=>n+c.value,0);cats[6].value=Math.max(0,HBM-fault.freeBytes/1e9-live);cats[7].value=fault.freeBytes/1e9;}
  $('phase').textContent=`Step ${step} · ${st.phase} · μb ${st.mb}/${MICROBATCHES}`+(st.layer===null?'':` · L${st.layer}`);
  $('phase').dataset.wbTip=st.detail;$('timeline').value=mode==='comm'?Math.round(epEventAt(simTime,relationRank).frame.t*1000):Math.round(simTime);
  $('play').dataset.playing=String(playing);$('play').setAttribute('aria-label',playing?'暂停':'播放');$('play').dataset.wbTip=playing?'暂停':'播放';
 };
 shardOwnership=function(index,id=renderRank){if(index<9)return legacy.shardOwnership(index,id);const r=ranks[id],[lo,hi]=M.bounds(id,atlasConfig);return {present:rankGroups(id)[index][2]>0,expert:false,layers:`L${lo}–${hi-1}`,axis:`TP${TP} 分片`,replica:`DP${r.dpIndex}`,identity:`L${lo}–${hi-1} · ${baseGroups[index][0]} · TP${r.tp}`,key:`${r.pp}:${index}:${r.tp}`};};
 shardSpec=function(index,id=renderRank){
  if(index<9){const spec=legacy.shardSpec(index,id),[lo,hi]=M.bounds(id,atlasConfig),dense=Math.max(0,Math.min(hi,atlasConfig.dense)-lo),moe=hi-lo-dense;if(index===3||index===4)spec.copies=moe*EXPERTS/EP;if(index===8)spec.copies=moe;return spec;}
  const owner=shardOwnership(index,id),[lo,hi]=M.bounds(id,atlasConfig),dense=Math.max(0,Math.min(hi,atlasConfig.dense)-lo),copies=index===9?(hi-lo-dense)*atlasConfig.shared:dense;
  return {index,id,local:rankGroups(id)[index][2],owner,rule:`FFN 三矩阵 · TP${TP} 分片`,axis:'columns',parts:TP,part:ranks[id].tp,full:`3 × ${H} × ${I}`,shape:`3 × ${H} × ${I/TP}`,copies,unit:index===9?'层 × 共享专家':'Dense 层',fraction:1/TP,identity:owner.identity,replicas:M.dpReplica(atlasConfig)*atlasConfig.cp,scope:'共享 / Dense FFN 按 TP 分片，ETP 仅作用于 routed experts。'};
 };

 function applyConfig(c){
  if(!M.validate(c).ok)return false;
  atlasConfig={...c};({tp:TP,pp:PP,ep:EP,layers:L,experts:EXPERTS,ga:MICROBATCHES,hbm:HBM,node:cardsPerNode}=c);DP=M.lanes(c);worldSize=M.world(c);PEAK_ACT=M.activation(c);CYCLE_MS=c.ga*3500+3000;
  ranks=makeRanks();params=ranks.map(r=>M.parameters(r.id,c));rankReserved=params.map(n=>n*16/1e9+PEAK_ACT+BASE_RESERVE);epEventCache.clear();selectedRank=Math.min(selectedRank,worldSize-1);relationRank=relationRank===null?null:Math.min(relationRank,worldSize-1);simTime=0;lastFrame=null;
  return true;
 }
 return {sceneMemory,applyConfig};
};
