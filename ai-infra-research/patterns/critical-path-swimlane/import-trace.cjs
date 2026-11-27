// Read-only Chrome Trace adapter. Usage: rtk node import-trace.cjs /path/to/trace.json
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const file=process.argv[2];if(!file)throw Error('Provide a Chrome Trace JSON file');
const bytes=fs.readFileSync(file),raw=JSON.parse(bytes),events=raw.traceEvents.filter(e=>e.ph==='X');
const end=e=>e.ts+e.dur,round=n=>Math.round(n*1000)/1000;
const calls=events.filter(e=>e.name==='chip.run'),pids=[...new Set(calls.map(e=>e.pid))].sort((a,b)=>a-b);
assert.equal(pids.length,16);
const origin=Math.min(...events.map(e=>e.ts));
const ms=t=>round((t-origin)/1000);
const workerEvents=events.filter(e=>/^WorkerProcess\.(prepare_decode|dispatch_decode|reclaim_decode|batch_prefill)$/.test(e.name)).map((e,i)=>({id:'worker-'+i,name:e.name.split('.')[1],role:e.name.endsWith('prepare_decode')?'prepare':e.name.endsWith('reclaim_decode')?'reclaim':'dispatch',stepId:e.args.step_id??null,bufferSlot:e.args.buffer_slot??null,start:ms(e.ts),end:ms(end(e))}));
const batches=workerEvents.filter(e=>e.name==='batch_prefill').sort((a,b)=>a.start-b.start);
let previous=origin,decode=0;
const steps=[...new Set(calls.map(e=>e.args.inv))].sort((a,b)=>a-b).map(inv=>{
 const own=calls.filter(e=>e.args.inv===inv),start=Math.min(...own.map(e=>e.ts)),finish=Math.max(...own.map(end));
 const batch=batches.find(b=>start>=origin+b.start*1000-1&&finish<=origin+b.end*1000+1);
 const id=batch?'P'+String(batches.indexOf(batch)+1).padStart(2,'0')+'.'+inv: 'D'+String(++decode).padStart(2,'0');
 const base=previous,local=t=>round((t-base)/1000);
 const lanes=pids.map((pid,dev)=>{
  const run=own.find(e=>e.pid===pid),find=name=>events.find(e=>e.pid===pid&&e.args?.inv===inv&&e.name===name);
  const bind=find('chip.run.bind'),rr=find('chip.run.runner_run');assert.ok(run&&bind&&rr);
  assert.ok(bind.ts<=end(bind)&&end(bind)<=rr.ts+.01&&end(rr)<=end(run)+.01);
  return {dev,sourcePid:pid,bindStart:local(bind.ts),bindEnd:local(end(bind)),rrStart:local(rr.ts),rrEnd:local(end(rr)),end:local(end(run))};
 });
 const last=local(finish),crit=lanes.reduce((a,b)=>a.rrStart>b.rrStart?a:b).dev;
 previous=finish;
 return {id,label:batch?'Prefill '+(batches.indexOf(batch)+1)+' · inv '+inv:'Decode '+decode+' · inv '+inv,invocation:inv,batchId:batch?.id??null,t0:Math.min(0,...lanes.map(l=>l.bindStart)),t1:last,end:last,periodMs:last,crit,lanes,serving:[],worker:[]};
});
const workerGroups=batches.map(b=>({id:b.id,stepId:null,eventIds:[b.id],steps:steps.filter(s=>s.batchId===b.id).map(s=>s.id),basis:'temporal-containment'}));
for(const reclaim of workerEvents.filter(e=>e.role==='reclaim')){
 const members=workerEvents.filter(e=>e.stepId===reclaim.stepId),dispatch=members.find(e=>e.role==='dispatch');
 if(!dispatch)continue;
 const candidates=steps.filter(s=>!s.batchId&&calls.some(e=>e.args.inv===s.invocation&&ms(e.ts)>=dispatch.start)&&Math.max(...calls.filter(e=>e.args.inv===s.invocation).map(e=>ms(end(e))))<=reclaim.end+.001);
 const step=candidates.at(-1);
 if(step)workerGroups.push({id:'worker-step-'+reclaim.stepId,stepId:reclaim.stepId,eventIds:members.map(e=>e.id),step:step.id,invocation:step.invocation,basis:'temporal-candidate',completionGap:round(reclaim.end-Math.max(...calls.filter(e=>e.args.inv===step.invocation).map(e=>ms(end(e)))))});
}
const outputs=events.filter(e=>e.name==='scheduler.process_step_output').sort((a,b)=>a.ts-b.ts).map((e,i,all)=>({at:ms(e.ts),duration:round(e.dur/1000),gap:i?round((e.ts-all[i-1].ts)/1000):null}));
const data={version:2,run:{title:'DeepSeek V4 · TP1 / DP16',sub:'8K · 16B · '+steps.length+' invocation groups',sourceName:path.basename(file),provenanceFile:'trace-provenance.json',workerEvents,workerGroups,request:{start:0,end:ms(Math.max(...events.map(end))),outputs}},steps};

