const assert=require('node:assert/strict');
const M=require('./rank-model.js');
for(const c of [{...M.baseline},{...M.baseline,dense:48},{...M.baseline,shared:2}]){
 const seen=new Set();
 for(let t=0;t<c.ga*3500+3000;t+=.5){
  const run=M.execution(32,c,t),mem=M.memory(32,c,t),[lo,hi]=M.bounds(32,c);
  assert(run.progress>=0&&run.progress<1);
  if(!run.keys.length){assert.equal(run.layer,null);continue;}
  assert(run.layer>=lo&&run.layer<hi);seen.add(run.label);
  if(mem.active!=='update')assert.equal(run.layer,mem.layer);
  assert.deepEqual(run.categories,mem.active==='forward'?[0]:mem.active==='backward'?[0,1]:[0,1,2]);
  if(run.layer<c.dense)assert(!run.keys.some(k=>['experts','router','dispatch','combine','shared'].includes(k)));
  if(!c.shared)assert(!run.keys.includes('shared'));
 }
 assert(seen.has('前向')&&seen.has('参数更新')&&seen.has('Q / KV 参数梯度'));
}
console.log('PASS: operator schedule follows layer clock; forward/backward/update, Dense/MoE/shared and category boundaries');
