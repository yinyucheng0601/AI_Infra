const {JSDOM,VirtualConsole}=require(process.env.QA_JSDOM||"jsdom");
const fs=require("fs"),assert=require("assert"),path=require("path");
function load(root){const errors=[],vc=new VirtualConsole();vc.on("jsdomError",e=>errors.push(e.message));const d=new JSDOM(fs.readFileSync(path.join(root,"training-demo.html"),"utf8"),{runScripts:"dangerously",url:"http://localhost/",pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.structuredClone=structuredClone;w.matchMedia=()=>({matches:true,addEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.SVGElement.prototype.getBBox=()=>({x:0,y:0,width:1800,height:1800});w.SVGElement.prototype.getTotalLength=()=>100;w.SVGElement.prototype.getScreenCTM=()=>({a:1,inverse(){return this}});w.SVGElement.prototype.createSVGPoint=()=>({x:0,y:0,matrixTransform(){return this}});Object.defineProperty(w.SVGElement.prototype,"viewBox",{get(){const a=(this.getAttribute("viewBox")||"0 0 1440 1000").split(" ").map(Number);return {baseVal:{x:a[0],y:a[1],width:a[2],height:a[3]}}}});w.Element.prototype.animate=()=>({finished:Promise.resolve()});w.innerWidth=1440;w.innerHeight=1000;}});return {d,w:d.window,errors};}
const root=process.argv[2]||__dirname,old=process.env.TRAINING_BASELINE?load(process.env.TRAINING_BASELINE):null,next=load(root);
function click(w,s){if(w.eval("current")===9){if(s.startsWith('#stage [data-node')&&!w.eval("deploymentGraphPrimary"))w.eval("toggleDeploymentPrimary()");if((s.startsWith('[data-deployment-rank')||s.startsWith('[data-observation-rank'))&&w.eval("deploymentGraphPrimary"))w.eval("toggleDeploymentPrimary()");}const e=w.document.querySelector(s);assert(e,s);e.dispatchEvent(new w.MouseEvent("click",{bubbles:true}));}
function stage(w,n){const entering=n===9&&w.eval("current")!==9;click(w,`[data-stage="${n}"]`);if(entering)assert.equal(w.eval("deploymentView"),"Top");if(n===9)w.eval("setDeploymentView(0)");}
function snapshot(w){return ["#world","#impact","#config","#rank-world","#rank-preview","#secondary-control","#token-controls"].map(s=>w.document.querySelector(s).innerHTML);}
if(old)for(let n=0;n<9;n++){stage(old.w,n);stage(next.w,n);assert.deepStrictEqual(snapshot(next.w),snapshot(old.w),"stage "+n+" differs");}
const w=next.w;assert.deepStrictEqual(JSON.parse(w.eval('JSON.stringify(deploymentColors)')),{tp:'#808080',cache:'#B1EF6B',dispatch:'#FF9500',return:'#FF9500',dp:'#79D4F2',edp:'#79D4F2'});stage(w,9);assert.equal(w.eval("current"),9);assert.equal(w.document.querySelectorAll("[data-deployment-rank]").length,8);assert.equal(w.document.querySelectorAll("#deployment-world [data-rank-band]").length,32);
assert.equal(w.document.querySelectorAll('#deployment-world use[href="#deployment-hw-npu"]').length,0);
for(let id=0;id<8;id++){const rank=w.document.querySelector(`[data-deployment-rank="${id}"] svg`);assert.equal(rank.getAttribute("x"),String((id%4)*330+15));assert.equal(rank.getAttribute("y"),String(95+Math.floor(id/4)*430));const scratch=w.document.createElementNS("http://www.w3.org/2000/svg","svg");scratch.innerHTML=w.eval(`deploymentRankGlyph(deploymentState.ranks[${id}])`);assert.equal(rank.innerHTML,scratch.innerHTML,"Rank cube renderer drift "+id);}
assert.equal(w.eval("graphModel.stage"),8);
click(w,'#stage [data-node="moe-combine"]');assert.equal(w.eval("deploymentMode"),"return");click(w,'#stage [data-node="moe-e2-fc1"]');assert.equal(w.eval("deploymentFocus"),4);click(w,"#close");
const graph=w.document.querySelector("#world").innerHTML,modeButtons=["tp","cache","dispatch","return","dp","edp"];
for(const mode of modeButtons){click(w,`[data-deployment-mode="${mode}"]`);assert.equal(w.eval("deploymentState.mode"),mode);assert.equal(w.document.querySelectorAll("[data-deployment-rank]").length,8);}
click(w,'[data-deployment-mode="all"]');assert.equal(w.document.querySelectorAll('#deployment-modes button[aria-pressed="true"]').length,1);assert(w.document.querySelector('[data-deployment-layer="tp"]'));assert(w.document.querySelector('[data-deployment-layer="dp"]'));assert.equal(w.document.querySelector('[data-deployment-token] rect'),null);assert.equal(w.document.querySelector('[data-deployment-token] text').style.fill,'#eee');
for(const mode of modeButtons){click(w,`[data-deployment-mode="${mode}"]`);assert.equal(w.document.querySelectorAll('#deployment-modes button[aria-pressed="true"]').length,1);assert([...w.document.querySelectorAll('[data-deployment-layer]')].every(p=>p.dataset.deploymentLayer===mode));assert([...w.document.querySelectorAll('[data-deployment-edge]')].every(p=>!p.getAttribute('d').includes('L')));}
const saved=w.document.querySelector("[data-deployment-rank=\"0\"]");click(w,"[data-deployment-rank=\"7\"]");assert.equal(w.document.querySelector('#panel').hidden,true);assert.equal(saved,w.document.querySelector("[data-deployment-rank=\"0\"]"));click(w,"#close");click(w,"#plus");assert(w.eval("deploymentCamera.z")>1);click(w,"#fit");assert.equal(w.eval("deploymentCamera.z"),1);
click(w,"#info-icon");assert(w.document.querySelector("#info-content").textContent.includes("显式绑定"));click(w,"#info-close");
click(w,"[data-token=\"3\"]");w.eval("scheduleRender.flush ? scheduleRender.flush() : render()");assert.equal(w.eval("parameterState.token"),3);assert(w.document.querySelector('[data-deployment-token="3"]'));assert.equal(w.document.querySelector('[data-deployment-token="0"]'),null);assert.equal(w.eval("current"),9);
stage(w,8);assert(!w.document.body.classList.contains("deployment-step"));assert(w.document.querySelector("#deployment-surface").hasAttribute("hidden"));assert.equal(w.eval("graphModel.stage"),8);
for(let n=0;n<9;n++){stage(w,n);assert.equal(w.eval("current"),n);assert.equal(w.eval("rankSnapshot.ranks.length"),n<4?0:8);}
stage(w,9);
const beforeObservation=snapshot(w);
w.eval("observationUse(CommunicationObservation.mock(true))");
assert.equal(w.document.querySelectorAll('[data-observation-rank]').length,72);
assert.equal(w.document.querySelectorAll('[data-deployment-layer]').length,0);
click(w,'[data-observation-rank="rank-63"]');
assert.equal(w.document.querySelector('#panel').hidden,true);
assert.equal(w.document.querySelector('#panel').hidden,true);
assert.equal(w.document.querySelectorAll('[data-observation-metric]').length,0);
assert.equal(w.document.querySelectorAll('[data-observation-category]').length,7);
assert.equal(w.document.querySelector('#panel').hidden,true);
const occ=w.document.querySelector('#observation-occurrence');occ.value='combine-0';occ.dispatchEvent(new w.Event('change'));
assert.equal(w.eval('observationOccurrence'),'combine-0');
click(w,'#plus');const zoom=w.eval('deploymentCamera.z');click(w,'[data-observation-rank="rank-0"]');assert.equal(w.eval('deploymentCamera.z'),zoom);
stage(w,8);assert(w.document.querySelector('#observation-controls').hidden);assert(!w.document.body.classList.contains('observation-session'));stage(w,9);
assert.equal(w.eval('observationOccurrence'),'combine-0');
w.eval('observationUse(null)');assert.deepStrictEqual(snapshot(w),beforeObservation);
assert.equal(w.document.querySelectorAll('[data-deployment-rank]').length,8);
console.log('PASS: EP64 overlay, logical slice, metric/occurrence selection, evidence inspector, camera preservation, exit/re-entry and original deployment restore');
w.eval('observationUse(CommunicationObservation.mock())');
click(w,'[data-observation-category="tp"]');
assert.equal(w.eval('observationOccurrence'),null);assert.equal(w.eval('observationMetric'),null);
assert(w.document.querySelector('#impact').textContent.includes('未提供'));
assert.equal(w.document.querySelectorAll('[data-observation-rank]').length,72);
assert.equal(w.document.querySelectorAll('[data-observation-exchange]').length,0);
assert(w.document.querySelector('#observation-occurrence').hidden);
click(w,'[data-observation-category="return"]');assert.equal(w.eval('observationOccurrence'),'combine-0');
click(w,'[data-observation-category="all"]');assert.equal(w.document.querySelectorAll('#deployment-modes [aria-pressed="true"]').length,1);
w.eval(`{
 const d=CommunicationObservation.mock();
 d.sources.push({id:'test-source',uri:'verify-deployment-dom.cjs',revision:'1',sha256:null,license:null,format:'test-fixture',producer:'test-generator',producerVersion:'1',capturedAt:null});
 d.evidence.push({id:'test-evidence',sourceId:'test-source',locator:'mixed communication fixture',method:'constructed TP and DP records',inputEvidenceIds:[]});
 const f=value=>({value,status:'mock',evidenceIds:['test-evidence']});
 for(const [axis,members,value] of [['TP',[0,1,2,3],80],['DP',[0,4,8,12],120]]){
  const id=axis.toLowerCase(),ids=members.map(r=>'rank-'+r);
  d.groups.push({id:id+'-group',membership:f(ids),localRankMap:f(members),semanticAxis:f(axis),evidenceIds:['test-evidence']});
  d.occurrences.push({id:id+'-op',contextId:'context',groupId:id+'-group',operation:f('AllReduce'),sequence:f(0),tensorSpec:f({}),match:{state:'verified',method:'fixture operation identity',evidenceIds:['test-evidence']},eventCoverage:{expectedIds:ids,observedIds:[],completeness:'partial',evidenceIds:['test-evidence']},evidenceIds:['test-evidence']});
  const obs=structuredClone(d.observations.find(o=>o.metricId==='event.elapsed'));obs.id=id+'-time';obs.value=value;obs.status='mock';obs.evidenceIds=['test-evidence'];obs.occurrenceId=id+'-op';obs.eventIds=[];obs.derivation=null;
  d.observations.push(obs);
 }
 observationUse(d);
}`);
click(w,'[data-observation-category="tp"]');assert.equal(w.eval('observationOccurrence'),'tp-op');
click(w,'[data-observation-rank="rank-0"]');assert.equal(w.document.querySelector('#panel').hidden,true);
click(w,'[data-observation-category="dp"]');assert.equal(w.eval('observationOccurrence'),'dp-op');assert.equal(w.document.querySelector('#panel').hidden,true);
assert.equal(w.document.querySelectorAll('[data-observation-rank]').length,72);
click(w,'[data-observation-category="dispatch"]');assert.equal(w.eval('observationOccurrence'),'dispatch-0');
click(w,'[data-observation-category="cache"]');assert.equal(w.eval('observationMetric'),null);
assert.equal(w.document.querySelector('#panel').hidden,true);
click(w,'[data-observation-category="all"]');assert.equal(w.document.querySelectorAll('#observation-occurrence option').length,4);
w.eval('observationUse(null)');
console.log('PASS: no metric tabs; all communication categories retained; uncovered categories show missing records without EP leakage; mixed 64-Rank TP/DP/EP data filters constructed fixture records independently of scale');

stage(w,9);
assert.equal(w.document.querySelectorAll('#rank-view-dial .dial-port').length,4);
assert.equal(w.document.querySelectorAll('#rank-view-dial button[title]').length,0);
click(w,'[data-deployment-mode="dp"]');const viewFocus=w.eval('deploymentFocus');
click(w,'#rank-view-dial [data-slot="1"]');
assert.equal(w.eval('deploymentView'),'Top');assert.equal(w.eval('deploymentFocus'),viewFocus);assert.equal(w.eval('deploymentMode'),'dp');
assert.equal(w.document.querySelectorAll('[data-physical-pair]').length,28);
assert.equal(w.document.querySelectorAll('#deployment-world use[href="#deployment-hw-npu"]').length,8);
click(w,'[data-deployment-rank="3"]');assert.equal(w.document.querySelector('#panel').hidden,true);
const projections=[];
for(const slot of [2,3,0]){click(w,`#rank-view-dial [data-slot="${slot}"]`);assert.equal(w.document.querySelectorAll('[data-deployment-rank]').length,8);assert.equal(w.document.querySelectorAll('#deployment-world [data-rank-band]').length,32);projections.push(w.document.querySelector('#deployment-world polygon').getAttribute('points'));assert(!w.document.querySelector('#deployment-world').innerHTML.includes('NaN'));}
assert.notEqual(projections[0],projections[2]);
click(w,'#rank-view-dial [data-slot="1"]');w.eval('observationUse(CommunicationObservation.mock())');
assert.equal(w.document.querySelectorAll('[data-observation-rank]').length,64);
assert.equal(w.document.querySelectorAll('[data-physical-pair]').length,0);
assert.equal(w.document.querySelectorAll('#deployment-world use[href="#deployment-hw-npu"]').length,64);
assert(w.document.querySelectorAll('.lingqu-physical .physical-target').length>0);
assert.equal(w.document.querySelectorAll('.p-board').length,8);
assert.equal(w.document.querySelectorAll('.p-cpu').length,16);
assert.equal(w.document.querySelectorAll('.p-nic').length,32);
click(w,'[data-physical-board="5"]');assert(w.document.querySelector('[data-lingqu-scene="board"]'));assert.equal(w.document.querySelectorAll('[data-observation-rank]').length,8);
click(w,'[data-physical-level="pod"]');assert.equal(w.document.querySelectorAll('[data-observation-rank]').length,64);
w.eval(`{
 const d=CommunicationObservation.mock(),a=d.placements.find(p=>p.rankId==='rank-0'),b=d.placements.find(p=>p.rankId==='rank-63');
 [a.resourceId,b.resourceId]=[b.resourceId,a.resourceId];observationUse(d);
}`);
assert.equal(w.document.querySelector('[data-observation-rank="rank-0"] .p-npu').dataset.rank,'63');
assert.equal(w.document.querySelector('[data-observation-rank="rank-63"] .p-npu').dataset.rank,'0');
w.eval(`{const d=CommunicationObservation.mock();d.run.config.deployment=undefined;d.placements=[];observationUse(d);}`);
assert.equal(w.document.querySelectorAll('.lingqu-physical').length,0);assert(w.document.querySelector('#deployment-world').textContent.includes('未提供设备映射'));
w.eval('observationUse(CommunicationObservation.mock())');
console.log('PASS: physical placement follows explicit resource mapping, including permuted ranks; unmapped imports do not acquire mock topology');
click(w,'[data-observation-rank="rank-63"]');assert.equal(w.document.querySelector('#panel').hidden,true);
const selectedMetric=w.eval('observationMetric');click(w,'#rank-view-dial [data-slot="0"]');assert.equal(w.eval('observationRank'),'rank-63');assert.equal(w.eval('observationMetric'),selectedMetric);assert.equal(w.document.querySelectorAll('[data-observation-rank]').length,72);
click(w,'[data-observation-rank="rank-0"]');assert.equal(w.document.querySelector('#panel').hidden,true);w.eval('observationUse(null)');stage(w,8);assert(w.document.querySelector('#rank-view-dial').hidden);console.log('PASS: selecting devices updates relations without opening a floating panel');
// Synthetic records exercise the measured-event gate; these are test data only.
stage(w,9);w.eval(`setDeploymentView(1);observationUse(CommunicationObservation.mock());physicalDrill(0)`);
assert.equal(w.document.querySelectorAll('[data-measured-exchange]').length,0);
w.eval(`{const d=structuredClone(observationData);d.events.forEach(e=>e.backend='hccl');d.exchanges.forEach(e=>e.phase.status='measured');observationUse(d);physicalDrill(0);}`);
assert.equal(w.document.querySelectorAll('[data-measured-exchange]').length,0,'constructed clocks must not become measured events');
w.eval(`{const d=structuredClone(observationData);d.clocks.forEach(c=>c.domain='rank-local-profiler');observationUse(d);physicalDrill(0);}`);
assert(w.document.querySelectorAll('[data-measured-exchange]').length>0,'measured exchanges with both endpoint events should render');
w.eval('observationUse(null)');stage(w,8);
console.log('PASS: measured exchange gate excludes mock and constructed clocks; synthetic HCCL runtime events expose logical endpoint arrows');
console.log('PASS: reused four-view dial, 28 configured UB arcs/8 source NPU glyphs in Top, orthographic projections, shared selection/metric, configured EP64 POD/board placement and original hardware links, without measured path claims, dial hidden outside step 10');
stage(w,9);click(w,"#play");assert.equal(w.eval("current"),0);w.eval("pausePlayback()");if(old)assert.deepStrictEqual(old.errors,[]);assert.deepStrictEqual(next.errors,[]);
if(old)console.log("PASS: first 9 stage DOM snapshots match baseline (graph, Rank, copy, parameters)");console.log("PASS: step 10 modes, 8 inherited 2.5D Rank nodes, 32 original bands, unchanged 4×2 positions, inspector, Info, zoom, token, exit/re-entry, playback restart; no script errors (DOM emulation, no visual layout)");old?.d.window.close();next.d.window.close();
