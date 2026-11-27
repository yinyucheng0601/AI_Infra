const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
global.window={};require('./trace-data.js');
const d=window.SWIMLANE_DATA,E=d.evidence,byId=new Map(E.records.map(r=>[r.id,r]));
const provenance=require('./trace-provenance.json');
E.scope ??= 'trace:sha256:'+provenance.sha256;
assert.equal(d.steps.length,32);assert.equal(new Set(d.steps.map(s=>s.id)).size,32);
assert.equal(E.requests.length,16);assert.equal(E.batchSamples.length,26);assert.equal(E.tokenSamples.length,24);
for(const r of E.requests){assert.ok(r.start<=r.queued&&r.queued<=r.end);assert.ok(r.eventIds.every(id=>byId.get(id).args.request_id===r.id));}
for(const link of E.links){
 const a=byId.get(link.from),b=byId.get(link.to);assert(a&&b);
 if(link.basis==='id-match'){
  for(const field of link.fields){
   if(field==='request_ids'||field==='request_id'){assert.ok(a.args.request_ids.includes(b.args.request_id));continue;}
   assert.notEqual(field in a?a[field]:a.args[field],undefined);
   assert.equal(field in a?a[field]:a.args[field],field in b?b[field]:b.args[field]);
  }
 }else if(link.basis==='same-thread-containment'){assert.equal(a.pid,b.pid);assert.equal(a.tid,b.tid);assert.ok(a.start<=b.start&&a.end>=b.end);}
 else assert.equal(link.basis,'temporal-candidate');
}
for(const s of d.steps){
 assert.equal(s.lanes.length,16);assert.ok(s.absoluteStart<s.absoluteEnd);
 for(const l of s.lanes)assert.ok(l.bindStart<=l.bindEnd&&l.bindEnd<=l.rrStart&&l.rrStart<=l.rrEnd&&l.rrEnd<=l.end+.001);
 for(const id of s.rawEventIds){const r=byId.get(id);assert.ok(r.args.run_id===s.invocation||r.args.inv===s.invocation);}
}
if(process.argv[2]){
 const bytes=fs.readFileSync(process.argv[2]),raw=JSON.parse(bytes);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),provenance.sha256);
 assert.equal(E.scope,'trace:sha256:'+provenance.sha256);
 const origin=Math.min(...raw.traceEvents.filter(event=>event.ph==='X').map(event=>event.ts));
 for(const r of E.records){
  const src=raw.traceEvents[Number(r.id.slice(4))];
  assert.equal(src.name,r.name);assert.equal(src.pid,r.pid);assert.equal(src.tid,r.tid);
  assert.deepEqual(src.args||{},r.args);
  assert.equal(r.start,Math.round(src.ts-origin)/1000);
  assert.equal(r.end,Math.round(src.ts+(src.dur||0)-origin)/1000);
 }
}
assert.equal(E.deployment.enabled,false);
console.log('PASS: 32 unique calls, 512 lanes, 16 lifecycles, 26 batch samples, 24 outputs, '+E.links.length+' verified-basis links; raw identity; physical mapping disabled');

require('./workbench.js');
const workbench=window.CriticalPathWorkbench;
const call={version:1,pattern:'critical-path-swimlane',layout:'investigation-workbench',axis:'trace-time',
 controls:{zoom:'required',inspector:'required',eventEvidence:'required',playback:'required'}};
assert.equal(workbench.resolve(d,call).controls.playback,true);
const invalid=(mutate,error)=>{
 const input=structuredClone(d);
 mutate(input);
 assert.throws(()=>workbench.resolve(input,call),error);
};
invalid(input=>delete input.evidence,/evidence.scope/);
invalid(input=>input.evidence.records.push(input.evidence.records[0]),/重复/);
invalid(input=>input.evidence.records[0].scope='trace:other-capture',/采集或时钟域/);
invalid(input=>input.evidence.records[0].clock='uncalibrated',/采集或时钟域/);
invalid(input=>input.evidence.links[0].to='raw-999999',/端点/);
invalid(input=>input.evidence.links[0].basis='causal',/关系类型/);
invalid(input=>input.evidence.links[0].fields=[],/原始依据/);
invalid(input=>input.steps[0].rawEventIds[0]='raw-999999',/不属于该调用组/);
assert.throws(()=>workbench.resolve(d,{...call,axis:'source-step'}),/axis/);
const incomplete=structuredClone(d);
incomplete.evidence.requests[0].end=null;
assert.equal(workbench.resolve(incomplete,call).trace,true);
require('./data.js');
const original=window.SWIMLANE_DATA;
assert.throws(()=>workbench.resolve(original,{...call,controls:{playback:'required'}}),/controls.playback/);
assert.deepEqual(workbench.resolve(original,{...call,controls:{playback:'optional'}}).omitted,['playback']);
console.log('PASS: evidence scope, endpoints, association basis, clock, legal unknown and invocation constraints');

