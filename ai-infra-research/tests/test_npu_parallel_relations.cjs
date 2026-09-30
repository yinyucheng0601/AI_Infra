const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'patterns/npu-memory-atlas/index.html'),'utf8');
const approved=fs.readFileSync(path.join(root,'patterns/reviews/npu-memory-atlas-training-v10-2026-09-28/approved.html'),'utf8');
assert.strictEqual(source.split('<script>')[0].replace(/\/\* Config layout extension:[\s\S]*?\/\* End Config layout extension\. \*\/\n/,'').replace(/\.layer-atlas-embed[\s\S]*?<\/style>/,'</style>').replace(/<fieldset class="rank-spacing" id="parallel-config">[\s\S]*?<\/fieldset>/,''),approved.split('<script>')[0], 'Approved HTML and CSS changed');
const elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{value:id==='tensor'?'0':id==='speed'?'1':'',hidden:false,innerHTML:'',classList:{toggle(){}},attrs:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(){},focus(){},style:{},querySelectorAll(){return []},querySelector(){return null},getBoundingClientRect(){return {width:1400,height:900,top:id==='nav'?820:0}},options:[]});return elements.get(id)}
const ctx={location:{search:""},console,matchMedia:()=>({matches:true}),requestAnimationFrame(){},document:{getElementById:el,body:{classList:{toggle(){}}},querySelectorAll:()=>[],querySelector:()=>el('nav'),addEventListener(){}},URLSearchParams,window:{location:{search:''},addEventListener(){}}};vm.createContext(ctx);vm.runInContext(source.split('<script>')[1].split('</script>')[0],ctx);

