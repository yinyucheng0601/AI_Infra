/* Deterministic mock event records for the host's current eight-Rank configuration. */
(function(root){
 function build(state,params,colors){
  const phases=[['compute','Attention',0,110],['tp','TP · AllGather',130,42],['cache','缓存 · AllGather',190,34],['dispatch','EP · Dispatch',250,62],['compute','Expert FFN',330,140],['return','EP · Return',490,58],['compute','Backward',570,130],['dp','DP · 梯度同步',720,64],['edp','专家副本 · 梯度同步',810,54]];
  const events=[],rows=state.ranks.map(r=>{
   const enabled={compute:true,tp:r.tpGroup.length>1,cache:params.cache==='shard'&&r.tpGroup.length>1,dispatch:r.epPeers.length>1,return:r.epPeers.length>1,dp:r.dpPeers.length>1,edp:r.expertDP.length>1};
   const lane=phases.filter(([kind])=>enabled[kind]).map(([kind,label,start,duration],index)=>{
    const offset=(r.id%2)*4,begin=start+offset,end=start+duration+(r.id%3)*3,id='mock-r'+r.id+'-'+kind+'-'+index+'-t'+params.token;
    const event={id,rankId:String(r.id),occurrenceId:kind==='compute'?null:kind,kind,start:begin,end,label,rawName:label,status:'mock',time:{clockId:'configured-mock',start:begin,end},sourceEventIds:[id],color:kind==='compute'?'#555555':colors[kind]||'#888888'};events.push(event);return event;
   });return {id:String(r.id),label:'Rank '+r.id,events:lane};
  });
  const max=Math.max(1,...events.map(e=>e.end));
  return {schemaVersion:'deployment-trace-mock.v1',configured:true,id:'configured-mock:'+JSON.stringify(params),status:'mock',source:{producer:'deterministic-configured-trace',file:'observation/configured-trace-mock.js',timing:'fixed phase intervals and rank offsets; no performance derivation'},config:{...params},clock:{id:'configured-mock',domain:'constructed',unit:'us'},shared:true,events,rows,timeRange:{min:0,max,step:1},window:{start:0,end:max},unit:'us'};
 }
 if(typeof module!=='undefined')module.exports={build};else root.ConfiguredTraceMock={build};
})(globalThis);