if(process.env.AI_INFRA_DOM_CHECK==='1'){
 const {JSDOM}=require('jsdom');
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'file://'+__dirname+'/index.html',pretendToBeVisual:true});
 const w=dom.window,doc=w.document;
 let tick;
 w.setInterval=fn=>{tick=fn;return 1;};
 w.clearInterval=()=>{tick=null;};
 w.ResizeObserver=class { observe(){} disconnect(){} };
 w.matchMedia=()=>({matches:true});
 Object.defineProperties(w.Element.prototype,{clientWidth:{get:()=>1600},clientHeight:{get:()=>780}});
 for(const script of doc.scripts){
  if(!script.src.endsWith('liquid-glass.js')){
   w.eval(script.src?fs.readFileSync(new URL(script.src),'utf8'):script.textContent);
  }
 }
 const root=doc.querySelector('#workbench');
 assert.ok(w.swimlane,root.textContent);
 const $=selector=>root.querySelector(selector);
 const click=selector=>$(selector).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 const initial=JSON.stringify(w.swimlane.getState().range);
 let selected;
 root.addEventListener('trace-evidence-selection',event=>{selected=event.detail;});
 click('[data-event="raw-1110"]');
 assert.equal(selected.objectRef.scope,E.scope);
 assert.equal(selected.objectRef.id,'raw-1110');
 assert.equal($('.evidence-panel').dataset.eventId,'raw-1110');
 assert.ok($('.evidence-panel a').textContent.includes('raw-1110'));
 assert.match($('.evidence-panel').textContent,/Entry Skew.*Completion Skew.*Critical-path Impact：未确认/);
 assert.equal(selected.physicalMappingVerified,false);
 assert.ok(w.swimlane.getState().related.some(([id,basis])=>id==='raw-1269'&&basis==='id-match'));
 click('.panel-close');
 assert.equal(JSON.stringify(w.swimlane.getState().range),initial);
 assert.equal(w.swimlane.getState().selected,'raw-1110');
 click('[data-zoom="in"]');
 assert.notEqual(JSON.stringify(w.swimlane.getState().range),initial);
 click('[data-fit]');
 assert.equal(JSON.stringify(w.swimlane.getState().range),initial);
 click('[data-play]');assert.equal(w.swimlane.getState().playing,true);
 const first=w.swimlane.getState().step;
 tick();assert.notEqual(w.swimlane.getState().step,first);
 click('[data-play]');assert.equal(tick,null);
 w.swimlane.setStep(d.steps.at(-2).id);
 click('[data-play]');tick();assert.equal(w.swimlane.getState().step,d.steps.at(-1).id);
 assert.equal(w.swimlane.getState().playing,false);
 click('[data-play]');w.swimlane.setStep(d.steps[1].id);assert.equal(tick,null);
 click('[data-play]');
 const picker=doc.querySelector('#dataset');
 picker.value='original';picker.dispatchEvent(new w.Event('change'));
 assert.equal(tick,null);
 assert.ok(root.classList.contains('cps'));
 assert.ok(w.swimlane.omitted.includes('eventEvidence'));
 assert.equal($('[data-play]'),null);
 w.swimlane.setStep('D09');assert.equal(w.swimlane.getState().step,'D09');
 click('[data-lane="6"]');assert.equal($('.inspect-panel').hidden,false);
 assert.equal(w.swimlane.getState().selected,6);
 assert.match($('.inspector').textContent,/Host lane 6/);
 const legacyRange=JSON.stringify(w.swimlane.getState().range);
 click('[data-close-inspect]');assert.equal($('.inspect-panel').hidden,true);
 assert.equal(JSON.stringify(w.swimlane.getState().range),legacyRange);
 assert.equal(w.swimlane.getState().selected,6);
 picker.value='deepseek';picker.dispatchEvent(new w.Event('change'));
 assert.ok(root.classList.contains('ev'));
 assert.equal(w.swimlane.getState().selected,null);
 w.swimlane.destroy();assert.equal(root.children.length,0);
 dom.window.close();
 console.log('PASS: mounted both real datasets, selection and evidence, close/zoom/Fit, step playback, switch and destroy in DOM emulation');
}
