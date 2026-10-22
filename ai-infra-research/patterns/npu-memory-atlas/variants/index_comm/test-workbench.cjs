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
for(const file of ['../atlas-controls.js','../physical-rank-view.js','../atlas-runtime.js','approved-glyphs.js','compute-graph.js','rank-workbench.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
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
assert.notEqual(read('mode'),'comm');
const handoff=new URLSearchParams(ctx.window.location.href.split('#')[1]);assert.equal(handoff.get('rank'),'32');assert.equal(JSON.parse(handoff.get('config')).dense,12);
assert.equal(read('playing'),false);
console.log('PASS: full adapter mount, exact tensor allocation, Shared nodes, state cleanup, projection preservation and standalone communication handoff');

const graphHost=dom('operator-path'),surface=graphHost.querySelector('.cg-viewport > svg');
const box=()=>surface.getAttribute('viewBox').split(' ').map(Number);
const original=box();
for(const fn of graphHost.listeners.wheel)fn({target:{closest:()=>({})},deltaY:-100,deltaMode:0,clientX:700,clientY:900,preventDefault(){},stopPropagation(){}});
const magnified=box();assert(magnified[2]<original[2]);
assert(Math.abs(original[0]+original[2]*.5-magnified[0]-magnified[2]*.5)<1e-8);
graphHost.setPointerCapture=()=>{};graphHost.hasPointerCapture=()=>true;graphHost.releasePointerCapture=()=>{};
const blank={closest:s=>s==='.cg-viewport'?{}:null};
for(const fn of graphHost.listeners.pointerdown)fn({target:blank,button:0,pointerId:1,clientX:700,clientY:900,preventDefault(){}});
for(const fn of graphHost.listeners.pointermove)fn({pointerId:1,clientX:800,clientY:950});
assert(box()[0]<magnified[0]);assert(box()[1]<magnified[1]);
for(const fn of graphHost.listeners.pointerup)fn({pointerId:1});
console.log('PASS: graph wheel anchor and drag camera');

// OOM is the original local incident scene, independent from standalone communication.
W.setLayout('space');vm.runInContext("setAtlasMode('explode');playing=false",ctx);
const beforeOOM=ctx.window.location.href;vm.runInContext('epEventCache.clear()',ctx);
dom('ep-oom-mode').onclick();assert.equal(ctx.window.location.href,beforeOOM);
assert.equal(read('mode'),'comm');assert.equal(read('viewMode'),'Front');assert.equal(read('epIncidentActive'),true);assert.equal(read('epEventCache.size'),1,'OOM creates only the selected Rank group event');
assert.equal(dom('ep-oom-mode').attrs['aria-pressed'],'true');
vm.runInContext("setAtlasMode('explode');playing=false",ctx);assert.equal(read('epIncidentActive'),false);
console.log('PASS: OOM stays in the host, opens the original Front incident and restores the scene');

// Independent scope tabs preserve projection and the spatial camera contract.
ctx.AtlasControls.mountScope();
vm.runInContext("viewMode='Side';switchScope('all')",ctx);
dom('single').onclick();assert.equal(read('scope'),'single');assert.equal(read('viewMode'),'Side');
assert.equal(dom('single').attrs['aria-selected'],'true');assert(!('aria-pressed' in dom('single').attrs));
dom('all').onclick();assert.equal(read('scope'),'all');assert.equal(read('viewMode'),'Side');
console.log('PASS: independent scope tabs preserve projection and expose tab selection');

// Physical geometry keeps capacity fractions and separates shape from logical layout.
vm.runInContext("setRankLayout('physical');scope='single';viewMode='Side';selectedMemoryCategory=null;render()",ctx);
const physicalSize=read('({w:P(245,0,0)[0]-P(0,0,0)[0],d:P(0,155,0)[0]-P(0,0,0)[0],h:P(0,0,0)[1]-P(0,0,HBM*6.7)[1]})');
assert.equal(physicalSize.d/physicalSize.h,5.5);
vm.runInContext("viewMode='Front';render()",ctx);assert.equal(read('(P(245,0,0)[0]-P(0,0,0)[0])/(P(0,0,0)[1]-P(0,0,HBM*6.7)[1])'),2.5);
const memoryMarkup=read('drawRank()'),lengths=[...memoryMarkup.matchAll(/data-memory-length="([^"]+)"/g)].map(m=>+m[1]);
assert(Math.abs(lengths.reduce((a,b)=>a+b,0)-155)<1e-8);
const PLayout=require('./physical-layout.js');assert.deepEqual(PLayout.position(0,{thin:true,view:'Side'}),PLayout.position(1,{thin:true,view:'Side'}));
vm.runInContext("setRankLayout('parallel');viewMode='2.5D';render()",ctx);assert(!read('drawRank()').includes('data-memory-axis="depth"'));
console.log('PASS: physical front/side proportions, depth capacity conservation, coincident side columns and logical-layout isolation');

// Mount the actual communication and Glass hosts with the existing DOM fixture.
// This is a state regression, not browser visual verification.
function mountVariant(name,adapters,hash=''){
 const html=fs.readFileSync(path.join(__dirname,'..',name),'utf8');
 const sandbox={...ctx,window:{...ctx.window,location:{hash}},location:{search:''}};
 vm.createContext(sandbox);
 const main=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(t=>t.includes('function makeRanks'));
 vm.runInContext(main,sandbox,{filename:name});
 for(const file of ['atlas-controls.js',...adapters])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),sandbox,{filename:file});
 return {html,sandbox,read:source=>JSON.parse(JSON.stringify(vm.runInContext(source,sandbox)))};
}
const transferred={...require('./rank-model.js').baseline,dense:2,shared:1};
const communication=mountVariant('index_communication.html',['physical-rank-view.js','atlas-runtime.js','communication-controls.js'],'#'+new URLSearchParams({config:JSON.stringify(transferred),rank:'23',capacity:'7'}));
assert.equal(communication.read('atlasConfig.shared'),1);assert.equal(communication.read('relationRank'),23);assert.equal(communication.read('physicalRanksPerCabinet'),7);
assert.equal(communication.read('mode'),'comm');assert.equal(communication.read('playing'),false);
assert(!/NaN|undefined/.test(dom('world').innerHTML));
assert(!communication.html.includes('rank-workbench.js'));
assert(!communication.html.includes('rank-intro step 10 capabilities'));
const activeMarkup=communication.html.replace(/<template[\s\S]*?<\/template>/g,'');
for(const id of ['ep-playback','graph-query','parallel-config'])assert(!activeMarkup.includes('id="'+id+'"'));
vm.runInContext("viewMode='Front';fitCanvas();setRankLayout('physical')",communication.sandbox);
assert(!/NaN|undefined/.test(dom('world').innerHTML));
const glass=mountVariant('liquid-glass.html',['liquid-glass-controls.js']);
vm.runInContext("scope='single';selectedMemoryCategory=null;render()",glass.sandbox);const full=dom('world').innerHTML;
vm.runInContext("selectedMemoryCategory=0;render()",glass.sandbox);assert(dom('world').innerHTML.length<full.length);
vm.runInContext("selectedMemoryCategory=null;render()",glass.sandbox);assert.equal(dom('world').innerHTML,full);
console.log('PASS: communication handoff, optional component composition, physical layout and Glass category filtering');
