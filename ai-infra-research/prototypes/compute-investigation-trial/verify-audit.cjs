const assert=require('node:assert/strict'),fs=require('node:fs'),M=require('./model.js');
const expected=[[[0,10,6,0],[3,13,6,12]],[[0,8,3,0],[1,9,3,5],[2,10,3,10],[0,22,15,0]],[]];
for(let i=0;i<M.expandConfigs.length;i++){
 const m=M.expand(M.expandConfigs[i]),r=M.auditExpand(m);
 assert.equal(r.logical.mismatches,0);assert.equal(r.logical.checked,m.size);
 assert.deepEqual(r.findings.map(f=>[f.start,f.end,f.sourceSize,f.position]),expected[i]);
 for(const f of r.findings){assert(f.position<m.size);assert.equal(f.status,'investigate');assert.equal(f.end-f.start,m.stages[f.stage].inner+7);assert.equal(f.deviceAccess,undefined);}
 assert.equal(r.deviceAccess,'unknown');
}
// A wrong stage grouping must produce a logical mismatch, not a green all-clear.
const broken=M.expand(M.expandConfigs[0]);broken.stages[0].repeat=3;assert(M.auditExpand(broken).logical.mismatches>0);
const e=JSON.parse(fs.readFileSync(__dirname+'/evidence.json')).sources.expand;
assert.equal(e.revision,'d5e06fa213468ad4f61f1151d37668f3fc5b9ce9');
assert(e.evidence.find(x=>x.id==='copy-request').text.includes('cur_elems + align_elems - 1'));
console.log('PASS: 3 configuration audits, 6 exact parameter envelopes, branch exclusion, injected stage mismatch, pinned source evidence. No device-access claim.');
