const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const M=require('./ep-model.js');

assert.equal(M.baseline.tp*M.baseline.pp*M.baseline.dp,128);
assert.deepEqual(M.members(0,1,1),[17,19,21,23,25,27,29,31]);
assert.deepEqual(M.expertReplicas(23),[6,7,22,23]);
const seen=new Set();
for(let p=0;p<4;p++)for(let d=0;d<2;d++)for(let t=0;t<2;t++)for(const id of M.members(p,d,t)){assert(!seen.has(id));seen.add(id);}
assert.equal(seen.size,128);
const single=M.event({edp:0,tp:0,config:{...M.baseline,ep:1}});
assert.equal(single.networkTokens,0);assert.equal(single.localTokens,65536);
assert.equal(M.frame(single,.3).ranks[0].bufferBytes,0);
for(const hot of [false,true])for(const layer of [0,7,47])for(const microbatch of [0,7]){
  const e=M.event({hot,layer,mb:microbatch});
  for(const row of e.matrix){assert.equal(row.reduce((a,b)=>a+b,0),65536);assert(row.every(Number.isInteger));}
  assert.equal(e.totalTokens,524288);
  for(const routes of e.assignments){
    assert.equal(routes.length,8192);
    for(const chosen of routes){assert.equal(chosen.length,8);assert.equal(new Set(chosen).size,8);assert(chosen.every(j=>j>=0&&j<64));}
  }
  e.expertMatrix.forEach((counts,s)=>{
    const recomputed=Array(64).fill(0);e.assignments[s].flat().forEach(j=>recomputed[j]++);
    assert.deepEqual(counts,recomputed,'expert load comes from token routes');
    for(let d=0;d<8;d++)assert.equal(e.matrix[s][d],counts.slice(d*8,d*8+8).reduce((a,b)=>a+b,0));
    assert(new Set(counts).size>1,'expert loads are not forced equal');
  });
  assert.equal(e.networkTokens+e.localTokens,e.totalTokens);
  assert.equal(e.dispatchBytes,e.networkTokens*4096*2);
  assert.deepEqual(e.matrix,M.event({hot,layer,mb:microbatch,tp:0}).matrix,'TP replicas route identically');
  for(const t of [0,.16,.3,.44,.6,.7,.85,1]){
    const f=M.frame(e,t);
    assert(f.ranks.every(r=>r.bufferBytes>=0&&r.activationBytes>=0));
    for(const r of f.ranks){assert(r.received<=r.remoteIn);assert(r.returned<=r.remoteOut);}
    if(f.phase.id==='compute'||t===1||t===0)assert(f.ranks.every(r=>r.bufferBytes===0));
  }
  const finished=M.frame(e,1);
  for(const r of finished.ranks){assert.equal(r.returned+r.local,65536,'all source tokens get their output back');assert.equal(r.held,0);}
  assert.equal(finished.ranks.reduce((a,r)=>a+r.received,0),e.networkTokens);
  if(hot){const input=M.frame(e,.44).ranks.map(r=>r.expertTokens);assert(input[3]>input[0]*2);}
}
// Compile every inline script; verify external resources without fetching anything.
const htmlPath=path.join(__dirname,'../index_comm.html'),html=fs.readFileSync(htmlPath,'utf8');
for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
  const src=match[1].match(/src="([^"]+)"/);
  if(src)assert(fs.existsSync(path.resolve(path.dirname(htmlPath),src[1])),'missing '+src[1]);
  else new vm.Script(match[2]);
}
// Run legacy scene code against a minimal DOM fixture: catches missing controls,
// NaN geometry and group regressions without claiming browser visual coverage.
const nodes=new Map();
function element(id){
  if(!nodes.has(id))nodes.set(id,{id,value:id==='tensor'?'0':'',hidden:false,innerHTML:'',children:[],dataset:{},style:{},attrs:{},classList:{toggle(){},add(){},remove(){}},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]||'';},addEventListener(){},focus(){},querySelectorAll(){return [];},querySelector(){return id==='ep-token-legend'?{innerHTML:''}:null;},getBBox(){return {x:0,y:0,width:1400,height:900};},getBoundingClientRect(){return {width:1400,height:900,top:820,left:0};}});
  return nodes.get(id);
}
const ctx={console,URLSearchParams,location:{search:''},localStorage:{getItem(){return null;}},matchMedia:()=>({matches:true}),requestAnimationFrame(){},getComputedStyle:()=>({getPropertyValue(){return '';}}),document:{getElementById:element,documentElement:{dataset:{},classList:{add(){}}},body:{dataset:{},classList:{toggle(){}}},activeElement:null,querySelectorAll:()=>[],querySelector:()=>element('nav'),addEventListener(){}},window:{location:{search:''},addEventListener(){}}};
ctx.EPTeachingModel=M;
vm.createContext(ctx);
const legacy=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function makeRanks'));
vm.runInContext(legacy,ctx);
const read=source=>JSON.parse(JSON.stringify(vm.runInContext(source,ctx)));
assert.equal(read('worldSize'),128);
assert.deepEqual(read('parallelMembers("ep",23)'),[17,19,21,23,25,27,29,31]);
assert.deepEqual(read('parallelMembers("edp",23)'),[6,7,22,23]);
assert.equal(read('shardOwnership(3,22).key'),read('shardOwnership(3,23).key'),'ETP1 expert weight identity shared across TP');
assert.notEqual(read('shardOwnership(0,22).key'),read('shardOwnership(0,23).key'),'attention stays TP sharded');
assert.equal(read('validateConfig({tp:2,pp:4,dp:16,ep:8,node:8,world:128,rack:64})'),'');
for(const dim of ['tp','pp','ep','dp','edp']){
  element('relations').value=dim;
  vm.runInContext('relationRank=selectedRank=23;render()',ctx);
  assert(!/NaN|undefined/.test(element('world').innerHTML),'invalid geometry/label '+dim);
  assert.equal(read('parallelFocus().members.size'),read('parallelMembers("'+dim+'",23).length'));
}
assert.equal(read('rankGroups(23)[3][2]'),12*2*4096*2048*8);
assert.equal(read('simulationState(27999,23).mb'),8);