// Stable raw-event identity. Relationships retain their evidence basis.
const all=raw.traceEvents.map((e,i)=>({...e,sourceIndex:i})).filter(e=>Number.isFinite(e.ts));
const records=all.filter(e=>/^(http\.|request\.|scheduler\.|WorkerProcess\.|PyptoExecutor\.|DSparkModelRunner\.|node\.(submit|dispatch|frame_submit|complete)$|chip\.run$|chip\.run\.(bind|runner_run)$)/.test(e.name)).map(e=>({
 id:'raw-'+e.sourceIndex,name:e.name,start:ms(e.ts),end:ms(e.ts+(e.dur||0)),pid:e.pid,tid:e.tid,args:e.args||{},phase:e.ph,
 track:e.name.startsWith('scheduler.')?'scheduler':/^(PyptoExecutor|DSparkModelRunner)/.test(e.name)?'executor':e.name.startsWith('WorkerProcess')?'orchestration':e.name.startsWith('node.')?'runtime':e.name==='chip.run.runner_run'?'runner':e.name==='chip.run.bind'?'bind':'serving'
}));
const links=[];
const link=(a,b,basis,fields)=>{if(a&&b)links.push({from:a.id,to:b.id,basis,fields});};
for(const r of records){
 if(r.args.run_id!=null){
  for(const c of records.filter(c=>c.name==='chip.run'&&c.args.run_id===r.args.run_id&&c.id!==r.id)){
   if(r.args.dispatch_id!=null&&c.args.dispatch_id!==r.args.dispatch_id)continue;
   link(r,c,'id-match',r.args.dispatch_id!=null?['run_id','dispatch_id']:['run_id']);
  }
 }
 if(r.name==='chip.run'){
  for(const child of records.filter(c=>c.pid===r.pid&&c.args.inv===r.args.inv&&['bind','runner'].includes(c.track)))link(r,child,'id-match',['pid','inv']);
 }
 if(r.track==='runtime'&&r.args.worker_id!=null&&r.name==='node.dispatch'){
  for(const c of records.filter(c=>c.track==='runtime'&&c.args.run_id===r.args.run_id&&c.args.dispatch_id===r.args.dispatch_id&&c.args.worker_id===r.args.worker_id&&c.id!==r.id))link(r,c,'id-match',['run_id','dispatch_id','worker_id']);
 }
 if(r.track==='orchestration'&&r.args.step_id!=null&&r.name==='WorkerProcess.dispatch_decode'){
  for(const c of records.filter(c=>c.track==='orchestration'&&c.args.step_id===r.args.step_id&&c.id!==r.id))link(r,c,'id-match',['step_id']);
 }
 // Same-thread containment identifies call nesting, not an inter-process cause.
 if(['executor','orchestration'].includes(r.track)){
  const parents=records.filter(c=>c.id!==r.id&&['executor','orchestration'].includes(c.track)&&c.pid===r.pid&&c.tid===r.tid&&c.start<=r.start&&c.end>=r.end&&(c.start<r.start||c.end>r.end)).sort((a,b)=>(a.end-a.start)-(b.end-b.start));
  if(parents[0])link(parents[0],r,'same-thread-containment',['pid','tid','interval']);
 }
}
const requests=[...new Set(records.map(r=>r.args.request_id).filter(Boolean))].map(id=>{
 const own=records.filter(r=>r.args.request_id===id),queued=own.find(r=>r.name==='request.queued'),finished=own.find(r=>r.name==='http.stream_completion.finished');
 return {id,start:Math.min(...own.map(r=>r.start)),queued:queued?.start??null,end:finished?.start??null,eventIds:own.map(r=>r.id),promptTokens:queued?.args.prompt_tokens??null};
});
for(const r of records.filter(r=>Array.isArray(r.args.request_ids))){
 for(const id of r.args.request_ids){const req=requests.find(q=>q.id===id);if(req)for(const eventId of req.eventIds)links.push({from:r.id,to:eventId,basis:'id-match',fields:['request_ids','request_id']});}
}
const batchSamples=records.filter(r=>r.name==='WorkerProcess.batch_prefill'||r.name==='DSparkModelRunner.decode.l3_dispatch').map(r=>({eventId:r.id,start:r.start,end:r.end,value:r.args.actual_batch??r.args.batch_size,kind:r.name.includes('prefill')?'Prefill':'Decode'}));
const tokenSamples=records.filter(r=>r.name==='scheduler.process_step_output').map(r=>({eventId:r.id,at:r.start,value:r.args.new_tokens??null}));
for(const step of steps){
 step.rawEventIds=records.filter(r=>r.args.run_id===step.invocation||(['bind','runner'].includes(r.track)&&r.args.inv===step.invocation)).map(r=>r.id);
 step.absoluteStart=Math.min(...calls.filter(e=>e.args.inv===step.invocation).map(e=>ms(e.ts)));
 step.absoluteEnd=Math.max(...calls.filter(e=>e.args.inv===step.invocation).map(e=>ms(end(e))));
}

