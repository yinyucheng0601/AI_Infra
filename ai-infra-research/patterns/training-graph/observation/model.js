/* Shared by browser and Node. No device facts are inferred from layout. */
(function(root){
'use strict';
const version='communication-observation.v1';
const collections=['sources','evidence','clocks','ranks','groups','contexts','occurrences','events','relations','resources','placements','topologyLinks','physicalPaths','exchanges','expertLoads','routeSamples','metricDefinitions','observations','capabilities','objectBindings'];
const fact=(value,status='mock',evidenceIds=['e-generator'])=>({value,status,evidenceIds,...(status==='unknown'?{reason:'未采集'}:{})});
const coverage=ids=>({expectedIds:ids,observedIds:ids,completeness:'complete',evidenceIds:['e-generator']});
function envelope(id){return Object.assign({schemaVersion:version,run:{id,scope:'communication-benchmark',stack:{deviceFamily:fact(null,'unknown',[]),backend:fact(null,'unknown',[]),runtime:fact(null,'unknown',[])},worldSize:fact(64),captureCoverage:coverage([]),config:{},clockAlignments:[],evidenceIds:['e-generator']}},Object.fromEntries(collections.map(k=>[k,[]])));}
function fromLegacy(data){
 if(data.schema!=='ep-exchange-observation.v1'||data.backend!=='mock')throw Error('仅支持旧版 EP Mock 契约');
 const d=envelope(data.id),ids=data.group.ranks.map(r=>'rank-'+r);
 d.sources=[{id:'generator',uri:'observation/ep_exchange.py',revision:'1',sha256:null,license:null,format:data.schema,producer:'deterministic-generator',producerVersion:'1',capturedAt:null}];
 d.evidence=[{id:'e-generator',sourceId:'generator',locator:'generate()',method:'deterministic EP routing; constructed intervals',inputEvidenceIds:[]}];
 d.run.worldSize=fact(data.worldSize);d.run.config=data.config;d.run.captureCoverage=coverage(data.capturedRanks.map(r=>'rank-'+r));
 d.ranks=data.group.ranks.map(r=>({id:'rank-'+r,rankIndex:r,captureStatus:data.capturedRanks.includes(r)?'captured':'missing',evidenceIds:['e-generator']}));
 d.groups=[{id:'ep0',membership:fact(ids),localRankMap:fact(data.group.ranks),semanticAxis:fact('EP'),evidenceIds:['e-generator']}];
 d.contexts=[{id:'context',iteration:fact(null,'unknown',[]),microbatch:fact(null,'unknown',[]),layer:fact(null,'unknown',[]),direction:fact('forward'),phase:fact('dispatch/combine'),evidenceIds:['e-generator']}];
 d.clocks=[{id:'scenario',domain:'constructed',unit:'us',origin:0,rankIds:ids,evidenceIds:['e-generator']}];
 d.occurrences=['dispatch','combine'].map(p=>({id:p+'-0',contextId:'context',groupId:'ep0',operation:fact(p),sequence:fact(0),tensorSpec:fact(data.config),match:{state:'verified',method:'generator phase identity',evidenceIds:['e-generator']},eventCoverage:coverage(ids),evidenceIds:['e-generator']}));
 d.events=data.events.map(e=>({id:'event-'+e.id,rankId:'rank-'+e.rank,contextId:'context',occurrenceId:e.occurrence,rawName:e.phase,category:'device-communication',backend:'mock',time:{clockId:'scenario',start:e.start,end:e.end},streamId:null,rawIds:{id:e.id},attributes:{},evidenceIds:['e-generator']}));
 const metric=(id,name,unit,quantity,meaning,targets)=>({id,name,unit,quantity,meaning,applicableTargetTypes:targets,numeratorDefinition:null,denominatorDefinition:null,comparabilityKeys:['contextId','occurrenceId','passId'],allowedAggregations:['sum','max','mean']});
 d.metricDefinitions=[metric('event.elapsed','阶段耗时','us','duration','构造的阶段结束减开始，不是实测传输时间',['rank','event']),metric('expert.assigned.tokens','专家命中','assignments','count','每个专家命中计一次；同一 token 可计多次',['rank']),metric('logical.received.tokens','接收 token','tokens','count','同一来源 token 按目的 Rank 去重；包含本地路由',['rank'])];
 const observe=(id,metricId,rank,value,occurrenceId,eventIds=[],status='derived')=>({id,metricId,target:{type:'rank',id:'rank-'+rank},contextId:'context',occurrenceId,eventIds,value,status,reason:null,evidenceIds:['e-generator'],scope:{kind:'occurrence',memberIds:['rank-'+rank],timeRange:null,iterationIds:[],passId:'constructed',sampleCount:1,aggregation:null},coverage:coverage(['rank-'+rank]),derivation:status==='derived'?{formula:metricId==='event.elapsed'?'end-start':metricId==='expert.assigned.tokens'?'count expert hits owned by rank':'count unique (source, token, destination)',inputObservationIds:[],evidenceIds:['e-generator']}:null});
 for(const e of data.events)d.observations.push(observe('elapsed-'+e.id,'event.elapsed',e.rank,e.end-e.start,e.occurrence,['event-'+e.id]));
 const received=Object.fromEntries(data.group.ranks.map(r=>[r,0]));
 d.exchanges=data.exchange.map((e,i)=>{received[e.destinationRank]+=e.tokens;return {id:'exchange-'+i,contextId:'context',occurrenceId:'dispatch-0',phase:fact('dispatch'),srcRankId:'rank-'+e.sourceRank,dstRankId:'rank-'+e.destinationRank,tokenCounting:fact('destination-rank-deduplicated'),evidenceIds:['e-generator']};});
 d.metricDefinitions.push(metric('logical.exchange.tokens','交换 token','tokens','count','同一来源 token 按目的 Rank 去重',['exchange']),metric('logical.activation.bytes','逻辑激活字节','bytes','bytes','BF16 hidden payload；不含 padding、索引或协议',['exchange']));
 data.exchange.forEach((e,i)=>{const tokens=observe('exchange-tokens-'+i,'logical.exchange.tokens',e.destinationRank,e.tokens,'dispatch-0'),bytes=observe('exchange-bytes-'+i,'logical.activation.bytes',e.destinationRank,e.tokens*data.config.hidden*2,'dispatch-0');for(const o of [tokens,bytes]){o.target={type:'exchange',id:'exchange-'+i};o.scope.memberIds=['rank-'+e.sourceRank,'rank-'+e.destinationRank];}tokens.derivation.formula='count unique (source, token, destination)';bytes.derivation={formula:'logical.exchange.tokens * hidden * BF16(2 bytes)',inputObservationIds:[tokens.id],evidenceIds:['e-generator']};d.observations.push(tokens,bytes);});
 data.group.ranks.forEach(r=>{d.observations.push(observe('load-'+r,'expert.assigned.tokens',r,data.expertAssignments[r],'dispatch-0'),observe('received-'+r,'logical.received.tokens',r,received[r],'dispatch-0'));});
 d.routeSamples=data.routes.map((r,i)=>({id:'route-'+i,contextId:'context',tokenId:String(r.token),sourceRankId:'rank-'+r.sourceRank,expertIds:r.experts,destinationRankIds:[...new Set(r.experts.map(e=>'rank-'+Math.floor(e/(data.config.experts/data.group.ranks.length))))],evidenceIds:['e-generator']}));
 d.capabilities=['rank-metrics','local-events','verified-occurrence','logical-exchange'].map(id=>({id,state:'supported',scopeRef:'ep0',evidenceIds:['e-generator'],reason:'deterministic mock'}));
 return validate(d);
}
function mock(skew=false){
 const ranks=Array.from({length:64},(_,r)=>r),routes=[],counts=new Map(),loads=Object.fromEntries(ranks.map(r=>[r,0]));
 for(const src of ranks)for(let token=0;token<64;token++){
  const experts=[(src*64+token)%256,(src*64+token+67)%256];
  if(skew&&token%4===0){experts[0]=0;if(experts[1]===0)experts[1]=1;}
  routes.push({sourceRank:src,token,experts});experts.forEach(e=>loads[Math.floor(e/4)]++);
  for(const dst of new Set(experts.map(e=>Math.floor(e/4)))){const k=src+':'+dst;counts.set(k,(counts.get(k)||0)+1);}
 }
 const data={schema:'ep-exchange-observation.v1',id:'mock-ep64-'+(skew?'skew':'baseline')+'-v1',backend:'mock',worldSize:64,group:{ranks},capturedRanks:ranks,config:{experts:256,topK:2,tokensPerRank:64,hidden:7168,dtype:'bf16'},routes,exchange:[...counts].map(([k,tokens])=>{const [sourceRank,destinationRank]=k.split(':').map(Number);return {sourceRank,destinationRank,tokens};}),expertAssignments:loads,events:['dispatch','combine'].flatMap((phase,i)=>ranks.map(rank=>({id:phase+'-'+rank,occurrence:phase+'-0',phase,rank,start:1000+i*500,end:1200+i*500})))};
 const d=fromLegacy(data);d.sources[0].uri='observation/model.js';d.sources[0].revision='1';d.evidence[0].locator='mock('+skew+')';
 if(skew)d.evidence[0].method+='; every fourth token first expert=0; no performance penalty inferred';
 // Explicit presentation placement for this constructed session only. Import
 // adapters never infer this mapping from rank count or a filename.
 d.sources.push({id:'layout-config',uri:'deployment-pattern/lingqu-physical.js',revision:'1',sha256:null,license:null,format:'layout-profile',producer:'configuration',producerVersion:'1',capturedAt:null});
 d.evidence.push({id:'layout-evidence',sourceId:'layout-config',locator:'lingqu-950-template',method:'configured contiguous rank placement: board=floor(rank/8), slot=rank%8, POD=floor(rank/64)',inputEvidenceIds:[]});
 const configured=value=>fact(value,'configured',['layout-evidence']);
 d.run.config.deployment={profile:'lingqu-950-template',evidenceIds:['layout-evidence']};
 d.resources.push({id:'physical-sp0',kind:'supernode',identity:configured({index:0}),parentId:null,evidenceIds:['layout-evidence']},{id:'physical-pod0',kind:'pod',identity:configured({index:0}),parentId:'physical-sp0',evidenceIds:['layout-evidence']});
 for(let board=0;board<8;board++)d.resources.push({id:'physical-board'+board,kind:'board',identity:configured({index:board}),parentId:'physical-pod0',evidenceIds:['layout-evidence']});
 for(const r of d.ranks){const n=r.rankIndex;d.resources.push({id:'physical-npu'+n,kind:'npu',identity:configured({index:n,slot:n%8,boardIndex:Math.floor(n/8),podIndex:Math.floor(n/64)}),parentId:'physical-board'+Math.floor(n/8),evidenceIds:['layout-evidence']});d.placements.push({id:'placement-'+n,rankId:r.id,resourceId:'physical-npu'+n,contextId:null,evidenceIds:['layout-evidence']});}
 return d;
}
function validate(d){
 const require=(ok,msg)=>{if(!ok)throw Error(msg);};
 require(d?.schemaVersion===version,'不支持的数据版本');require(d.run&&d.run.stack,'缺少运行技术栈');
 for(const k of collections)require(Array.isArray(d[k]),'缺少集合 '+k);
 const index=new Map();for(const k of collections)for(const o of d[k]){require(o&&typeof o.id==='string'&&!index.has(o.id),'重复或无效 ID: '+o?.id);index.set(o.id,{...o,collection:k});}
 const ref=(id,k)=>require(k&&index.get(id)?.collection===k,'无效引用 '+id+' → '+k);
 const evidence=ids=>{require(Array.isArray(ids),'缺少 evidenceIds');ids.forEach(id=>ref(id,'evidence'));};
 function checkFact(f){require(f&&['measured','derived','configured','mock','unknown'].includes(f.status),'无效字段来源');evidence(f.evidenceIds);require(f.status==='unknown'?f.value===null&&!!f.reason:f.value!==null&&f.evidenceIds.length>0,'字段值与来源不符');}
 function cov(c){require(c&&Array.isArray(c.observedIds)&&['complete','partial','unknown'].includes(c.completeness),'无效覆盖');c.observedIds.forEach(id=>ref(id,'ranks'));if(c.expectedIds!==null){require(Array.isArray(c.expectedIds),'无效期望成员');c.expectedIds.forEach(id=>ref(id,'ranks'));require(c.observedIds.every(id=>c.expectedIds.includes(id)),'采集成员越界');}if(c.completeness==='complete')require(c.expectedIds&&new Set(c.observedIds).size===new Set(c.expectedIds).size,'完整覆盖不成立');}
 for(const e of d.evidence){ref(e.sourceId,'sources');evidence(e.inputEvidenceIds);}
 for(const k of collections)if(!['sources','evidence','metricDefinitions','observations'].includes(k))for(const o of d[k])evidence(o.evidenceIds);
 checkFact(d.run.worldSize);for(const f of Object.values(d.run.stack))checkFact(f);cov(d.run.captureCoverage);
 const indices=new Set();for(const r of d.ranks){require(Number.isInteger(r.rankIndex)&&r.rankIndex>=0&&!indices.has(r.rankIndex),'无效 Rank');indices.add(r.rankIndex);if(d.run.worldSize.value!==null)require(r.rankIndex<d.run.worldSize.value,'Rank 超出作业范围');}
 for(const g of d.groups){checkFact(g.membership);checkFact(g.semanticAxis);if(g.membership.value)g.membership.value.forEach(id=>ref(id,'ranks'));}
 for(const o of d.occurrences){if(o.communicationKind){checkFact(o.communicationKind);require(o.communicationKind.status==='unknown'||['tp','cache','dispatch','return','dp','edp','ep','pp','cp','unknown'].includes(o.communicationKind.value),'无效通信分类');}if(o.groupId)ref(o.groupId,'groups');if(o.contextId)ref(o.contextId,'contexts');cov(o.eventCoverage);checkFact(o.operation);require(o.match&&['verified','partial','unmatched'].includes(o.match.state),'缺少匹配方法');if(o.match.state==='verified')require(o.match.method&&o.match.evidenceIds?.length,'操作匹配无证据');}
 require(d.run.worldSize.value===null||(Number.isInteger(d.run.worldSize.value)&&d.run.worldSize.value>0),'无效 worldSize');
 for(const c of d.clocks)require(['ns','us','ms'].includes(c.unit),'时钟单位未知');
 const family=d.run.stack.deviceFamily?.value,backend=d.run.stack.backend?.value;
 for(const e of d.events){ref(e.rankId,'ranks');if(e.occurrenceId)ref(e.occurrenceId,'occurrences');if(e.contextId)ref(e.contextId,'contexts');if(e.time){ref(e.time.clockId,'clocks');require(Number.isFinite(e.time.start)&&Number.isFinite(e.time.end)&&e.time.end>=e.time.start,'事件时间无效');}if(/ascend/i.test(family||'')||/hccl/i.test(backend||''))require(!/cuda|nccl/i.test(e.backend+' '+e.rawName),'禁止将 CUDA/NCCL 事件接入 Ascend');}
 for(const r of d.relations){ref(r.fromEventId,'events');ref(r.toEventId,'events');require(['correlation','dependency','contains'].includes(r.kind),'无效关系');}
 const targetCollections={rank:'ranks',event:'events',occurrence:'occurrences',group:'groups',exchange:'exchanges',expertLoad:'expertLoads',topologyLink:'topologyLinks',resource:'resources'};
 for(const o of d.observations){ref(o.metricId,'metricDefinitions');ref(o.target?.id,targetCollections[o.target?.type]);const def=index.get(o.metricId);require(def.applicableTargetTypes.includes(o.target.type)&&def.unit,'指标目标或单位无效');require(o.scope&&o.scope.kind,'缺少统计范围');if(o.scope.aggregation)require(def.allowedAggregations.includes(o.scope.aggregation),'聚合方法不适用');checkFact(o);require(o.value===null||Number.isFinite(o.value),'非有限指标');cov(o.coverage);if(o.contextId)ref(o.contextId,'contexts');if(o.occurrenceId)ref(o.occurrenceId,'occurrences');o.eventIds.forEach(id=>ref(id,'events'));if(o.status==='derived')require(o.derivation?.formula,'派生指标缺公式');}
 for(const x of d.exchanges){ref(x.srcRankId,'ranks');ref(x.dstRankId,'ranks');if(x.occurrenceId)ref(x.occurrenceId,'occurrences');}
 for(const p of d.placements){ref(p.rankId,'ranks');ref(p.resourceId,'resources');}
 for(const l of d.topologyLinks)l.endpointResourceIds.forEach(id=>ref(id,'resources'));
 for(const p of d.physicalPaths){ref(p.occurrenceId,'occurrences');p.linkIds.forEach(id=>ref(id,'topologyLinks'));p.eventIds.forEach(id=>ref(id,'events'));require(p.evidenceIds.length,'路径缺少证据');}
 return d;
}
// Explicit semantic evidence takes precedence. Rank count never classifies a group.
function communicationKind(d,o){
 if(!o)return 'unknown';
 const explicit=o.communicationKind?.value;
 if(explicit)return explicit;
 const axis=d.groups.find(g=>g.id===o.groupId)?.semanticAxis.value?.toUpperCase(),op=String(o.operation.value||'').toLowerCase();
 if(axis==='EP'){if(/dispatch/.test(op))return 'dispatch';if(/combine|return/.test(op))return 'return';return 'ep';}
 return ({TP:'tp',SP:'tp',DP:'dp',EDP:'edp',PP:'pp',CP:'cp'})[axis]||'unknown';
}
function rankValues(d,metricId,occurrenceId){
 const observations=d.observations.filter(o=>o.target.type==='rank'&&o.metricId===metricId&&o.occurrenceId===occurrenceId),seen=new Set();
 const scopes=new Set(observations.map(o=>JSON.stringify([o.scope.kind,o.scope.passId,o.scope.aggregation,o.contextId])));
 if(scopes.size>1)throw Error('指标统计范围不同，不能使用同一比较尺度');
 for(const o of observations){if(seen.has(o.target.id))throw Error('同一 Rank 指标有多份记录，请先选择或聚合');seen.add(o.target.id);}
 return new Map(observations.map(o=>[o.target.id,o]));
}
function fromRawLinked(raw){
 if(raw.schema!=='raw-linked-communication.v1'||raw.backend!=='nccl')throw Error('不支持的本地事件提取格式');
 const d=envelope('hta-rank-'+raw.rank);d.run.scope='parser-fixture';
 d.sources=[{id:'raw',uri:raw.source.url,revision:raw.commit,sha256:raw.source.sha256,license:'HTA LICENSE',format:raw.schema,producer:'PyTorch Profiler',producerVersion:null,capturedAt:null}];
 d.evidence=[{id:'e-generator',sourceId:'raw',locator:'metadata',method:'raw metadata',inputEvidenceIds:[]}];
 d.run.worldSize=fact(raw.worldSize,'measured');d.run.stack={deviceFamily:fact('NVIDIA','measured'),backend:fact('nccl','measured'),runtime:fact('cuda','measured')};
 const rankId='rank-'+raw.rank;d.ranks=[{id:rankId,rankIndex:raw.rank,captureStatus:'captured',evidenceIds:['e-generator']}];
 d.run.captureCoverage={expectedIds:null,observedIds:[rankId],completeness:'partial',evidenceIds:['e-generator']};
 d.clocks=[{id:'local',domain:'rank-local-profiler',unit:'us',origin:null,rankIds:[rankId],evidenceIds:['e-generator']}];
 d.events=raw.events.map((item,i)=>{const e=item.event,id='raw-event-'+i,eid='raw-evidence-'+i;d.evidence.push({id:eid,sourceId:'raw',locator:'traceEvents['+item.sourceIndex+']',method:'verbatim raw event',inputEvidenceIds:[]});return {id,rankId,contextId:null,occurrenceId:null,rawName:e.name,category:i===0?'framework':i===1?'runtime':'device-communication',backend:'nccl/cuda',time:{clockId:'local',start:e.ts,end:e.ts+e.dur},streamId:e.args.stream??null,rawIds:e.args,attributes:{raw:e},evidenceIds:[eid]};});
 const [cpu,runtime,gpu]=d.events;
 if(!cpu||!runtime||!gpu||cpu.rawIds['External id']!==gpu.rawIds['external id']||runtime.rawIds.correlation!==gpu.rawIds.correlation)throw Error('原始关联 ID 不匹配');
 d.relations=[cpu,runtime].map((e,i)=>({id:'correlation-'+i,fromEventId:e.id,toEventId:gpu.id,kind:'correlation',evidenceIds:[...e.evidenceIds,...gpu.evidenceIds]}));
 return validate(d);
}
const api={version,validate,fromLegacy,fromRawLinked,mock,rankValues,communicationKind};if(typeof module!=='undefined')module.exports=api;else root.CommunicationObservation=api;
})(typeof globalThis==='undefined'?window:globalThis);
