const vm=require('vm'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const M={...require('../index_comm/rank-model.js')},ctx={RankAtlasModel:M};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'training-clock.js'),'utf8'),ctx);const C=ctx.TrainingClock;
let ticks=0;for(const c of [M.baseline,{...M.baseline,layers:24,ga:2},{...M.baseline,cp:2,seq:64},{...M.baseline,mode:'ortho',dp:2,cp:2,seq:64}]){
 const total=c.ga*c.layers*2;
 for(let cursor=0;cursor<=total+1;cursor++){
  const time=C.time(c,cursor),s=C.state(c,time);assert.equal(s.cursor,cursor);
  if(cursor<total){const mb=Math.floor(cursor/(c.layers*2)),backward=Math.floor(cursor/c.layers)%2===1,layer=backward?c.layers-1-cursor%c.layers:cursor%c.layers;
   assert.equal(s.mb,mb);assert.equal(s.backward,backward);assert.equal(s.layer,layer);
   const rank=Math.floor(layer/(c.layers/c.pp))*M.lanes(c)*c.tp,local=M.memory(rank,c,time);assert.equal(local.layer,layer);assert.equal(local.active,s.phase);
  }else assert.equal(s.phase,cursor===total?'accumulate':'update');
  ticks++;
 }
}
console.log(JSON.stringify({passed:true,discreteCursorRoundTrips:ticks,checks:'all microbatches, both directions, all layers, PP/CP/ortho mapping and accumulation/update boundaries'}));