// The memory block fraction and logical matrix partition are different units.
assert.equal(read('shardSpec(0,23).fraction'),.5);
assert.equal(read('shardSpec(0,23).shape'),'4096 × 2048');
assert.equal(read('shardSpec(1,23).shape'),'2 × (4096 × 512)');
assert.equal(read('shardSpec(2,23).axis'),'rows');
assert.equal(read('shardSpec(2,23).shape'),'2048 × 4096');
assert.equal(read('shardSpec(3,23).fraction'),1/8);
assert.equal(read('shardSpec(3,23).shape'),'2 × (4096 × 2048) / 专家');
assert.equal(read('shardSpec(3,23).replicas'),4);
assert(read('shardSpec(3,23).identity').includes('E24–E31'));
assert.equal(read('shardSpec(5,23).axis'),'rows');
assert.equal(read('shardSpec(6,119).axis'),'columns');
assert.equal(read('shardSpec(6,23).fraction'),0,'head absent before final PP');
assert.equal(read('shardSpec(7,23).fraction'),1);
assert.equal(read('shardSpec(7,23).local'),24*4096);
assert.equal(read('shardSpec(7,119).copies'),25);
assert.equal(read('shardSpec(8,23).replicas'),32);
assert(read('shardMenuLabel(3)').includes('EP8 / ETP1'));
assert(!read('shardMenuLabel(3)').includes('×2'));
assert(!html.includes('shard-tip')&&!html.includes('showShardTip'),'shard tooltip removed');
assert.deepEqual(read('shardGeometry(0,23,240,160)'),{axis:'columns',parts:2,part:1,fraction:.5,x:120,y:0,w:120,d:160});
assert.deepEqual(read('shardGeometry(2,23,240,160)'),{axis:'rows',parts:2,part:1,fraction:.5,x:0,y:80,w:240,d:80});
assert.deepEqual(read('shardGeometry(3,23,240,160)'),{axis:'experts',parts:8,part:0,fraction:1,x:0,y:0,w:240,d:160});
for(const i of [7,8])assert.deepEqual(read(`shardGeometry(${i},23,240,160)`),{axis:'copy',parts:1,part:0,fraction:1,x:0,y:0,w:240,d:160});
vm.runInContext(`(()=>{const old={TP,PP,DP,EP,worldSize,ranks};TP=4;PP=8;DP=8;EP=4;worldSize=256;ranks=makeRanks();
 if(shardSpec(0,23).shape!=='4096 × 1024'||shardSpec(3,23).copies!==96||shardSpec(3,23).replicas!==8||shardSpec(3,23).parts!==4)throw Error('config-dependent shard metadata');
 ({TP,PP,DP,EP,worldSize,ranks}=old);})()`,ctx);