vm.runInContext(`
playing=false;scope='all';
if(drawRelations()!=='')throw Error('overview must start without relations');
const expected={tp:[2,3],pp:[2,10],dp:[0,2,4,6],ep:[0,2],edp:[2,6]};
for(const dim of Object.keys(expected))if(JSON.stringify(parallelMembers(dim,2))!==JSON.stringify(expected[dim]))throw Error(dim+' group');
for(let rank=0;rank<16;rank++)for(const dim of Object.keys(expected)){
 const members=parallelMembers(dim,rank);
 if(!members.includes(rank))throw Error('missing self');
 for(const peer of members)if(JSON.stringify(parallelMembers(dim,peer))!==JSON.stringify(members))throw Error('asymmetric group');
 const edges=parallelEdges(dim,rank);
 if(edges.some(([a,b])=>a===b||!members.includes(a)||!members.includes(b)))throw Error('invalid edge');
 if(new Set(edges.map(([a,b])=>[a,b].sort((x,y)=>x-y).join(':'))).size!==edges.length)throw Error('duplicate edge');
}
pickRelationRank(2);
if(relationRank!==2||selectedRank!==2)throw Error('selection');
if((drawRelations().match(/data-relation=/g)||[]).length!==5)throw Error('edge count');
if(/NaN|undefined/.test(drawRelations()))throw Error('invalid relation geometry');
for(const dim of ['tp','pp','dp']){
 $('relations').value=dim;render();const focus=parallelFocus();
 if(!focus||focus.dim!==dim||!focus.members.has(2))throw Error('parallel mode focus');
 const svg=$('world').innerHTML;
 if(!svg.includes('rank-neutral')||!svg.includes('opacity="0.13"'))throw Error('missing neutral or dim state');
 if(!svg.includes('stroke="'+parallelColors[dim]+'"'))throw Error('missing shell color');
 if((drawRelations().match(/data-relation=/g)||[]).length!==parallelEdges(dim,2).length)throw Error('mode edge count');
}
$('relations').value='none';render();if(parallelFocus()!==null||$('world').innerHTML.includes('rank-neutral'))throw Error('hidden relation reset');
$('relations').value='tp';render();
$('relations').value='all';render();
if(JSON.stringify([...parallelFocus().members].sort((a,b)=>a-b))!==JSON.stringify([0,2,3,4,6,10]))throw Error('full linkage union');
if((drawParallelTags().match(/data-parallel-tag=/g)||[]).length!==8)throw Error('parallel coordinate tags');
if(focusedRankGeometry('CONTENTS',15,parallelFocus()).includes('CONTENTS'))throw Error('unrelated contents not hidden');
if(!focusedRankGeometry('CONTENTS',2,parallelFocus()).includes('stroke="#FFFFFF"'))throw Error('focus must be white');
selectParallelTag('pp',1);if(relationRank!==10)throw Error('PP tag');
selectParallelTag('tp',1);if(relationRank!==11)throw Error('TP tag');
selectParallelTag('dp',3);if(relationRank!==15)throw Error('DP tag');

for(let id=0;id<16;id++){
 relationRank=id;const focus=parallelFocus(),r=ranks[id];
 for(const b of ranks){
  const differing=['dp','tp','pp'].filter(k=>r[k]!==b[k]);
  if(focus.members.has(b.id)!==(differing.length<=1))throw Error('XYZ axis membership');
  if(differing.length===1&&focus.byRank[b.id]!==differing[0])throw Error('axis color overwritten');
 }
 if(/data-relation="(ep|edp)"/.test(drawRelations()))throw Error('non-axis overlay');
}
relationRank=selectedRank=2;
const old=relationAnchor(2,'tp');rankSpacing.x+=100;const moved=relationAnchor(2,'tp');rankSpacing.x-=100;
if(old[0]===moved[0])throw Error('anchor does not follow rank');
scope='single';if(drawRelations()!=='')throw Error('single rank overlay');scope='all';
pickRelationRank(2);if(relationRank!==null||drawRelations()!=='')throw Error('toggle clear');
`,ctx);
// Compare actual SVG produced by the approved and current Rank renderers.
const currentHandlers=new Map([...elements].map(([id,e])=>[id,{onclick:e.onclick,oninput:e.oninput}]));
const before=vm.createContext({...ctx});
vm.runInContext(approved.split('<script>')[1].split('</script>')[0],before);
for(const scope of ['single','all'])for(const mode of ['shard'])for(const labelMode of ['side','surface'])for(const rank of [0,2,8,15]){
 const code=`scope='${scope}';mode='${mode}';labelMode='${labelMode}';labels=true;playing=false;simTime=5000;$('tensor').value='3';setRankData(${rank});drawRank();`;
 assert.strictEqual(vm.runInContext(code,ctx).replace(/<title>[\s\S]*?<\/title>/g,''),vm.runInContext(code,before).replace(/<title>[\s\S]*?<\/title>/g,''),'Approved Rank SVG changed');
}
for(const [id,handlers] of currentHandlers)Object.assign(el(id),handlers);
console.log('PASS: approved HTML/CSS and 16 weight-shard rendering combinations unchanged; layered memory envelope intentionally updated; group membership, mode-specific edges, selection toggle and anchor tracking.');

vm.runInContext(`
scope='all';mode='explode';
function configure(c){for(const [k,v] of Object.entries(c))$('cfg-'+k).value=String(v);if(!applyParallelConfig())throw Error($('config-status').textContent);}
for(const world of [32,64,128,256,512]){
 configure({world,tp:4,pp:4,dp:world/16,ep:2,node:8,rack:64});
 if(ranks.length!==world)throw Error('world size');
 if((drawParallelTags().match(/data-parallel-tag=/g)||[]).length!==TP+PP+DP)throw Error('expanded tags');
 const slots=new Set();const counts={};
 for(const r of ranks){
  const p=physicalPlacement(r),key=[p.rack,p.node,p.slot].join(':');
  if(slots.has(key))throw Error('physical slot collision');slots.add(key);counts[p.rack]=(counts[p.rack]||0)+1;
  if(p.slot>=cardsPerNode||p.node>=cardsPerRack/cardsPerNode)throw Error('physical capacity');
  for(const [dim,count] of [['tp',TP],['pp',PP],['dp',DP]])if(parallelMembers(dim,r.id).length!==count)throw Error('expanded membership');
  for(const t of [0,3000,8000,28000,30500]){simTime=t;setRankData(r.id);applySimulation();if(cats.some(c=>!Number.isFinite(c.value)||c.value<-.00001)||Math.abs(cats.reduce((n,c)=>n+c.value,0)-64)>1e-6)throw Error('memory accounting');}
 }
 if(Object.values(counts).some(n=>n>64))throw Error('rack overflow');
 relationRank=world-1;$('relations').value='all';render();if(/NaN|undefined/.test($('world').innerHTML))throw Error('expanded geometry');
 if(parallelFocus().members.size!==TP+PP+DP-2)throw Error('expanded focus');
}
configure({world:96,tp:4,pp:4,dp:6,ep:1,node:8,rack:64});
if(new Set(ranks.map(r=>physicalPlacement(r).rack)).size!==2)throw Error('partial rack');
configure({world:16,tp:2,pp:2,dp:4,ep:2,node:8,rack:64});
const oldRanks=ranks;$('cfg-tp').value='3';if(applyParallelConfig()||ranks!==oldRanks)throw Error('non-atomic invalid input');$('cfg-tp').value='2';
if(!validateConfig({world:1,tp:1,pp:1,dp:1,ep:1,node:8,rack:64}))throw Error('OOM validation');
`,ctx);
console.log('PASS: 32–512 ranks, partial racks, unique physical placement, capacity, axis groups, memory accounting and invalid input rollback.');

