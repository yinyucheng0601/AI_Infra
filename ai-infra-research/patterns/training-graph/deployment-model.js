// The new view consumes stage 09 verbatim; it never changes the training model.
// Physical placement is an explicit scenario, not a hardware discovery result.
function trainingDeploymentState(parameters, focus=0, mode='dispatch') {
 const state=trainingRankState(8,parameters),c=state.config,r=state.ranks[focus];
 const route=moeRoute(parameters.token,c.experts),edges=[];
 const collective=['tp','cache','dp','edp'].includes(mode);
 const members=mode==='dp'?r.dpPeers:mode==='edp'?r.expertDP:collective?r.tpGroup:r.epPeers;
 if(collective)for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++)edges.push({from:members[i],to:members[j],experts:[],directed:false});
 if(!collective){
  const source=r.replica*c.ep*c.tp+r.lane,targets=new Map();
  route.chosen.forEach(e=>{const owner=Math.floor(e/(c.experts/c.ep)),target=(r.replica*c.ep+owner)*c.tp+r.lane;if(!targets.has(target))targets.set(target,[]);targets.get(target).push(e);});
  for(const [target,experts] of targets)edges.push({from:mode==='return'?target:source,to:mode==='return'?source:target,experts,directed:true,local:target===source});
 }
 return {config:c,ranks:state.ranks,focus,mode,route,members,edges,placement:state.ranks.map(r=>({rank:r.id,device:'npu-'+r.id,npu:r.id,board:0})),source:'explicit-board-binding'};
}
