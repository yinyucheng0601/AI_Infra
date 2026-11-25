const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
global.window={};require('./trace-data.js');
const d=window.SWIMLANE_DATA,E=d.evidence,byId=new Map(E.records.map(r=>[r.id,r]));
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
 const bytes=fs.readFileSync(process.argv[2]),raw=JSON.parse(bytes),provenance=JSON.parse(fs.readFileSync(__dirname+'/trace-provenance.json'));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),provenance.sha256);
 for(const r of E.records){const src=raw.traceEvents[Number(r.id.slice(4))];assert.equal(src.name,r.name);assert.equal(src.pid,r.pid);assert.deepEqual(src.args||{},r.args);}
}
assert.equal(E.deployment.enabled,false);
console.log('PASS: 32 unique calls, 512 lanes, 16 lifecycles, 26 batch samples, 24 outputs, '+E.links.length+' verified-basis links; raw identity; physical mapping disabled');
