/* Host adapter for the complete Lingqu Pattern renderers. No packet paths are
 * invented: configured topology and observed logical exchanges stay separate. */
let physicalLevel='pod',physicalBoard=0,physicalContext=null,physicalFitBounds=null;
const physicalPath=document.createElement('nav');physicalPath.id='physical-path';physicalPath.hidden=true;physicalPath.setAttribute('aria-label','物理层级');document.body.append(physicalPath);
function resetPhysicalView(){physicalLevel='pod';physicalBoard=0;physicalContext=null;physicalFitBounds=null;physicalPath.hidden=true;}
function physicalInput(){
 if(!observationData)return {id:'configured-eight',ranks:deploymentState.ranks.map(r=>({id:String(r.id),rankIndex:r.id})),placements:deploymentState.ranks.map(r=>({rankId:String(r.id),slot:r.id,board:0,pod:0})),focus:String(deploymentFocus),values:new Map(),unit:'',metric:null};
 const d=observationData;if(d.run.config?.deployment?.profile!=='lingqu-950-template')return null;
 const byResource=new Map(d.resources.map(r=>[r.id,r])),placements=[];
 for(const r of d.ranks){const p=d.placements.find(p=>p.rankId===r.id),device=byResource.get(p?.resourceId),v=device?.identity?.value;
  if(!device||device.kind!=='npu'||!['configured','measured','derived'].includes(device.identity.status)||!Number.isInteger(v?.slot)||v.slot<0||v.slot>7||!Number.isInteger(v?.boardIndex)||v.boardIndex<0||v.podIndex!==Math.floor(v.boardIndex/8))return null;
  placements.push({rankId:r.id,slot:v.slot,board:v.boardIndex,pod:v.podIndex});
 }
 const keys=placements.map(p=>p.board*8+p.slot);if(new Set(keys).size!==keys.length)return null;
 const def=d.metricDefinitions.find(m=>m.id===observationMetric);
 return {id:d.run.id,ranks:d.ranks,placements,focus:observationRank,values:CommunicationObservation.rankValues(d,observationMetric,observationOccurrence),unit:def?.unit||'',metric:def?.name||null};
}
function physicalSelection(input){
 const targets=new Set([input.focus]),members=new Set([input.focus]);
 if(observationData){const d=observationData,o=d.occurrences.find(o=>o.id===observationOccurrence),g=d.groups.find(g=>g.id===o?.groupId);g?.membership.value?.forEach(r=>members.add(r));
  if(observationCategory==='all'||observationOccurrence!==null)d.exchanges.filter(e=>e.occurrenceId===observationOccurrence&&e.srcRankId===input.focus).forEach(e=>targets.add(e.dstRankId));
 }else for(const mode of deploymentLayers){const state=trainingDeploymentState(parameterState,deploymentFocus,mode);state.members.forEach(r=>members.add(String(r)));state.edges.filter(e=>e.from===deploymentFocus||e.to===deploymentFocus).forEach(e=>{targets.add(String(e.from));targets.add(String(e.to));});}
 return {targets,members};
}
function physicalBoardComposition(svg,detailed){
 svg.classList.add('physical-composition');svg.classList.toggle('physical-detail',detailed);
 const NS='http://www.w3.org/2000/svg',g=document.createElementNS(NS,'g');g.classList.add('physical-sections');
 const sections=[[-6,40,906,106,'Host 接入','CPU / PCIe'],[112,154,790,124,'计算互联','NPU Mesh'],[112,282,790,110,'交换网络','L1 / L2 Clos'],[46,401,856,42,'扩展互联','POD / SuperPOD'],[46,449,856,70,'框内互联','Board-to-Board']];
 g.innerHTML=sections.map(([x,y,w,h,title,sub])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><text x="-116" y="${y+23}" class="physical-section-title">${title}</text><text x="-116" y="${y+40}" class="physical-section-sub">${sub}</text>`).join('');
 svg.insertBefore(g,svg.firstChild.nextSibling);
 const agg=document.createElementNS(NS,'g');agg.classList.add('physical-aggregate');
 agg.innerHTML='<rect class="aggregate-region" x="126" y="164" width="752" height="18" rx="4"/><text x="502" y="176" text-anchor="middle">Full Mesh · 7 × 4 · 拓扑聚合</text><rect class="aggregate-region" x="126" y="286" width="752" height="20" rx="4"/><text x="502" y="299" text-anchor="middle">Clos Fabric · 8 × 4 · 拓扑聚合</text>';
 for(let i=0;i<8;i++){const x=152+i*100;agg.insertAdjacentHTML('beforeend',`<line class="aggregate-physical" x1="${x}" y1="182" x2="${x}" y2="200"/><line class="aggregate-logical" x1="${x}" y1="269" x2="${x}" y2="286"/><line class="aggregate-physical" x1="${x}" y1="306" x2="${x}" y2="314"/>`);}
 svg.insertBefore(agg,svg.querySelector('.b-nodes'));
 // Expansion interfaces are destinations of the plane links, not extra switches.
 svg.querySelectorAll('.b-lbl-ub,.b-lbl-uboe,.b-bus.b-ub,.b-bus.b-uboe').forEach(n=>n.remove());
 svg.querySelectorAll('.b-out').forEach(n=>n.setAttribute('y2','401'));
 const ext=document.createElementNS(NS,'g');ext.classList.add('physical-expansion');
 ext.innerHTML='<rect x="60" y="401" width="410" height="42" rx="4"/><text x="265" y="426" text-anchor="middle" class="b-lbl-ub">Unified Bus → POD</text><rect x="498" y="401" width="402" height="42" rx="4"/><text x="699" y="426" text-anchor="middle" class="b-lbl-uboe">UBoE → SuperPOD</text>';
 svg.append(ext);
 svg.querySelectorAll('.b-lbl').forEach(n=>{if(/^(fullmesh|Clos|框内板间互联)/.test(n.textContent))n.remove();});
}
function physicalRelationLegend(){return `<div class="physical-relation-key" style="--mode-color:${observationData?observationColor():deploymentColors[deploymentMode]||'#808080'}"><div><i class="key-physical"></i><span>物理连接<small>静态硬件连接</small></span></div><div><i class="key-logical"></i><span>逻辑互联<small>聚合关系，不代表实体总线</small></span></div><div><i class="key-parallel"></i><span>并行链路<small>独立通道，×4 表示四条</small></span></div><div><i class="key-selected" style="border-color:var(--mode-color,#FF9500)"></i><span>选中关联<small>按通信类型着色的拓扑关系；不代表实测路径</small></span></div><div><i class="key-event"></i><span>通信事件<small>有运行时证据时显示语义色箭头；不等于物理路径</small></span></div></div>`;}
function physicalRender(){
 physicalPath.hidden=true;physicalFitBounds=null;
 const input=physicalInput();if(!input)return false;
 const slots=new Map(input.placements.map(p=>[p.board*8+p.slot,p.rankId])),rankMap=new Map(input.ranks.map(r=>[r.id,r]));
 const world=Math.max(...slots.keys())+1,focus=input.placements.find(p=>p.rankId===input.focus)||input.placements[0];
 const same=physicalContext?.inputId===input.id;
 if(!same){physicalLevel=input.placements.every(p=>p.board===focus.board)?'board':'pod';physicalBoard=focus.board;}
 const pattern=LingquPhysicalPattern.create({world,coordinate:()=>({pp:0}),coordinateLabel:n=>{const r=rankMap.get(slots.get(n));return r?'Rank '+r.rankIndex:'';}});
 const cluster=pattern.cluster(); // Also initializes exact source GEO for drill-in.
 if(physicalLevel==='board'&&!input.placements.some(p=>p.board===physicalBoard))physicalBoard=focus.board;
 const board=physicalLevel==='board';
 const temp=document.createElementNS('http://www.w3.org/2000/svg','svg');temp.innerHTML=board?pattern.board(physicalBoard):cluster;
 const svg=temp.firstElementChild;svg.classList.add('lod1','lod2');
 const vb=svg.getAttribute('viewBox').split(' ').map(Number);svg.setAttribute('width',vb[2]);svg.setAttribute('height',vb[3]);svg.style.overflow='visible';svg.style.display='block';
 svg.querySelectorAll('title').forEach(el=>{const parent=el.parentElement;parent.dataset.tip=el.textContent;el.remove();});
 // The large SP capacity rectangle is not part of the fitted POD. All L1/L2,
 // board and device geometry and routing remain at their source coordinates.
 svg.querySelectorAll('.p-sp,.p-splabel').forEach(el=>el.remove());
 if(!board){
  const relations=document.createElementNS('http://www.w3.org/2000/svg','g');relations.innerHTML=pattern.relations(focus.board);svg.insertBefore(relations,svg.querySelector('.p-nodes'));
  const bounds=pattern.podBounds(focus.pod);physicalFitBounds={x:bounds.x-5,y:bounds.y-32,width:bounds.width+10,height:bounds.height+36};
 }else{physicalFitBounds={x:-140,y:0,width:1100,height:550};physicalBoardComposition(svg,true);}
 const {targets,members}=physicalSelection(input),color=observationData?observationColor():deploymentColors[deploymentMode]||'#aaa';
 const max=Math.max(1,...[...input.values.values()].map(o=>o.value??0));
 svg.querySelectorAll('.p-npu').forEach(rect=>{
  const n=Number(rect.dataset.rank),id=slots.get(n),r=rankMap.get(id);if(!r){rect.style.opacity='.12';return;}
  const x=Number(rect.getAttribute('x')),y=Number(rect.getAttribute('y')),w=Number(rect.getAttribute('width'));
  const selected=id===input.focus,related=members.has(id)||targets.has(id),o=input.values.get(id),value=o?.value==null?'—':Number(o.value.toFixed(2)).toLocaleString('en-US');
  const group=board?rect.parentElement:document.createElementNS('http://www.w3.org/2000/svg','g');
  if(!board){rect.before(group);group.append(rect);}
  group.classList.add('physical-rank');if(selected)group.classList.add('is-selected');else group.classList.add('is-dim');if(targets.has(id))group.classList.add('physical-target');
  group.style.setProperty('--communication-color',color);group.setAttribute('role','button');group.setAttribute('tabindex','0');group.setAttribute('aria-pressed',String(selected));
  if(observationData)group.dataset.observationRank=id;else group.dataset.deploymentRank=r.rankIndex;
  group.dataset.tip=`Rank ${r.rankIndex} · POD ${Math.floor(n/64)} · 板 ${Math.floor(n/8)} · 槽 ${n%8}${input.metric?' · '+input.metric+' '+value+' '+input.unit:''}`;
  group.querySelectorAll('[data-tip]').forEach(el=>el.removeAttribute('data-tip'));
  if(!board){group.insertAdjacentHTML('beforeend',`<use class="p-npupkg" href="#hw-npu" x="${x+.5}" y="${y}" width="6" height="4.5"/><rect class="p-npustrip" x="${x+1.25}" y="${y+4.75}" width="4.5" height=".4"/>${selected?`<rect class="rank-label-bg" x="${x}" y="${y+5.35}" width="7" height="2.5" rx=".5"/>`:''}<text class="p-npunum" x="${x+3.5}" y="${y+7.35}" text-anchor="middle">${r.rankIndex}</text>`);
   if(input.metric){group.insertAdjacentHTML('beforeend',`<rect class="metric-track" x="${x+.5}" y="${y+8}" width="6" height=".3"/><rect class="metric-bar" x="${x+.5}" y="${y+8}" width="${o?.value==null?0:o.value/max*6}" height=".3"/>`);}
  }else{
   const text=group.querySelector('.b-npul');if(text)text.textContent='NPU '+(n%8);
   if(selected)rect.insertAdjacentHTML('afterend',`<rect class="rank-label-bg" x="${x+6}" y="${y+38}" width="${w-12}" height="18" rx="7"/>`);
   if(input.metric)group.insertAdjacentHTML('beforeend',`<text class="metric-text" x="${x+w/2}" y="${y+68}" text-anchor="middle">${value} ${esc(input.unit)}</text>`);
  }
 });
 // Device emphasis follows the selected Rank and its attached host devices.
 if(board){
  svg.querySelectorAll('.b-cpu,.b-nic,.b-dpu,.b-l1,.b-nsw,.b-swb').forEach(el=>{
   const active=el.matches('.b-cpu')?Number(el.dataset.cpu)===Math.floor(focus.slot/4):el.matches('.b-nic')?Number(el.dataset.nic)===Math.floor(focus.slot/2):false;
   el.classList.add(active?'device-active':'device-inactive');
  });
 }
 svg.querySelectorAll('.b-mesh').forEach(el=>el.dataset.physicalPair=el.dataset.m.replace(',', '-'));
 svg.querySelectorAll('[data-n],[data-m]').forEach(el=>{const nums=(el.dataset.n??el.dataset.m).split(',').map(Number),slot=focus.board===physicalBoard||!board?focus.slot:null;el.classList.add(slot!==null&&nums.includes(slot)?'is-hot':'is-cold');});
 svg.querySelectorAll('.p-board').forEach(el=>{
  const b=Number(el.dataset.board);if(!input.placements.some(p=>p.board===b)){el.style.pointerEvents='none';return;}
  el.dataset.physicalBoard=b;el.setAttribute('role','button');el.setAttribute('tabindex','0');el.dataset.tip=`展开板 ${b} · CPU / NPU / DPU / NIC 与互联`;if(b===focus.board)el.classList.add('board-row-active');
 });
 // A semantic arrow requires a measured exchange plus runtime records at both ends.
 if(observationData){
  const d=observationData,events=d.events.filter(e=>e.occurrenceId===observationOccurrence&&e.category==='device-communication'&&/hccl|hcomm|ascend/i.test(e.backend||'')&&d.clocks.find(c=>c.id===e.time?.clockId)?.domain!=='constructed');
  const captured=new Set(events.map(e=>e.rankId)),points=new Map();
  svg.querySelectorAll('.physical-rank').forEach(g=>{const rect=g.querySelector('.p-npu');if(rect)points.set(g.dataset.observationRank,{x:+rect.getAttribute('x')+(+rect.getAttribute('width'))/2,y:+rect.getAttribute('y')});});
  const measured=d.exchanges.filter(e=>e.occurrenceId===observationOccurrence&&e.phase?.status==='measured'&&e.evidenceIds?.length&&captured.has(e.srcRankId)&&captured.has(e.dstRankId)&&(e.srcRankId===input.focus||e.dstRankId===input.focus));
  const layer=document.createElementNS('http://www.w3.org/2000/svg','g');layer.classList.add('physical-measured-exchanges');
  const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');defs.innerHTML=`<marker id="physical-event-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8Z" fill="${color}"/></marker>`;layer.append(defs);
  measured.forEach(e=>{const a=points.get(e.srcRankId),b=points.get(e.dstRankId);if(!a||!b||e.srcRankId===e.dstRankId)return;const line=document.createElementNS('http://www.w3.org/2000/svg','path');line.setAttribute('data-measured-exchange',e.id);line.setAttribute('d',`M${a.x},${a.y} V${Math.min(a.y,b.y)-(board?32:4)} H${b.x} V${b.y}`);line.style.stroke=color;line.setAttribute('marker-end','url(#physical-event-arrow)');line.dataset.tip='运行时通信事件 · '+e.srcRankId+' → '+e.dstRankId+'；逻辑端点，不表示物理路径';layer.append(line);});svg.append(layer);
 }
 svg.querySelectorAll('use[href^="#hw-"]').forEach(el=>el.setAttribute('href',el.getAttribute('href').replace('#hw-','#deployment-hw-')));
 if(typeof deploymentTraceOpen!=='undefined'&&deploymentTraceOpen&&deploymentTraceWindow&&deploymentTraceModel?.events){const events=deploymentTraceModel.events;svg.querySelectorAll('.physical-rank').forEach(g=>{const id=g.dataset.observationRank??g.dataset.deploymentRank,occurrence=observationData?observationOccurrence:deploymentMode,local=events.filter(e=>e.rankId===id&&e.occurrenceId===occurrence);if(local.length)g.classList.toggle('trace-outside-window',!local.some(e=>e.time.end>=deploymentTraceWindow.start&&e.time.start<=deploymentTraceWindow.end));});}
 const shell=document.createElementNS('http://www.w3.org/2000/svg','g');shell.classList.add('lingqu-physical');shell.style.setProperty('--communication-color',color);shell.dataset.lingquScene=board?'board':'pod';shell.append(svg);
 updateGraphSvg(document.querySelector('#deployment-world'),'<svg xmlns="http://www.w3.org/2000/svg">'+shell.outerHTML+'</svg>');applyDeploymentCamera();
 physicalContext={inputId:input.id,pattern,input,focus};
 physicalPath.innerHTML=`<button data-physical-level="pod" aria-pressed="${!board}" data-tip="返回 POD ${focus.pod} 的板与设备拓扑">POD ${focus.pod}</button>${board?`<span>›</span><button data-physical-level="board" aria-pressed="true" data-tip="当前板 ${physicalBoard} 的完整互联">板 ${physicalBoard}</button>`:''}`;
 if(input.metric)physicalPath.insertAdjacentHTML('beforeend',`<span class="physical-metric">${esc(input.metric)}${input.unit==='tokens'&&input.metric.includes('token')?'':' · '+esc(input.unit)}</span>`);
 physicalPath.hidden=false;return true;
}
function physicalDrill(board){
 const input=physicalInput(),placement=input?.placements.find(p=>p.rankId===input.focus);
 if(placement&&placement.board!==board){const first=input.placements.find(p=>p.board===board);if(first){if(observationData){observationRank=first.rankId;observationResolve();}else deploymentFocus=Number(first.rankId);}}
 physicalLevel='board';physicalBoard=board;document.querySelector('#panel').hidden=true;deploymentInspector=false;drawDeployment();deploymentCamera.z=1;deploymentCamera.x=deploymentCamera.y=0;applyDeploymentCamera();fitDeployment();}
document.addEventListener('click',e=>{if(current!==9||deploymentView!=='Top'||deploymentMoved)return;
 if(e.target.id==='close'){drawDeployment();return;}
 const row=e.target.closest('[data-physical-board]'),back=e.target.closest('[data-physical-level]');
 if(row){physicalDrill(Number(row.dataset.physicalBoard));}
 if(back?.dataset.physicalLevel==='pod'){physicalLevel='pod';drawDeployment();deploymentCamera.z=1;deploymentCamera.x=deploymentCamera.y=0;applyDeploymentCamera();fitDeployment();}
});
document.addEventListener('keydown',e=>{const row=e.target.closest('[data-physical-board]');if(current===9&&deploymentView==='Top'&&row&&['Enter',' '].includes(e.key)){e.preventDefault();physicalDrill(Number(row.dataset.physicalBoard));}});