vm.runInContext(`(()=>{const old={mode,scope,playing,labels,labelMode,renderRank,selectedRank,tensor:$('tensor').value};mode='shard';scope='single';playing=false;labels=true;labelMode='side';setRankData(23);$('tensor').value='7';const svg=drawShards();
 if((svg.match(/data-shard-detail=/g)||[]).length!==8||/NaN|undefined/.test(svg))throw Error('shard hover geometry');
 const heights=[...svg.matchAll(/data-memory-height="([^"]+)"/g)].map(m=>+m[1]);
 if(heights.length!==4||heights.some(h=>h>.01))throw Error('small Norm cannot fill Rank');
 for(let i=0;i<9;i++){$('tensor').value=String(i);const output=drawShards();for(const m of output.matchAll(/data-local-gb="([^"]+)" data-memory-height="([^"]+)"/g)){if(Math.abs(+m[2]-(+m[1])*6.7)>1e-8)throw Error('local bytes height scale');}}
 ({mode,scope,playing,labels,labelMode,renderRank,selectedRank}=old);$('tensor').value=old.tensor;setRankData(selectedRank);})()`,ctx);
console.log('PASS: TP/EP/ETP partition specs, replicas, PP presence, small Norm bytes, hover targets and configuration changes');

const baseline=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const variantCSS=html.match(/<style>([\s\S]*?)<\/style>/)[1];
const tokenLegendRule=/\.ep-token-legend\{[^\n]+\n/;
const darkPaletteRule=/\/\* Dark surface palette override\.[\s\S]*?\/\* End dark surface palette override\. \*\/\n/;
assert.equal(variantCSS.replace(tokenLegendRule,'').replace(darkPaletteRule,''),baseline.match(/<style>([\s\S]*?)<\/style>/)[1],'approved CSS unchanged outside token legend and requested dark palette');
const allVariantCSS=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
assert(allVariantCSS.includes('background:#151515'));
assert(allVariantCSS.includes('background-color:#000000!important'));
assert(!html.includes('ep-view.css')&&!html.includes('ep-view.js'),'standalone UI disconnected');
element('relations').value='ep';
for(const [t,phase] of [[0,'route'],[90,'dispatch'],[170,'compute'],[260,'combine']]){
 vm.runInContext(`viewMode='Top';scope='all';relationRank=selectedRank=23;simTime=${t};render()`,ctx);
 assert.equal(read(`epEventAt(${t},23).frame.phase.id`),phase);
 const svg=element('world').innerHTML;
 assert.equal((svg.match(/data-ep-route=/g)||[]).length,7);
 assert(!/NaN|undefined/.test(svg));
 assert.equal(read(`simulationState(${t},23).ep`),read(`epEventAt(${t},23).rank.bufferBytes/1e9`));
 if(phase==='dispatch')assert(svg.includes('data-ep-route="23-17"'));
 if(phase==='combine')assert(svg.includes('data-ep-route="17-23"'));
 assert.equal((svg.match(/data-ep-token-experts=/g)||[]).length,phase==='compute'?8:7,'source follows token order outside compute');
 assert.equal((svg.match(/data-expert-id=/g)||[]).length,phase==='compute'?64:56,'expert labels only on expert tensors');
 assert.equal((svg.match(/data-ep-source-tokens=/g)||[]).length,phase==='compute'?0:1);
 assert(!svg.includes('data-buffer='),'no buffer panels in rank top');
 assert(!svg.includes('data-ep-grid="true"'),'no semantic switch to token grid');
}
assert.equal(read('epEventAt(300,23).rank.bufferBytes'),0);
vm.runInContext("viewMode='Front';render()",ctx);assert(!element('world').innerHTML.includes('data-ep-communication'));
vm.runInContext("viewMode='Top';scope='single';render()",ctx);assert(!element('world').innerHTML.includes('data-ep-communication'));
vm.runInContext("scope='all';relationRank=null;render()",ctx);assert(!element('world').innerHTML.includes('data-ep-communication'));
console.log('PASS: baseline CSS, original scene, EP group/model conservation, shared timeline phases, direction, buffer release and view isolation');

const crypto=require('node:crypto');
assert.equal(crypto.createHash('sha256').update(baseline).digest('hex'),'d28e3af6146092c1c65b9cbcbc9de3b2515ac6ceaf68592d00b44393936fb32d');
const ids=s=>[...s.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]).filter(id=>!id.startsWith('ep-')).sort();
assert.deepEqual(ids(html),ids(baseline),'original UI IDs retained');
for(const [t,id] of [[90,23],[390,55],[690,87],[990,119]])assert.equal(read(`epEventAt(${t},${id}).frame.phase.id`),'dispatch');
assert.equal(read('epEventAt(3590,23).active'),false,'only first microbatch event');

