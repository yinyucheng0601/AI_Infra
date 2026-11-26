const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('node:assert/strict');
const base=__dirname,M=require('../index_comm/rank-model.js'),EP=require('./ep-model.js');
const ctx={RankAtlasModel:M,EPTeachingModel:EP};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(base,'model.js'),'utf8'),ctx);const T=ctx.TrainingModel;
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name);}
const configs=[M.baseline,{...M.baseline,cp:2,seq:64},{...M.baseline,mode:'ortho',dp:2,cp:2,seq:64},{...M.baseline,ep:1,topk:1},{...M.baseline,experts:8,topk:8,ep:4},{...M.baseline,dense:24}];
for(const [index,c] of configs.entries()){
 check('configuration '+index+' legal',()=>assert.ok(M.validate(c).ok));
 const id=M.world(c)-1,r=M.rank(id,c),layer=M.bounds(id,c)[0],members=Array.from(T.epMembers(c,id));
 check('independent EP group membership '+index,()=>{
  const expected=Array.from({length:M.world(c)},(_,id)=>id).filter(id=>{const q=M.rank(id,c);return q.pp===r.pp&&q.cp===r.cp&&q.tp===r.tp&&Math.floor(q.dpIndex/c.ep)===Math.floor(r.dpIndex/c.ep)});
  assert.deepEqual(members,expected);
 });
 check('layer transfer preserves lane coordinates '+index,()=>{const next=M.rank(T.rankForLayer(c,id,0),c);for(const k of ['tp','cp','dpIndex'])assert.equal(next[k],r[k]);assert.equal(next.pp,0)});
 const event=T.route(c,id,layer,1);
 check('routing conservation and normalized weights '+index,()=>{
  assert.deepEqual(Array.from(event.ids),members);
  for(let source=0;source<event.assignments.length;source++)for(let token=0;token<event.assignments[source].length;token++){
   const ids=event.assignments[source][token],weights=event.routingWeights[source][token];assert.equal(ids.length,c.topk);assert.equal(new Set(ids).size,c.topk);assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-10);
  }
  assert.equal(event.totalTokens,event.inputTokens*c.topk);
  assert.equal(event.localTokens+event.networkTokens,event.totalTokens);
  assert.equal(EP.reconstruction(event,1,id).complete,event.assignments[0].length);
 });
 check('ETP1 ownership and parameter accounting '+index,()=>{
  for(let e=0;e<c.experts;e++){
   const owners=Array.from(T.owners(c,id,e));assert.equal(owners.length,M.dpReplica(c)*c.cp*c.tp/c.ep);
   const target=T.representative(c,id,e);assert.ok(members.includes(target));assert.ok(owners.includes(target));
   owners.forEach(owner=>{const shard=M.parameterShard(c,owner,3);assert.ok(e>=shard.start&&e<shard.end);});
  }
  const expertParams=M.groups(id,c,Math.max(layer,c.dense))[3][2]+M.groups(id,c,Math.max(layer,c.dense))[4][2];
  assert.equal(expertParams,3*M.H*M.I*c.experts/c.ep);
 });
}
for(const file of ['model.js','training-clock.js','full-graph-source.js','full-graph-adapter.js','stack-face-source.js','stack-geometry-source.js','stack-rails.js','expert-layout.js','composition.js','rank-workbench.js','ep-model.js'])check('JS syntax '+file,()=>new vm.Script(fs.readFileSync(path.join(base,file),'utf8')));
const layoutScope={};vm.createContext(layoutScope);vm.runInContext(fs.readFileSync(path.join(base,'../../../training-graph/graph-layout.js'),'utf8')+'\n'+fs.readFileSync(path.join(base,'expert-layout.js'),'utf8'),layoutScope);
for(const count of [16,32,64])for(const ep of [1,2,4,8,16].filter(ep=>ep<=count))check('compact expert layout preserves ownership/non-overlap '+count+'/'+ep,()=>{const layout=layoutScope.layoutTrainingExperts(count,ep),cards=layout.cards;assert.equal(cards.length,count);assert.equal(new Set(cards.map(c=>c.id)).size,count);for(const c of cards){assert.equal(c.owner,Math.floor(c.id/(count/ep)));assert.ok(c.x-c.width/2>=-layout.halfWidth&&c.x+c.width/2<=layout.halfWidth);for(const other of cards){if(c.id>=other.id)continue;const overlapX=Math.min(c.x+c.width/2,other.x+other.width/2)-Math.max(c.x-c.width/2,other.x-other.width/2),overlapY=Math.min(c.y+c.height,other.y+other.height)-Math.max(c.y,other.y);assert.ok(overlapX<=0||overlapY<=0,'cards '+c.id+'/'+other.id);}}});
const host=fs.readFileSync(path.join(base,'../index_training.html'),'utf8');
check('HTML dependency closure',()=>{for(const m of host.matchAll(/(?:src|href)="([^"#]+)"/g)){const p=m[1].split('?')[0];if(/^(https?:|data:)/.test(p))continue;assert.ok(fs.existsSync(path.resolve(base,'..',p)),p);}});
check('original source files unchanged since extraction',()=>{const root=path.resolve(base,'../../../../..');for(const s of JSON.parse(fs.readFileSync(path.join(base,'provenance.json'))).sources){const crypto=require('crypto');assert.equal(crypto.createHash('sha256').update(s.revision?require('child_process').execFileSync('git',['show',s.revision+':'+s.path],{cwd:root,maxBuffer:64*1024*1024}):fs.readFileSync(path.join(root,s.path))).digest('hex'),s.sha256,s.path);}});
console.log(JSON.stringify({checks,passed:checks}));
