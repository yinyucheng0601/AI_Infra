/* Linked event time view using the shared PTO hierarchical-timeline renderer. */
let deploymentTraceOpen=false,deploymentTraceController=null,deploymentTraceModel=null,deploymentTraceWindow=null;
const deploymentTraceButton=document.createElement('button');deploymentTraceButton.id='deployment-trace-toggle';deploymentTraceButton.textContent='TraceView';deploymentTraceButton.setAttribute('aria-pressed','false');deploymentTraceButton.dataset.tip='展开事件时间线，与 Rank 和通信操作双向联动';deploymentControlRow.append(deploymentTraceButton);
const deploymentTracePanel=document.createElement('section');deploymentTracePanel.id='deployment-trace';deploymentTracePanel.hidden=true;
deploymentTracePanel.innerHTML='<header><span>TraceView</span><small id="deployment-trace-clock"></small><button id="deployment-trace-close" aria-label="收起 TraceView" data-tip="收起事件时间线">×</button></header><div id="deployment-trace-host"></div><p id="deployment-trace-empty" hidden></p>';
document.body.append(deploymentTracePanel);
function buildDeploymentTraceModel(){
 const d=observationData;if(!d)return ConfiguredTraceMock.build(deploymentState,parameterState,deploymentColors);
 const allowed=new Set(observationOccurrences().map(o=>o.id));
 const valid=e=>e.category==='device-communication'&&!/cuda|nccl/i.test(e.backend||'')&&allowed.has(e.occurrenceId)&&e.time&&Number.isFinite(e.time.start)&&Number.isFinite(e.time.end)&&e.time.end>=e.time.start;
 const focusEvents=d.events.filter(e=>e.rankId===observationRank&&valid(e));if(!focusEvents.length)return {empty:'当前 Rank 与通信筛选没有事件时间'};
 const clock=d.clocks.find(c=>c.id===focusEvents[0].time.clockId);if(!clock)return {empty:'事件未提供可识别的时钟'};
 const shared=['constructed','global','synchronized','shared'].includes(clock.domain),index=d.ranks.findIndex(r=>r.id===observationRank),context=d.ranks.slice(Math.floor(index/8)*8,Math.floor(index/8)*8+8),ranks=shared?context:d.ranks.filter(r=>r.id===observationRank);
 const events=d.events.filter(e=>valid(e)&&e.time.clockId===clock.id&&ranks.some(r=>r.id===e.rankId));
 const min=Math.min(...events.map(e=>e.time.start)),max=Math.max(min+1,...events.map(e=>e.time.end));
 const rows=ranks.map(r=>({id:r.id,label:'Rank '+r.rankIndex,events:events.filter(e=>e.rankId===r.id).map(e=>{const occurrence=d.occurrences.find(o=>o.id===e.occurrenceId),kind=CommunicationObservation.communicationKind(d,occurrence);return {id:e.id,rankId:r.id,occurrenceId:e.occurrenceId,start:e.time.start,end:e.time.end,label:occurrence?.operation.value||e.rawName,rawName:e.rawName,color:e.occurrenceId===observationOccurrence?deploymentColors[kind]||'#888888':'#555555',sourceEventIds:[e.id]};})}));
 return {clock,shared,events,rows,id:d.run.id+':'+clock.id,timeRange:{min,max,step:Math.max(.001,(max-min)/1000)},window:{start:min,end:max},unit:clock.unit||'us'};
}
function traceSelect(selection){
 if(!selection?.event)return;
 if(!observationData){deploymentFocus=Number(selection.event.rankId);if(selection.event.kind in deploymentColors){deploymentMode=selection.event.kind;deploymentLayers.clear();deploymentLayers.add(deploymentMode);}deploymentState=trainingDeploymentState(parameterState,deploymentFocus,deploymentMode==='all'?'dispatch':deploymentMode);deploymentInspector=false;drawDeployment();fitDeployment();return;}
 observationRank=selection.event.rankId;observationOccurrence=selection.event.occurrenceId;observationResolve();deploymentInspector=false;
 const input=physicalInput(),location=input?.placements.find(p=>p.rankId===observationRank);if(location&&physicalLevel==='board')physicalBoard=location.board;
 observationDraw();fitDeployment();
}
function syncDeploymentTrace(){
 const active=current===9&&deploymentTraceOpen;document.body.classList.toggle('deployment-trace-open',active);deploymentTracePanel.hidden=!active;deploymentTraceButton.setAttribute('aria-pressed',String(active));if(!active)return;
 const next=buildDeploymentTraceModel(),host=document.querySelector('#deployment-trace-host'),empty=document.querySelector('#deployment-trace-empty');
 const previousId=deploymentTraceModel?.id,activeRank=observationData?observationRank:String(deploymentFocus),activeOccurrence=observationData?observationOccurrence:deploymentMode;deploymentTraceModel=next;
 if(next.configured)next.rows.forEach(row=>row.events.forEach(e=>e.color=e.kind==='compute'?'#555555':deploymentMode==='all'||e.kind===deploymentMode?deploymentColors[e.kind]||'#888888':'#555555'));empty.hidden=!next.empty;host.hidden=!!next.empty;
 if(next.empty){empty.textContent=next.empty;document.querySelector('#deployment-trace-clock').textContent='';deploymentTraceController?.destroy();deploymentTraceController=null;deploymentTraceWindow=null;return;}
 deploymentTracePanel.style.setProperty('--primary',observationData?observationColor():deploymentColors[deploymentMode]||'#888888');
 document.querySelector('#deployment-trace-clock').textContent=(next.configured?'Mock':next.clock.domain==='constructed'?'构造时钟':next.shared?'共享时钟':'Rank '+observationData.ranks.find(r=>r.id===observationRank).rankIndex+' 本地时钟')+' · '+next.unit;
 const data={...next,ariaLabel:'Rank 通信事件时间线',emptyLabel:'没有事件'};
 if(!deploymentTraceController){deploymentTraceController=PtoHierarchicalTimelinePattern.render(host,{data,onSelect:traceSelect,onWindowChange:window=>{deploymentTraceWindow=window;drawDeployment();}});
  host.querySelector('.pto-hierarchical-timeline__toolbar')?.remove();
 }else deploymentTraceController.setData(data);
 if(previousId!==next.id){deploymentTraceWindow=null;deploymentTraceController.setWindow(next.timeRange.min,next.timeRange.max);}
 deploymentTraceController.setActiveRows([activeRank]);deploymentTraceController.focusRelatedEventIds(next.events.filter(e=>e.rankId===activeRank&&e.occurrenceId===activeOccurrence).map(e=>e.id));
}
function toggleDeploymentTrace(value=!deploymentTraceOpen){deploymentTraceOpen=value;if(!value)deploymentTraceWindow=null;syncDeploymentTrace();drawDeployment();fitDeployment();}
deploymentTraceButton.onclick=()=>{toggleDeploymentTrace();setDeploymentSettings(false);};document.querySelector('#deployment-trace-close').onclick=()=>toggleDeploymentTrace(false);