// Follow one source's exact integer buckets through boundaries and backwards.
for(const hot of [false,true]){
 const e=M.event({hot,layer:0});
 for(const t of [0,.159,.16,.3,.44,.699,.7,.85,.999,1,.85,.3,0]){
  const traced=M.trace(e,t,23),frame=M.frame(e,t),rank=frame.ranks.find(r=>r.id===23);
  assert.equal(traced.total,65536);
  assert.equal(traced.sent,rank.remoteOut-traced.buckets.filter(b=>!b.local).reduce((n,b)=>n+b.remaining,0));
  assert.equal(traced.remoteReturned,rank.returned);
  for(const b of traced.buckets){
   assert.equal(b.remaining+b.inFlight+b.held+b.returned,b.tokens);
   assert(b.held>=0&&b.returned>=0);
   assert(b.received<=b.tokens);assert(b.dispatched>=b.received||b.local);
  }
  assert.equal(traced.buckets.find(b=>b.local).returned,t>=.7?traced.local:0);
  if(t===1)assert.equal(traced.returned,traced.total);
 }
}
element('relations').value='ep';
for(const [t,label] of [[0,'分桶'],[90,'分发'],[170,'计算'],[210,'回收'],[260,'回收'],[300,'完成'],[90,'分发'],[0,'分桶']]){
 vm.runInContext(`viewMode='Top';scope='all';relationRank=selectedRank=23;simTime=${t};render()`,ctx);
 const svg=element('world').innerHTML;
 assert(svg.includes(`data-ep-token-state="${label}"`));
 assert(svg.includes(`EP · ${label}`));
 assert.equal((svg.match(/data-ep-bucket=/g)||[]).length,8);
 if(['计算','分桶','完成'].includes(label))assert.equal((svg.match(/data-ep-parcel=/g)||[]).length,0);
 if(t===170)assert(svg.includes('data-ep-token-state="计算"')&&!svg.includes('data-ep-active='));
 if(t===300)assert(svg.includes('65,536 / 65,536')&&!svg.includes('data-ep-active='));
 if(t===260)assert(svg.includes('data-ep-token-state="回收"')&&svg.includes('data-place="inbound"'));
 const tr=read(`EPTeachingModel.trace(epEventAt(${t},23).event,epEventAt(${t},23).frame.t,23)`);
 for(const b of tr.buckets)assert(svg.includes(`data-ep-bucket="${b.target}" data-ep-received="${b.received}" data-ep-returned="${b.returned}"`));
}
console.log('PASS: source-scoped token overlays, integer conservation, local outputs, phase labels and backwards scrubbing');

