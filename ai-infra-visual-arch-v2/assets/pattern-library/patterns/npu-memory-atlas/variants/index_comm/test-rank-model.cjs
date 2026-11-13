const assert=require('node:assert/strict');
const M=require('./rank-model.js');
const B={...M.baseline};
assert(M.validate(B).ok);
assert.equal(M.world(B),128);
assert.equal(M.parameters(23,B),M.groups(23,B).reduce((n,g)=>n+g[2],0));
for(const config of [B,{...B,cp:2},{...B,mode:'ortho',dp:2},{...B,dense:2,shared:1},{...B,tp:4,pp:8,ep:4,layers:64,experts:32,topk:4},{...B,pp:1,dp:8,layers:4}]){
 assert(M.validate(config).ok,JSON.stringify(config));
 for(let id=0;id<M.world(config);id++){
  const r=M.rank(id,config),[lo,hi]=M.bounds(id,config);
  assert.equal((r.pp*M.lanes(config)+r.dp)*config.tp+r.tp,id,'rank mapping invertible');
  assert(r.ep>=0&&r.ep<config.ep&&r.cp<config.cp);
  const layers=Array.from({length:hi-lo},(_,j)=>M.groups(id,config,lo+j));
  const grouped=M.groups(id,config);
  for(let i=0;i<grouped.length;i++){
   const extras=i===5&&r.pp===0?M.V*M.H/config.tp:i===6&&r.pp===config.pp-1?M.V*M.H/config.tp:i===7&&r.pp===config.pp-1?M.H:0;
   assert.equal(layers.reduce((n,gs)=>n+gs[i][2],0)+extras,grouped[i][2],'layer / rank accounting matches');
  }
  for(const t of [0,700,3200,config.ga*3500+1000,config.ga*3500+2100]){
   const m=M.memory(id,config,t);
   assert(m.values.every(v=>Number.isFinite(v)&&v>=0));
   assert(Math.abs(m.values.slice(0,7).reduce((a,b)=>a+b,0)-m.total)<1e-7);
   assert(Math.abs(m.total+m.values[7]-Math.max(config.hbm,m.total))<1e-7);
  }
 }
}
const ortho={...B,mode:'ortho',dp:B.dp/B.ep};
assert.equal(M.world(ortho),M.world(B));
for(let id=0;id<128;id++)assert.deepEqual(M.groups(id,B),M.groups(id,ortho),'EP notation does not change ownership');
const cp={...B,cp:2};assert.equal(M.world(cp),256);assert.equal(M.activation(cp),M.activation(B)/2);
assert.equal(M.parameters(23,{...B,hbm:32}),M.parameters(23,B),'card capacity never rewrites bytes');
assert(M.memory(23,{...B,hbm:32},0).overflow>0);
assert(M.activation({...B,mbs:2})>M.activation(B));
assert(!M.validate({...B,dp:4}).ok);assert(!M.validate({...B,pp:5}).ok);assert(!M.validate({...B,topk:65}).ok);
assert(!M.validate({...B,seq:8193,cp:2}).ok);assert(!M.validate({...B,node:7}).ok);
const fix=M.repair({...B,dp:4});assert(fix&&M.validate(fix).ok&&M.peak(fix)<=fix.hbm);
assert.equal(fix.dp,4,'repair preserves the requested DP');
console.log('PASS: Rank/Layer memory conservation, CP/EP mapping, configuration validation, capacity and linked repair');
