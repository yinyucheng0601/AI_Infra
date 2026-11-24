const fs=require("fs"),vm=require("vm"),assert=require("assert"),path=require("path");
const root=process.argv[2]||__dirname,ctx=vm.createContext({window:{},console});
for(const f of ["canonical.js","content.js","graph-model.js","graph-layout.js","expert-glyph.js","training-graph.js","rank-pattern/planner.js","rank-model.js","deployment-model.js"])vm.runInContext(fs.readFileSync(path.join(root,f),"utf8"),ctx);
let count=0;
for(const tp of [1,2,4])for(const ep of [1,2,4].filter(e=>e<=8/tp))for(const experts of [4,8,16,32,64])for(let token=0;token<8;token++)for(const focus of [0,7])for(const mode of ["tp","cache","dispatch","return","dp","edp"]){
const p={tp,ep,experts,token,sp:true,cache:"shard",ffn:"moe"};
const s=vm.runInContext(`trainingDeploymentState(${JSON.stringify(p)},${focus},${JSON.stringify(mode)})`,ctx);
assert.equal(s.placement.length,8);assert.equal(new Set(s.placement.map(p=>p.device)).size,8);assert.equal(s.config.ep,ep);
const r=s.ranks[focus];for(const e of s.edges){assert(s.members.includes(e.from)&&s.members.includes(e.to));if(!["tp","cache","dp","edp"].includes(mode)){const dest=mode==="dispatch"?e.to:e.from;assert(e.experts.every(id=>s.ranks[dest].experts.includes(id)));assert.equal(s.ranks[e.from].lane,s.ranks[e.to].lane);assert.equal(e.local,e.from===e.to);}}
if(["tp","cache","dp","edp"].includes(mode))assert.equal(s.edges.length,s.members.length*(s.members.length-1)/2);else assert.equal(s.edges.flatMap(e=>e.experts).length,2);
count++;
}
const unchanged=["canonical.js","content.js","graph-model.js","graph-layout.js","graph-renderer.js","expert-glyph.js","training-graph.js","secondary.js","rank-model.js","rank-view.js","demo.css","design-tokens.css","layer-stack-progress.css","rank-pattern/planner.js","rank-pattern/memory-geometry.js"];
if(process.env.TRAINING_BASELINE)for(const f of unchanged)assert(fs.readFileSync(path.join(root,f)).equals(fs.readFileSync(path.join(process.env.TRAINING_BASELINE,f))),f+" changed");
console.log("PASS",count,"deployment states: group closure, 8 unique devices, expert ownership, same-lane dispatch/return, local route, TP pairs");
if(process.env.TRAINING_BASELINE)console.log("PASS",unchanged.length,"existing model/render/style assets byte-identical to baseline");
