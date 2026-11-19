const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx=vm.createContext({window:{},console});
for(const f of ['canonical.js','content.js','graph-model.js','graph-layout.js','training-graph.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+f,'utf8'),ctx);
vm.runInContext("let current=0;const parameterState={tp:4,sp:true,cache:'shard',ffn:'moe',ep:2,token:0}",ctx);
let count=0;
for(let stage=0;stage<9;stage++)for(const tp of [1,2,4])for(const sp of [false,true])for(const ffn of ['dense','moe'])for(const ep of [1,2,4]){
 const result=vm.runInContext(`current=${stage};Object.assign(parameterState,${JSON.stringify({tp,sp,ffn,ep})});registry={};constOutput=trainingGraph();({markup:constOutput,model:graphModel,registry})`,ctx);
 assert.equal(result.model.snapshot.schema,'training-graph.v1');assert.equal(result.model.snapshot.nodes.length,Object.keys(result.registry).length);assert.equal(result.model.snapshot.config.worldSize,result.model.tp*result.model.ep);
 assert(!/NaN|undefined/.test(result.markup),`invalid SVG stage ${stage}`);
 for(const [id,node] of Object.entries(result.registry))assert(node.audited&&node.docs.length,`metadata ${id}`);
 for(const e of result.model.edges)assert(result.registry[e.from]&&result.registry[e.to],`edge ${e.id}`);
 if(stage===7&&ffn==='moe'){assert(!/来源组 0|Rank \{|Dispatch · All-to-All/.test(result.markup),'deployment labels leaked into structure stage');}
 if(stage>=7&&ffn==='moe'){
  const experts=[0,1,2,3].map(e=>result.model.positions['moe-e'+e+'-fc1']);assert(experts.every(n=>n.y===experts[0].y),'experts must share one row');assert(experts.every((n,i)=>!i||n.x>experts[i-1].x),'expert order must persist');assert(result.model.focusBounds,'FFN focus required');
  assert(!result.registry['full-f-fc1'],'dense FFN leaked');
  for(let e=0;e<4;e++)assert(result.registry['moe-e'+e+'-fc1']);
  assert(result.model.sp||tp===1||stage===7||ep===1,'SP requirement');
  assert.equal((result.markup.match(/data-expert=/g)||[]).length,4);
 }
 count++;
}
console.log('PASS:',count,'graph configurations: metadata, edge references, shapes, expert count, Dense exclusion and TP+EP constraints');

for(let t=0;t<8;t++){const route=vm.runInContext('moeRoute('+t+')',ctx);assert.equal(route.chosen.length,2);assert.equal(new Set(route.chosen).size,2);assert(Math.abs(route.alpha.reduce((a,b)=>a+b,0)-1)<1e-12);assert(route.scores[route.chosen[0]]>=route.scores[route.chosen[1]]);assert.equal(route.input.length,8);}console.log('PASS: reused router values, stable top-2, normalized coefficients and H=8 inputs');

assert.deepEqual(Array.from({length:4},(_,t)=>Array.from(vm.runInContext('moeRoute('+t+').chosen',ctx))),[[0,2],[1,3],[0,1],[2,3]]);console.log('PASS: reference report token-to-expert mapping');