for(const group of workerGroups){
 const stepList=steps.filter(s=>s.id===group.step||group.steps?.includes(s.id));
 const members=workerEvents.filter(e=>group.eventIds.includes(e.id));
 for(const step of stepList){
  const roots=records.filter(r=>r.name==='chip.run'&&r.args.run_id===step.invocation);
  for(const m of members){
   const r=records.find(r=>r.name==='WorkerProcess.'+m.name&&Math.abs(r.start-m.start)<.002);
   if(r)for(const root of roots)link(r,root,'temporal-candidate',['interval']);
  }
 }
}
data.evidence={records,links,requests,batchSamples,tokenSamples,clock:'trace microseconds → milliseconds',scope:'trace:sha256:'+crypto.createHash('sha256').update(bytes).digest('hex'),deployment:{enabled:false,reason:'No verified physical worker-to-device mapping in this capture'}};
fs.writeFileSync(path.join(__dirname,'trace-data.js'),'window.SWIMLANE_DATA = '+JSON.stringify(data)+';\n');
fs.writeFileSync(path.join(__dirname,'trace-provenance.json'),JSON.stringify({source:path.basename(file),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),eventCount:raw.traceEvents.length,steps:steps.length,lanes:calls.length,laneIdentity:pids.map((pid,dev)=>({dev,pid})),mapping:{group:'chip.run args.inv',bind:'chip.run.bind',runner:'chip.run.runner_run',end:'chip.run end',origin:'earliest complete event; milliseconds',prefill:'batch_prefill temporal containment; may contain multiple invocations',worker:'step_id within Worker; temporal candidate across layers',scope:'complete multi-request capture; not a single request',lane:'sorted chip child process IDs; ordinal is not a verified physical device ID'},validation:{browser:'not run; visual acceptance reserved for user'}},null,2)+'\n');
console.log(steps.length+' invocation groups / '+calls.length+' lanes / '+batches.length+' prefill batches / '+outputs.length+' server outputs');