vm.runInContext(`
$('cfg-dp').value='16';$('cfg-dp').oninput();if($('cfg-world').textContent!=='64'||configValues().world!==64)throw Error('derived world size');
zoom=2;pan=[150,-80];scope='single';
if(!applyParallelConfig())throw Error('apply');
if(scope!=='all'||zoom!==1||pan.some(Boolean)||!fitRequested||!settingsPanel.hidden)throw Error('apply must fit all ranks');
const fitted=$('world').attrs.transform;
$('plus').onclick();const enlarged=$('world').attrs.transform;
if(fitted===enlarged||zoom!==1.25)throw Error('zoom in ineffective');
render();if($('world').attrs.transform!==enlarged)throw Error('animation overwrote zoom');
$('minus').onclick();if($('world').attrs.transform!==fitted)throw Error('zoom out inverse');
for(let i=0;i<12;i++)$('plus').onclick();if(zoom<=2.5)throw Error('zoom capped too early for expanded ranks');
$('fit').onclick();if(zoom!==1||pan.some(Boolean)||$('world').attrs.transform!==fitted)throw Error('fit reset');
if(cardsPerRack!==64||configValues().rack!==64)throw Error('fixed rack constant');
`,ctx);
assert(!source.includes('id="cfg-rack"'),'rack must not be configurable');
assert(source.includes('class="config-grid"'),'multi-column fields');
console.log('PASS: fixed rack capacity, zoom buttons and persistence, inverse zoom, fit reset, auto-fit after applying from single view.');

vm.runInContext(`
for(const c of [{world:16,tp:2,pp:2,dp:4,ep:2,node:8},{world:128,tp:4,pp:4,dp:8,ep:2,node:8}]){
 configure(c);let min=1,max=0;
 for(const r of ranks)for(let t=0;t<=CYCLE_MS;t+=250){
  simTime=t;setRankData(r.id);applySimulation();const free=cats.at(-1).value/64;
  min=Math.min(min,free);max=Math.max(max,free);
  if(free<.1-1e-8||free>.3+1e-8)throw Error('free memory envelope');
  if(cats.some(c=>c.value<0)||Math.abs(cats.reduce((n,c)=>n+c.value,0)-64)>1e-6)throw Error('envelope conservation');
  if(cats[0].value!==params[r.id]*2/1e9||cats[2].value!==params[r.id]*12/1e9)throw Error('parameter accounting altered');
 }
 if(min>.101||max<.299)throw Error('memory must vary across full requested range');
}
`,ctx);
console.log('PASS: full-cycle 10–30% free memory, 64 GB conservation and unchanged weight/optimizer accounting at 16 and 128 ranks.');

assert(source.includes('<output id="cfg-world"'),'World Size must be read-only output');
assert(!source.includes('<input id="cfg-world"'),'World Size must not be an input');