// Communication tab is a contextual lens; exiting restores the memory camera/time.
vm.runInContext("mode='explode';scope='all';viewMode='2.5D';relationRank=null;selectedRank=2;simTime=12000;zoom=1.5;pan=[12,34]",ctx);
const prior=read('({scope,viewMode,simTime,zoom,pan,selectedRank})');
vm.runInContext("setAtlasMode('comm')",ctx);
assert.equal(read('relationRank'),23);assert.equal(read('viewMode'),'Top');
assert.equal(element('timeline').max,'1000');
assert.equal((element('ep-navigation').innerHTML.match(/data-ep-step=/g)||[]).length,0);
assert.equal((html.match(/<button data-ep-step=/g)||[]).length,5);
vm.runInContext('seekEPStage(.56)',ctx);
assert.equal(read('epEventAt(simTime,relationRank).frame.phase.id'),'compute');
vm.runInContext('seekEPStage(1)',ctx);assert.equal(read('playing'),false);
vm.runInContext("setAtlasMode('explode')",ctx);
assert.deepEqual(read('({scope,viewMode,simTime,zoom,pan,selectedRank})'),prior);
assert.equal(element('timeline').max,'31000');
console.log('PASS: communication entry, event lens, phase navigation, memory-state restoration');

// Teaching playback ends once, while the original training clock is restored.
vm.runInContext("setAtlasMode('comm');simTime=epEventAt(0,relationRank).start;playing=true;lastFrame=0;tick(14000)",ctx);
assert.equal(read('epEventAt(simTime,relationRank).frame.complete'),true);
assert.equal(read('playing'),false);
assert.equal(element('timeline').value,1000);
vm.runInContext("setAtlasMode('explode')",ctx);
assert.deepEqual(read('({scope,viewMode,simTime,zoom,pan,selectedRank})'),prior);
ctx.matchMedia=()=>({matches:true});
vm.runInContext("setAtlasMode('comm')",ctx);assert.equal(read('playing'),false);
vm.runInContext("seekEPStage(.3);pickRelationRank(19)",ctx);
assert.equal(read('relationRank'),19);assert.equal(read('epEventAt(simTime,19).frame.t'),0);
assert(element('world').innerHTML.includes('data-ep-rank-hit="19"'));
assert(!element('world').innerHTML.includes('paint-order="stroke"'));
console.log('PASS: complete-and-stop playback, reduced-motion entry and source switching');

// Route ablation: same accounting and parcels; only network geometry changes.
vm.runInContext("setAtlasMode('comm');seekEPStage(.3)",ctx);
const signatures=[];
for(const style of ['arc','lanes','particles']){
 vm.runInContext(`epRouteStyle='${style}';render()`,ctx);
 const scene=element('world').innerHTML;
 signatures.push([...scene.matchAll(/data-ep-bucket="(\d+)" data-ep-received="(\d+)" data-ep-returned="(\d+)"/g)].map(m=>m[0]).join('|'));
 const movingCount=read('EPTeachingModel.trace(epEventAt(simTime,23).event,epEventAt(simTime,23).frame.t,23).buckets.filter(f=>!f.local).reduce((sum,f)=>sum+f.experts.filter((_,k)=>EPTeachingModel.parcel(epEventAt(simTime,23).frame,k,f.experts.length).place==="outbound").length,0)');
 assert.equal((scene.match(/data-ep-parcel=/g)||[]).length,movingCount);
 assert.equal((scene.match(/data-ep-route=/g)||[]).length,style==='particles'?0:7);
 const points=vm.runInContext('Array.from({length:21},(_,i)=>epCurve([0,70],[300,70],i/20,100))',ctx);
 assert(points.every(p=>p[1]>=70),'network route never crosses rank labels');
}
assert(signatures.every(s=>s===signatures[0]),'route variants preserve accounting');
assert.equal(ctx.document.body.dataset.epMode,'true');
assert.match(element('world').innerHTML,/opacity="0.22" data-linked="false"/);
console.log('PASS: bottom route variants preserve accounting, context visibility and unified controls');

