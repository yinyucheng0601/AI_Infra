// Pure planner extracted verbatim from local model-parallel-rank-deck. See provenance.json.
(function(global){'use strict';
const AXES=['tp','pp','ep','edp'];
  const DEFAULT_TOPOLOGY={
    worldSize:128,
    dimensions:{tp:2,pp:4,cp:1,ep:8,edp:2},
    rankOrder:['tp','pp','cp','ep','edp'],
    sourceLevel:'demo'
  };
  const TP_SHARDED=new Set([
    'embedding','q_a_proj','kv_a_proj','q_b_proj','kv_b_proj','query_tensor','key_tensor','attention_core',
    'o_proj','dense_gate_up','dense_down','lm_head','mtp_eh_proj','mtp_decoder_layer','mtp_shared_head'
  ]);
  const TP_COLLECTIVE=new Set(['attn_all_gather','attn_reduce_scatter','moe_all_gather','moe_reduce_scatter','logits_allgather']);
  const EP_SHARDED=new Set(['expert_pool','a2a_dispatch','a2a_combine']);
  const finiteInt=(value,label,min=1)=>{const next=Number(value);if(!Number.isInteger(next)||next<min)throw new TypeError(`${label} must be an integer >= ${min}`);return next;};
  function normalizeTopology(input={}){
    const dimensions={...DEFAULT_TOPOLOGY.dimensions,...(input.dimensions||{})};
    Object.keys(dimensions).forEach(key=>{dimensions[key]=finiteInt(dimensions[key],`dimensions.${key}`);});
    const computed=dimensions.tp*dimensions.pp*dimensions.cp*dimensions.ep*dimensions.edp;
    const worldSize=input.worldSize==null?computed:finiteInt(input.worldSize,'worldSize');
    if(worldSize!==computed)throw new RangeError(`worldSize ${worldSize} does not equal TP×PP×CP×EP×EDP (${computed})`);
    return{...DEFAULT_TOPOLOGY,...input,worldSize,dimensions,sourceLevel:input.sourceLevel||'demo'};
  }

  function enumerateRanks(topologyInput={}){
    const topology=normalizeTopology(topologyInput),d=topology.dimensions,coordinates=[];
    for(let edp=0;edp<d.edp;edp+=1)for(let ep=0;ep<d.ep;ep+=1)for(let cp=0;cp<d.cp;cp+=1)for(let pp=0;pp<d.pp;pp+=1)for(let tp=0;tp<d.tp;tp+=1){
      const rank=(((((edp*d.ep)+ep)*d.cp+cp)*d.pp+pp)*d.tp+tp);
      coordinates.push({rank,tp,pp,cp,ep,edp});
    }
    if(coordinates.length!==topology.worldSize)throw new Error('Rank enumeration did not produce worldSize coordinates');
    return coordinates;
  }

  function groupKey(coordinate,axis){
    return ['tp','pp','cp','ep','edp'].filter(key=>key!==axis).map(key=>`${key}${coordinate[key]}`).join('-');
  }

  function buildGroups(coordinates){
    const groups=[];
    AXES.forEach(axis=>{
      const buckets=new Map();
      coordinates.forEach(coordinate=>{const key=groupKey(coordinate,axis);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(coordinate);});
      buckets.forEach((members,key)=>groups.push({
        id:`${axis}:${key}`,axis,label:`${axis.toUpperCase()} group · ${key}`,
        ranks:members.sort((a,b)=>a[axis]-b[axis]).map(item=>item.rank),sourceLevel:'derived'
      }));
    });
    return groups;
  }

  function partitionModel(modelInput={},topologyInput=DEFAULT_TOPOLOGY,rules={}){
    const topology=normalizeTopology(topologyInput),model={...modelInput},d=topology.dimensions;
    const layerCount=finiteInt(model.layerCount,'model.layerCount');
    const stageRanges=(rules.stageRanges||model.stageRanges||[]).map(range=>range.map(Number));
    if(stageRanges.length!==d.pp)throw new RangeError(`PP ${d.pp} requires ${d.pp} explicit stageRanges`);
    const covered=[];
    stageRanges.forEach(([lo,hi],stage)=>{
      if(!Number.isInteger(lo)||!Number.isInteger(hi)||lo<0||hi<lo||hi>=layerCount)throw new RangeError(`Invalid PP${stage} range ${lo}-${hi}`);
      for(let layer=lo;layer<=hi;layer+=1)covered.push(layer);
    });
    if(covered.length!==layerCount||new Set(covered).size!==layerCount||Math.min(...covered)!==0||Math.max(...covered)!==layerCount-1)throw new Error('PP stageRanges must cover every physical Layer exactly once');
    const routedExperts=finiteInt(model.routedExperts||256,'model.routedExperts');
    if(routedExperts%d.ep!==0)throw new RangeError(`routedExperts ${routedExperts} must be divisible by EP ${d.ep}`);
    const expertsPerRank=routedExperts/d.ep,coordinates=enumerateRanks(topology),groups=buildGroups(coordinates);
    const groupByAxisRank=Object.fromEntries(AXES.map(axis=>[axis,new Map()]));
    groups.forEach(group=>group.ranks.forEach(rank=>groupByAxisRank[group.axis].get(rank)?.push(group)||groupByAxisRank[group.axis].set(rank,[group])));
    const manifests=coordinates.map(coordinate=>{
      const [lo,hi]=stageRanges[coordinate.pp],expertStart=coordinate.ep*expertsPerRank,expertEnd=expertStart+expertsPerRank-1;
      const staticRoles=[];if(coordinate.pp===0)staticRoles.push('input');if(coordinate.pp===d.pp-1)staticRoles.push('output','mtp');
      const nodeOwnership={};
      TP_SHARDED.forEach(id=>{nodeOwnership[id]={kind:'sharded',axis:'tp',index:coordinate.tp,count:d.tp};});
      TP_COLLECTIVE.forEach(id=>{nodeOwnership[id]={kind:'sharded',axis:'tp',index:coordinate.tp,count:d.tp};});
      EP_SHARDED.forEach(id=>{nodeOwnership[id]={kind:'sharded',axis:'ep',index:coordinate.ep,count:d.ep};});
      const communicationGroups={};
      AXES.forEach(axis=>{communicationGroups[axis]=(groupByAxisRank[axis].get(coordinate.rank)||[]).map(group=>group.id);});
      return{
        rank:coordinate.rank,coordinate:{...coordinate},modelId:model.id||'openpangu-flash',
        layerSegments:[{start:lo,end:hi,stage:coordinate.pp}],staticRoles,nodeOwnership,
        expertOwnership:{kind:'sharded',axis:'ep',index:coordinate.ep,count:d.ep,start:expertStart,end:expertEnd,ids:Array.from({length:expertsPerRank},(_,index)=>expertStart+index),sourceLevel:'demo'},
        communicationGroups,
        payloadSignature:[model.id||'openpangu-flash',`pp${coordinate.pp}`,`tp${coordinate.tp}`,`cp${coordinate.cp}`,`ep${coordinate.ep}`,`L${lo}-${hi}`,`E${expertStart}-${expertEnd}`].join('|'),
        sourceLevel:topology.sourceLevel||'demo'
      };
    });
    return{
      model,topology,coordinates,manifests,groups,
      manifestByRank:new Map(manifests.map(manifest=>[manifest.rank,manifest])),
      groupById:new Map(groups.map(group=>[group.id,group])),groupByAxisRank,
      stats:{rankVolumes:coordinates.length,layerInstances:manifests.reduce((sum,item)=>sum+item.layerSegments.reduce((count,segment)=>count+segment.end-segment.start+1,0),0),staticInstances:manifests.reduce((sum,item)=>sum+(item.staticRoles.includes('input')?1:0)+(item.staticRoles.includes('output')?1:0),0)}
    };
  }


global.TrainingRankPatternPlanner={normalizeTopology,enumerateRanks,buildGroups,partitionModel};
})(window);
