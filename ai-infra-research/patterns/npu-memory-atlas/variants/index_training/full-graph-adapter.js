// Keep the complete approved training-graph renderer as the calculation view.
// The previous abbreviated outline is no longer used for MoE layers.
(()=>{
 const previous=RankComputeGraph,M=RankAtlasModel;
 function bindings(c,id,layer){const b=previous.bindings(c,id,layer);for(let e=0;e<c.experts;e++)b.comm['moe-e'+e]={members:TrainingModel.owners(c,id,e),enabled:true};return b;}
 window.RankComputeGraph={...previous,bindings,render(c){
  if(c.layer<c.dense)return previous.render(c);
  const mb=TrainingClock.state(c.config,simTime).mb;
  const result=TrainingFullGraph.render({...c,mb});
  const match=/^moe-e(\d+)$/.exec(c.selected||'');TrainingGraphState.selectedExpert=match?+match[1]:null;
  return result;
 }};
})();
