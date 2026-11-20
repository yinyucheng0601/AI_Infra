// CPU checks for source-derived page loops and configured execution mapping.
// Does not assert device execution, physical page mapping or visual acceptance.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../inference-layer-stack.html'),'utf8');
const model=html.split('/* EXECUTION_MODEL_START')[1].split('/* EXECUTION_MODEL_END */')[0];
const context={};vm.createContext(context);
vm.runInContext('/* EXECUTION_MODEL_START'+model+'\nglobalThis.model=PAExecution;',context);
const adapter=context.model;
for(const [length,pages,stacks] of [[1,1,1],[128,1,1],[129,2,1],[512,4,1],[513,5,2],[1025,9,3],[3584,28,7]]){
 const tile=adapter.partition(length);
 assert.equal(tile.pages.length,pages);assert.equal(tile.stacks.length,stacks);
 assert.equal(tile.pages.reduce((n,p)=>n+p.validTokens,0),length);
 assert.equal(tile.pages.at(-1).end,length-1);
 assert.deepEqual(Array.from(tile.stacks.flatMap(s=>s.pages).map(p=>p.id)),Array.from({length:pages},(_,i)=>i));
}
const make=(rank=0,call=1,layer=7)=>adapter.build({model:'qwen',rank,call,layer,length:1025});
const data=make(),ids=data.blocks.flatMap(b=>b.tasks.map(t=>t.uid));
assert.equal(data.tasks.length,64);assert.equal(data.blocks.length,24);
assert.equal(new Set(ids).size,64);assert.equal(ids.length,64);
data.blocks.forEach(b=>b.tasks.forEach(t=>assert.equal(t.id%24,b.id)));
const counts=data.tasks[0].counts;
assert.equal(counts.qk.count,9);assert.equal(counts.pv.matmul,3);assert.equal(counts.pv.matmulAcc,6);
assert.equal(counts.softmax.count,3);assert.equal(counts.accumulate.count,3);
assert.equal(counts.normalize.count,1);assert.equal(counts.fifo.count,5);
assert.equal(data.tasksForPage(0,8).length,4);assert.equal(data.tasksForPage(0,9).length,0);
assert.notEqual(make(1).tasks[0].uid,data.tasks[0].uid);
assert.notEqual(make(0,2).tasks[0].uid,data.tasks[0].uid);
assert.notEqual(make(0,1,8).tasks[0].uid,data.tasks[0].uid);
assert.equal(make(1).tasks[0].head,4);assert.equal(data.provenance,'user-authorized-mock');
const layoutSource=html.split('/* TASK_LAYOUT_START:')[1].split('/* TASK_LAYOUT_END */')[0];
vm.runInContext('/* TASK_LAYOUT_START:'+layoutSource+'\nglobalThis.layout=PATaskLayout;',context);
for(const config of [{batch:16,kvHeads:8,blocks:24},{batch:16,kvHeads:4,blocks:24},{batch:9,kvHeads:3,blocks:5}]){
 const layout=context.layout.createLayout(config),count=config.batch*config.kvHeads;
 assert.equal(layout.sources.length,count);assert.equal(layout.targets.length,count);
 assert.equal(new Set(Array.from(layout.assignments.flat())).size,count);
 layout.assignments.forEach((ids,block)=>ids.forEach(id=>assert.equal(id%config.blocks,block)));
 layout.sources.forEach((source,id)=>{
  assert.equal(source.x,layout.targets[id].x);
  assert.ok(layout.targets[id].h>0);
 });
}
const segments=context.layout.sequenceSegments(513,70,7,512);
assert.equal(segments[0].fraction,1);assert.equal(segments[1].fraction,1/512);assert.equal(segments[2].fraction,0);
console.log('PASS: page/stack boundaries, task partition, count units, reverse lookup and context isolation');

// Full Task topology must match the source construction for both short and long sequences.
context.window=context;
const schema=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('Full PA semantic schema'));
vm.runInContext(schema,context);
const taskSource=html.split('/* TASK_SOURCE_MODEL_START:')[1].split('/* TASK_SOURCE_MODEL_END */')[0];
vm.runInContext('/* TASK_SOURCE_MODEL_START:'+taskSource+'\nglobalThis.makeTaskGraph=sourceTaskModel;',context);
let previous;
for(const length of [128,1025,3584]){
 const task=adapter.build({model:'qwen',rank:0,call:0,layer:1,length}).tasks[0];
 const {graph}=context.makeTaskGraph(task);
 assert.equal(graph.nodes.length,17);
 for(const id of ['partial','m','l','rescale','o'])assert.ok(graph.nodes.some(n=>n.id===id));
 assert.equal(graph.synchronizations.length,3);
 for(const [a,b] of [['m','softmax'],['l','softmax'],['rescale','rescale'],['rescale','context-acc'],['o','context-acc'],['l','output-norm'],['o','output-norm']])assert.ok(graph.edges.some(e=>e.s===a&&e.t===b));
 const identity=Array.from(graph.edges.map(e=>e.id)).sort().join('|');
 if(previous)assert.equal(identity,previous);previous=identity;
}
console.log('PASS: source Task graph has all 17 nodes, state feedback and three synchronization definitions at every sequence length');
