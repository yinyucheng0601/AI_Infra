const fs=require('fs'),vm=require('vm'),assert=require('assert');const ctx=vm.createContext({window:{},console});for(const f of ['graph-model.js','rank-pattern/planner.js','rank-model.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+f,'utf8'),ctx);
let cases=0;for(let step=0;step<9;step++)for(const tp of [1,2,4])for(const ep of [1,2,4])for(const experts of [4,8,16,32,64])for(const sp of [false,true]){
 const s=vm.runInContext(`trainingRankState(${step},${JSON.stringify({tp,ep,experts,sp,cache:'shard',ffn:'moe'})})`,ctx),c=s.config;
 assert.equal(c.worldSize,8);assert.equal(c.tp*c.dp,8);assert.equal(c.ep*c.expertDP,c.dp);
 assert.equal(s.ranks.length,step<4?0:8);
 if(step<4){assert.equal(s.groups.length,0);assert.equal(s.source,'logical-model');cases++;continue;}
 const ids=new Set(s.ranks.map(r=>r.id));assert.equal(ids.size,8);
 for(const r of s.ranks){
  assert.equal(r.tpGroup.length,c.tp);assert.equal(r.epPeers.length,c.ep);assert.equal(r.dpPeers.length,c.dp);assert.equal(r.expertDP.length,c.expertDP);
  assert(r.epPeers.every(id=>s.ranks[id].lane===r.lane&&s.ranks[id].replica===r.replica));assert(r.epPeers.every(id=>r.dpPeers.includes(id)));
  assert.equal(r.tokenRows.length,c.seq);assert(r.bands.every(b=>!('valueGB' in b)));assert(r.objects.every(o=>o.instanceId.startsWith('rank:'+r.id+'/')));assert(r.objects.every(o=>o.shape.every(v=>Number.isInteger(v)&&v>0)));
  assert.equal(r.experts.length,step===8?experts/c.ep:0);
 }
 if(step===7)assert.equal(s.pendingExperts.length,experts);
 if(step===8){assert.equal(new Set(s.ranks.flatMap(r=>r.experts)).size,experts);for(let e=0;e<experts;e++)assert.equal(s.ranks.filter(r=>r.experts.includes(e)).length,c.tp*c.expertDP);}
 cases++;
}console.log('PASS:',cases,'states: unmapped logical graph, fixed eight-Rank deployment, TP/DP/EP/EDP partitions and SP rows');

const bands=vm.runInContext("rankBandLayout(trainingRankState(8,{tp:4,ep:2,experts:64,sp:true,cache:'shard',ffn:'moe'}).ranks[0].bands)",ctx);assert(bands.at(-1).z+bands.at(-1).h<64*6.7);assert.equal(bands[0].h,100);console.log('PASS: Rank bands leave open headroom; no capacity normalization');
