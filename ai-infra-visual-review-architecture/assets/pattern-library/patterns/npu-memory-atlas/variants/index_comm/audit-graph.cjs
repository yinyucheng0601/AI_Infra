// Read-only contract audit. A failure is an open issue, not an accepted snapshot.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const M = require('./rank-model.js');
const box = { RankAtlasModel: M };
vm.createContext(box);
for (const file of ['approved-glyphs.js', 'compute-graph.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), box);
const G = box.RankComputeGraph, B = {...M.baseline};
let failures = 0;
function check(name, fn) {
  try { fn(); console.log('PASS', name); }
  catch (error) { failures++; console.log('FAIL', name, error.message); }
}
check('Rank × Layer × category: local bytes and owned layer', () => {
  for (const c of [B, {...B, cp:2}, {...B, dense:2, shared:1}, {...B, dense:48}, {...B, mode:'ortho', dp:2}])
    for (let id=0;id<M.world(c);id++) for(let index=0;index<11;index++) {
      const w=G.weightSelection(c,id,null,index);
      if(!w) { assert.equal(M.groups(id,c)[index][2],0); continue; }
      const [lo,hi]=M.bounds(id,c);
      assert(w.layer>=lo&&w.layer<hi);
      assert.equal(w.bytes,M.groups(id,c,[5,6].includes(index)?null:w.layer)[index][2]*2);
      assert(w.shard.index>=0&&w.shard.index<w.shard.count);
    }
});
check('Embedding partitions rows of [V, H]',()=>assert.equal(G.weightSelection(B,0,null,5).shard.axis,'行'));
check('LM Head partitions columns of [H, V]',()=>assert.equal(G.weightSelection(B,96,null,6).shard.axis,'列'));
check('ETP1 expert replicas include TP copies',()=>{
  const actual=Array.from(G.bindings(B,23,0).comm['dp-gradient'].expertMembers);
  assert.deepEqual(actual,[6,7,22,23]);
});
check('Shared FFN selects its consumer',()=>assert(G.weightSelection({...B,shared:1},0,0,9).consumers.includes('shared')));
check('A selected Q tensor has a recoverable parameter-category index',()=>assert.equal(G.weightSelection(B,0,0,0).index,0));
check('Default aggregate Attention tensor targets all three parameter categories',()=>assert.deepEqual(Array.from(G.bindings(B,0,0).tensors['weight-attn'].target.indices),[0,1,2]));
check('PP communication enabled only at stage boundaries',()=>{
  assert(!G.bindings(B,0,0).comm['pp-forward'].enabled);
  assert(G.bindings(B,0,11).comm['pp-forward'].enabled);
  assert(!G.bindings(B,96,47).comm['pp-forward'].enabled);
});
check('Logical memory ranges conserve every local parameter',()=>{
 for(const c of [B,{...B,shared:2,dense:13},{...B,cp:2},{...B,mode:'ortho',dp:2}])for(let id=0;id<M.world(c);id++){
  const regions=M.parameterRegions(id,c);let offset=0;
  for(const r of regions){assert.equal(r.offset,offset);offset+=r.elements;}
  assert.equal(offset,M.parameters(id,c));
 }
});
check('Mixed Dense stages resolve only existing MoE layers',()=>{
 assert.equal(M.moeLayer(0,{...B,dense:2}),2);
 assert.equal(M.moeLayer(0,{...B,dense:12}),null);
 assert.equal(M.moeLayer(32,{...B,dense:12}),12);
});
check('Expert sync groups match EP identity across TP and CP',()=>{
 for(const c of [B,{...B,cp:2},{...B,mode:'ortho',dp:2}])for(const id of [0,23,M.world(c)-1]){
  const r=M.rank(id,c),members=G.bindings(c,id,M.bounds(id,c)[0]).comm['dp-gradient'].expertMembers;
  assert.equal(members.length,M.dpReplica(c)*c.cp*c.tp/c.ep);
  for(const peer of members){const p=M.rank(peer,c);assert.equal(p.pp,r.pp);assert.equal(p.ep,r.ep);}
 }
});
check('Activation gradients never select parameter-gradient allocation',()=>assert.equal(G.bindings(B,0,0).tensors.dz.category,null));
check('All weight consumers have connected graph nodes; rendering is pure',()=>{
 for(const c of [B,{...B,dense:2,shared:1}])for(const id of [0,1,23,96,127])for(let index=0;index<11;index++){
  const weight=G.weightSelection(c,id,null,index);if(!weight)continue;
  const binding=G.bindings(c,id,weight.layer),before=JSON.stringify(binding);
  const graph=G.render({...c,layer:weight.layer,weight,bindings:binding});
  assert.equal(JSON.stringify(binding),before);
  for(const key of weight.consumers)assert(graph.notes[key],`missing ${key}`);
  assert(!/NaN|undefined/.test(graph.html));
 }
});
check('Current upstream glyph renderer provenance',()=>{
 const crypto=require('node:crypto'),provenance=require('./glyph-provenance.json');
 for(const source of provenance.sources){const text=fs.readFileSync(path.resolve(__dirname,'../../../..',source.file),'utf8');
  for(const [name,hash] of Object.entries(source.functions)){
   const line=text.split('\n').find(line=>line.startsWith('function '+name+'('));
   assert(line);assert.equal(crypto.createHash('sha256').update(line).digest('hex'),hash,source.file+':'+name);
  }
 }
});
console.log(`${failures} open contract failures`);
process.exitCode=failures?1:0;
