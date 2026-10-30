(function(root){
'use strict';
function model(c){
 const g=c.graph,objects=[];
 for(const a of g.buffer_accesses)objects.push({...a,type:'access',label:a.buffer.name,root:a.buffer.index_root,region:a.region_key});
 for(const s of g.sync_edges)objects.push({...s,type:'sync',label:s.kind+' · '+s.event_type,root:s.index_root});
 for(const o of g.operations)if(!g.buffer_accesses.some(a=>a.line===o.line))objects.push({...o,type:'operation',label:o.kind+' · '+(o.pipe||o.func)});
 const byId=new Map(objects.map(o=>[o.type+':'+o.id,o]));
 const relations=g.sync_coverages.map(c=>({...c,type:'coverage',from:'access:'+c.access_id,to:'sync:'+c.sync_edge_id}));
 for(const d of g.buffer_dependencies){const from=d.producer_access_id||d.producer_id,to=d.consumer_access_id||d.consumer_id;if(byId.has('access:'+from)&&byId.has('access:'+to))relations.push({...d,type:'dependency',from:'access:'+from,to:'access:'+to});}
 const findings=[...c.audit.findings.map((f,i)=>({...f,id:'audit-'+i,scanner:'sync_audit'})),...g.findings.map((f,i)=>({...f,id:'graph-'+i,scanner:'flow_analyzer'}))];
 return {objects,relations,findings,unresolvedRelations:relations.filter(r=>!byId.has(r.from)||!byId.has(r.to))};
}
function related(m,f){const ev=f?.evidence||{},ids=new Set();for(const key of ['buffer_access','bad_operation','reference_operation','sync_edge']){const o=ev[key];if(o)ids.add((key==='sync_edge'?'sync':key==='buffer_access'?'access':'operation')+':'+o.id);}for(const o of m.objects)if(o.line===f?.line)ids.add(o.type+':'+o.id);for(const r of m.relations)if(ids.has(r.from)||ids.has(r.to)){ids.add(r.from);ids.add(r.to);}return [...ids];}
function context(c,m,selection,question){return {case:c.id,source:{file:c.file,url:c.origin,revision:c.revision,sha256:c.sourceSha256,derived:c.derived},selection,related:selection?.scanner?related(m,selection):[],question,limits:c.limits,scannerCounts:{structure:c.audit.findings.length,graph:c.graph.findings.length},deviceValidation:'not-run'};}
const api={model,related,context};if(typeof module!=='undefined')module.exports=api;root.SyncModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
