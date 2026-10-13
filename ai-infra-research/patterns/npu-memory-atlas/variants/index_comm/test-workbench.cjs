// Mount the real host plus adapters; this verifies state, not browser layout.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {ctx,element,read,nodes}=require('./test-ep.cjs');
let serial=0;
const context=new Proxy({measureText:s=>({width:String(s).length*7})},{get:(o,k)=>o[k]??(()=>{})});
function dom(id){
 const e=element(id);if(e.mounted)return e;e.mounted=true;e.listeners={};
 e.append=e.appendChild=(...children)=>children.forEach(c=>{nodes.set(c.id,c);c.parentElement=e;});
 e.before=e.after=e.remove=()=>{};e.closest=()=>e;
 e.querySelector=s=>dom(id+':'+s);e.querySelectorAll=()=>[];
 e.addEventListener=(type,fn)=>(e.listeners[type]??=[]).push(fn);
 e.getContext=()=>context;e.style.setProperty=()=>{};
 return e;
}
for(const id of nodes.keys())dom(id);
Object.assign(ctx,{innerWidth:1400,innerHeight:900,devicePixelRatio:1,ResizeObserver:class{observe(){}}});
ctx.document.createElement=tag=>dom(tag+'-'+serial++);
ctx.document.getElementById=dom;ctx.document.querySelector=s=>dom(s);
ctx.document.body.append=e=>nodes.set(e.id,e);
vm.runInContext("setAtlasMode('explode');playing=false;selectedRank=relationRank=23;viewMode='2.5D'",ctx);
for(const file of ['approved-glyphs.js','compute-graph.js','rank-workbench.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const W=ctx.window.RankWorkbench;
function clickNode(key){const target={dataset:{cgNode:key},closest:s=>s==='[data-cg-node]'?target:null};for(const fn of dom('graph-query').listeners.click||[])fn({target});}
dom('graph-mode').onclick();assert(W.snapshot().query);
const before=read('({viewMode,scope,mode,pan,zoom})');
clickNode('dp-gradient');assert.deepEqual(read('({viewMode,scope,mode,pan,zoom})'),before);
assert(dom('query-note').textContent.includes('R6'));
clickNode('weight-attn');assert.deepEqual(read('selectedMemoryTarget.indices'),[0,1,2]);
assert(dom('world').innerHTML.includes('data-memory-target="23:0:0"'));
assert.equal(W.snapshot().view,'2.5D');
clickNode('dz');assert.equal(read('selectedMemoryTarget'),null);assert.equal(read('selectedMemoryCategory'),null);
W.select(96,47);assert.equal(read('selectedMemoryTarget'),null);
clickNode('weight-head');assert.deepEqual(read('selectedMemoryTarget.indices'),[6]);
assert(dom('world').innerHTML.includes('data-memory-target="96:null:6"'));
assert(W.applyConfig({dense:2,shared:1},true));W.select(0,2);
assert(dom('operator-path').innerHTML.includes('data-cg-node="shared"'));
clickNode('weight-shared');assert.deepEqual(read('selectedMemoryTarget.indices'),[9]);
dom('query-op').value='router';dom('query-op').oninput();assert(!dom('query-note').textContent.includes('关联 Rank：'));
dom('query-op').value='';dom('query-op').oninput();
W.setLayout('flat');const flat=W.snapshot();clickNode('tp-attn');assert.equal(W.snapshot().layout,flat.layout);assert.deepEqual(W.snapshot().flat,flat.flat);
assert(W.applyConfig({dense:12},true));W.select(0,0);vm.runInContext("setAtlasMode('comm')",ctx);assert.notEqual(read('mode'),'comm');
W.select(32,12);vm.runInContext("setAtlasMode('comm');seekEPStage(.3)",ctx);
assert.equal(W.snapshot().memory.communication,read('epEventAt(simTime,selectedRank).rank.bufferBytes/1e9'));
console.log('PASS: full adapter mount, exact tensor allocation, Shared nodes, state cleanup, projection preservation and event buffer ledger');