vm.runInContext("epRouteStyle='arc';seekEPStage(.3)",ctx);
const gridSVG=element('world').innerHTML;
assert.equal((gridSVG.match(/data-ep-token-experts=/g)||[]).length,7);
assert(gridSVG.includes('data-token-unit="256"'),'same token scale everywhere');
for(const t of [0,90,170,260,300,90]){
 const l=read(`epTokenLayout(23,epEventAt(${t},23))`);
 const initial=read('epTokenLayout(23,epEventAt(0,23))');
 assert.deepEqual(l,initial,'expert layout stable during playback and rewind');
 const e=read(`epEventAt(${t},23)`);
 const svg=read(`drawEPTokenExperts(23,epPalette(),epEventAt(${t},23))`);
 assert.equal((svg.match(/data-grid-cell=/g)||[]).length,l.cols*l.rows*l.count,'full rectangular grid skeleton');
 assert.equal(l.cols,l.rows*l.count,'square grid with equal spacing');
 const leftLabels=[...svg.matchAll(/data-expert-label="true" x="([^"]+)"/g)];
 const rightLabels=[...svg.matchAll(/data-expert-count="true" x="([^"]+)"/g)];
 assert.equal(leftLabels.length,8);assert.equal(rightLabels.length,8);
 assert(leftLabels.every(m=>Number(m[1])<l.left),'expert IDs outside rank');
 assert(rightLabels.every(m=>Number(m[1])>l.right),'counts outside rank');
 const values=[...svg.matchAll(/data-expert-id="(\d+)" data-assignments="(\d+)" data-source-assignments="(\d+)" data-total-assignments="(\d+)"/g)];
 assert.equal(values.length,8);
 for(const m of values){
  const [expert,received,own,total]=m.slice(1).map(Number);
  assert(own<=received&&received<=total);
  assert.equal(total,e.event.expertMatrix.reduce((n,row)=>n+row[expert],0));
  if(t>=170)assert.equal(received,total);
  if(t===0)assert.equal(received,0);
 }
}
const palette=read('epPalette()');
const receivedSVG=read('drawEPTokenExperts(21,epPalette(),epEventAt(90,23))');
assert(receivedSVG.includes('data-ep-added="true"'),'recent dispatch arrivals have plus marks');
assert(receivedSVG.includes(`fill="${palette.input}"`),'dispatched assignments retain cyan blocks');
assert(!read('drawEPTokenExperts(relationRank,epPalette(),epEventAt(90,relationRank))').includes('data-ep-added="true"'),'local assignments are not network arrivals');
assert(!read('drawEPTokenExperts(21,epPalette(),epEventAt(170,23))').includes('data-ep-added="true"'),'arrival marks clear during compute');
for(const key of ['ink','muted','line','local','surface','token','mark']){
 const hex=palette[key].slice(1);assert(hex.slice(0,2)===hex.slice(2,4)&&hex.slice(2,4)===hex.slice(4,6),'neutral '+key);
}
assert(!gridSVG.includes('#15191c'),'no tinted panel fill');
console.log('PASS: neutral token palette, unequal expert loads, fixed expert lanes and rewind');

// Exact saved permutation, fractional cell geometry and inverse reconstruction.
const mappedEvent=M.event({layer:7}),mapping=M.mapping(mappedEvent,23),sourceIndex=mappedEvent.ids.indexOf(23),seenAssignments=new Set();
assert.equal(mapping.fragments.reduce((n,f)=>n+f.tokens.length,0),65536);
for(const f of mapping.fragments){
 assert(f.offset+f.tokens.length<=256);
 assert.equal(f.target,mappedEvent.ids[Math.floor(f.expert/8)]);
 for(const token of f.tokens){
  assert.equal(Math.floor(token/256),f.sourceCell);
  assert(mappedEvent.assignments[sourceIndex][token].includes(f.expert));
  const key=token+':'+f.expert;assert(!seenAssignments.has(key));seenAssignments.add(key);
 }
}
for(const weights of mappedEvent.routingWeights[sourceIndex])assert(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-12);
for(const t of [0,.3,.7,.85,.999,1,.85,0]){
 const restored=M.reconstruction(mappedEvent,t,23);
 assert.equal(restored.returned,M.trace(mappedEvent,t,23).returned);
 assert.equal(restored.groups.reduce((n,g)=>n+g.tokens,0),8192);
 assert(restored.groups.every(g=>g.returned<=g.tokens*8&&g.complete<=g.tokens));
 if(t===1){assert.equal(restored.returned,65536);assert.equal(restored.complete,8192);}
 if(t<.7)assert.equal(restored.complete,0);
}
vm.runInContext('relationRank=selectedRank=23;seekEPStage(1)',ctx);
const completeSVG=element('world').innerHTML;
assert(completeSVG.includes('data-complete-tokens="8192"'));
assert(!completeSVG.includes('data-ep-parcel='));
assert(!completeSVG.includes(`fill="${palette.output}"`),'no yellow after compute');
assert(!completeSVG.includes('data-ep-return-added='),'no lingering arrival marks');
const sourceLayout=read('epTokenLayout(23,epEventAt(300,23))');
for(let i=0;i<32;i++){
 const p=read(`epSourcePosition(epEventAt(300,23),${i})`);
 assert(p[0]>=sourceLayout.x&&p[0]<sourceLayout.x+sourceLayout.size);
 assert(p[1]>=sourceLayout.y&&p[1]<sourceLayout.y+sourceLayout.size);
}
console.log('PASS: exact token/expert fragments, normalized gates, inverse reconstruction and clean completion');

// Fault injection never rewrites the existing event or admits a failed request.
const unchangedEvent=M.event({layer:0}),beforeEvent=JSON.stringify(unchangedEvent);
for(const id of unchangedEvent.ids){
 const before=M.allocationIncident(unchangedEvent,id,.439),failure=M.allocationIncident(unchangedEvent,id,.44);
 assert(failure.supported&&failure.failed);
 assert.equal(before.usedBytes,failure.usedBytes);
 assert.equal(failure.acceptedBytes,0);
 assert(failure.requestBytes>failure.freeBytes);
 assert(failure.requestBytes<=failure.normalFreeBytes);
 assert.equal(failure.usedBytes+failure.freeBytes,failure.budgetBytes);
 assert(!M.allocationIncident(unchangedEvent,id,.1).failed);
}
assert.equal(JSON.stringify(unchangedEvent),beforeEvent);
assert(!M.allocationIncident(single,0,.44).supported);
vm.runInContext("setAtlasMode('explode');setAtlasMode('comm');viewMode='Front';inspectIncident(.44)",ctx);
assert.equal(read('incidentAt().failed'),true);assert.equal(read('playing'),false);
assert.equal(read('epEventAt(simTime,relationRank).frame.t'),.44);
vm.runInContext('seekEPStage(1)',ctx);assert.equal(read('incidentAt().failed'),true);
vm.runInContext('seekEPStage(.16);playing=true;lastFrame=0;tick(10000)',ctx);
assert.equal(read('playing'),false);assert.equal(read('epEventAt(simTime,relationRank).frame.t'),.44);
element('ep-incident-close').onclick();
vm.runInContext('seekEPStage(1)',ctx);assert.equal(read('epEventAt(simTime,relationRank).frame.complete'),true);
vm.runInContext('inspectIncident(.44);pickRelationRank(17)',ctx);assert.equal(read('epIncidentActive'),false);
console.log('PASS: optional OOM, unchanged routing, atomic failed allocation, stop/rewind/recovery and source isolation');

vm.runInContext("viewMode='Top';epIncidentActive=false;inspectIncident(.44)",ctx);assert.equal(read('epIncidentActive'),false);
vm.runInContext("viewMode='Front';inspectIncident(.44);setRankData(relationRank);applySimulation()",ctx);
assert.equal(Number(vm.runInContext("$('timeline').value",ctx)),440,"Front OOM stop uses event progress, not milliseconds");
assert(Math.abs(read('cats.reduce((a,c)=>a+c.value,0)')-64)<1e-8);
assert(read('cats.at(-1).value')>0,'OOM leaves free memory below failed request');
console.log('PASS: OOM confined to Front; front memory accounting retains failed-request headroom');

element('ep-oom-mode').onclick();
assert.equal(read('viewMode'),'Front');assert.equal(read('epIncidentActive'),true);assert.equal(read('playing'),true);
vm.runInContext("setAtlasMode('comm')",ctx);assert.equal(read('viewMode'),'Top');assert.equal(read('epIncidentActive'),false);
assert(!html.includes('<select id="ep-route-style"'));
console.log('PASS: explicit OOM entry opens Front, communication restores Top, route selector removed');

assert(html.includes('data-oom-annotation='));
