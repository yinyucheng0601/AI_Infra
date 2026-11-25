(function(global){
'use strict';
const NS='http://www.w3.org/2000/svg',ms=n=>Number(n).toFixed(3)+' ms';
function mount(root,data,options={}){
 const E=data.evidence,records=E.records,byId=new Map(records.map(r=>[r.id,r])),abort=new AbortController();
 const on=(e,n,f)=>e.addEventListener(n,f,{signal:abort.signal});
 const maxTime=Math.max(data.run.request.end,...records.map(r=>r.end)),full=[0,maxTime];
 let mode='overview',stepIndex=0,range=[...full],selected=null,related=new Map(),showPanel=false,help=false,drag=null,canvasScaleY=1;
 const hash=new URLSearchParams(options.syncHash?location.hash.slice(1):'');
 const found=data.steps.findIndex(s=>s.id===(hash.get('step')||options.step));if(found>=0)stepIndex=found;
 if(hash.get('view')==='detail'){mode='detail';range=stepRange(data.steps[stepIndex]);}
 root.classList.add('ev');root.innerHTML=`<header><h1></h1><div class="scope"></div></header>
 <nav class="view-controls" aria-label="时间尺度"><button data-mode="overview">Overview</button><button data-mode="detail">Step Detail</button><select class="step-picker" aria-label="选择调用组"></select><span class="view-note"></span><div class="tools"><button data-inspect aria-label="当前证据">证据</button><button data-info aria-label="数据口径与帮助">ⓘ</button></div></nav>
 <div class="stage"><svg tabindex="0" role="group" aria-label="Serving Host Device Runner Execution 时间轴"></svg></div>
 <aside class="evidence-panel" hidden></aside><div class="bottom-controls"><div class="navigator" aria-label="完整采集时间导航"></div></div><nav class="toolbar" aria-label="Canvas zoom"><button data-zoom="out">−</button><button data-zoom="in">＋</button><button data-fit>Fit</button></nav><div class="tip" role="tooltip" hidden></div>`;
 const $=s=>root.querySelector(s),svg=$('.stage svg'),panel=$('.evidence-panel'),tip=$('.tip'),picker=$('.step-picker');
 $('h1').textContent=data.run.title;$('.scope').textContent=E.requests.length+' requests · '+data.steps.length+' calls · '+ms(maxTime);
 for(const s of data.steps){const opt=document.createElement('option');opt.value=s.id;opt.textContent=s.label;picker.append(opt);}
 const stepSelector=TraceSelector.mount(picker);
 const navigation=SequenceNavigation.mount($('.navigator'),{variant:'time',full,items:data.steps.map(s=>({label:s.label,start:s.absoluteStart,end:s.absoluteEnd})),onSelect:i=>{stepIndex=i;selected=null;related.clear();view('detail');},onFocus:i=>{stepIndex=i;view('detail');},onRange:next=>{range=next;render();}});
 $('.navigator').querySelectorAll('button').forEach(b=>{b.removeAttribute('title');control(b,b.getAttribute('aria-label'));});
 const navWindow=$('.sequence-window');control(navWindow,'拖动平移时间窗；拖动两端缩放；方向键平移，＋ / − 缩放');
 function node(parent,tag,attrs={},value){const el=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,['y','y1','y2','height'].includes(k)&&typeof v==='number'?v*canvasScaleY:v);if(value!=null)el.textContent=value;parent.append(el);return el;}
 function text(parent,x,y,value,cls){return node(parent,'text',{x,y,class:cls||''},value);}
 function stepRange(s){const rs=s.rawEventIds.map(id=>byId.get(id)).filter(Boolean);const lo=Math.min(s.absoluteStart,...rs.map(r=>r.start)),hi=Math.max(s.absoluteEnd,...rs.map(r=>r.end)),pad=Math.max(.2,(hi-lo)*.04);return [Math.max(0,lo-pad),Math.min(maxTime,hi+pad)];}
 function sync(){options.onContextChange?.({step:data.steps[stepIndex].id,view:mode,range:[...range],selected});if(options.syncHash){const h=new URLSearchParams({view:mode,step:data.steps[stepIndex].id});history.replaceState(null,'','#'+h);}}
 function hideTip(){tip.hidden=true;}
 function showTip(value,e,el){tip.textContent=value;tip.hidden=false;const b=el?.getBoundingClientRect(),x=e?.clientX??b?.left??20,y=e?.clientY??b?.bottom??20;tip.style.left=Math.max(8,Math.min(innerWidth-tip.offsetWidth-12,x+14))+'px';tip.style.top=Math.max(8,Math.min(innerHeight-tip.offsetHeight-12,y+14))+'px';}
 function control(el,value){on(el,'pointerenter',e=>showTip(typeof value==='function'?value():value,e,el));on(el,'focus',()=>showTip(typeof value==='function'?value():value,null,el));on(el,'pointerleave',hideTip);on(el,'blur',hideTip);}
 function chooseEvent(r){
  const matching=data.steps.findIndex(s=>s.rawEventIds.includes(r.id));
  if(matching>=0)stepIndex=matching;
  selected=r.id;related=new Map([[r.id,'selected']]);
  // Limited graph traversal: retain exact/nesting chains and at most one temporal edge.
  let queue=[{id:r.id,depth:0,temporal:false}];
  while(queue.length){const q=queue.shift();if(q.depth>=3)continue;
   for(const l of E.links){const next=l.from===q.id?l.to:l.to===q.id?l.from:null;if(!next)continue;
    const temporal=l.basis==='temporal-candidate';if(temporal&&q.temporal)continue;
    const basis=temporal||q.temporal?'temporal-candidate':l.basis;
    if(related.has(next))continue;related.set(next,basis);queue.push({id:next,depth:q.depth+1,temporal:temporal||q.temporal});
   }
  }
  showPanel=true;help=false;render();renderPanel();
  // Consumers must resolve physical placement separately; no inferred lane/worker identity.
  root.dispatchEvent(new CustomEvent('trace-evidence-selection',{bubbles:true,detail:{eventId:r.id,start:r.start,end:r.end,observedWorkerId:r.track==='runtime'?r.args.worker_id??null:null,runId:r.args.run_id??null,dispatchId:r.args.dispatch_id??null,evidence:'observed-host-runtime',physicalMappingVerified:false,networkPath:null,moeCommunication:null,layerProgress:null}}));
 }
 function recordTip(r){return r.name+'\n'+ms(r.start)+' → '+ms(r.end)+' · '+ms(r.end-r.start)+'\nPID '+r.pid+' · TID '+r.tid+'\n'+Object.entries(r.args).filter(([k])=>['run_id','dispatch_id','worker_id','step_id','inv','batch_size','actual_batch','new_tokens'].includes(k)).map(([k,v])=>k+'='+v).join(' · ');}
 function mark(r,y,h,X,parent=svg,value){
  if(r.end<range[0]||r.start>range[1])return;
  const state=related.get(r.id),fill=r.id===selected?'#e5df91':state==='temporal-candidate'?'#c09257':state?'#d4ce87':'#858585';
  const x=X(Math.max(r.start,range[0])),w=Math.max(.7,X(Math.min(r.end,range[1]))-x);
  const task=['scheduler','executor','orchestration','runtime','bind','runner'].includes(r.track);
  if(task){const thin=1.4*740/Math.max(1,$('.stage').clientHeight,options.minCanvasHeight||0);y+=(h-thin)/2;h=thin;}
  const group=node(parent,'g',{'data-event':r.id,tabindex:0,role:'button','aria-label':r.name+' '+ms(r.end-r.start)});
  node(group,'rect',{x,y:y-3,width:Math.max(3,w),height:h+6,fill:'transparent'});
  node(group,'rect',{x,y,width:w,height:h,rx:0,fill,opacity:selected&&!state?'.4':'1','pointer-events':'none'});
  const rect=group;on(rect,'pointerenter',e=>showTip(value||recordTip(r),e,rect));on(rect,'focus',()=>showTip(value||recordTip(r),null,rect));on(rect,'pointerleave',hideTip);on(rect,'blur',hideTip);on(rect,'click',e=>{e.stopPropagation();chooseEvent(r);});on(rect,'keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();chooseEvent(r);}});
 }
 function diagnostic(s){
  const a=s.lanes,latest=a.reduce((p,c)=>p.rrStart>c.rrStart?p:c),last=a.reduce((p,c)=>p.rrEnd>c.rrEnd?p:c);
  return {entry:Math.max(...a.map(l=>l.rrStart))-Math.min(...a.map(l=>l.rrStart)),completion:Math.max(...a.map(l=>l.rrEnd))-Math.min(...a.map(l=>l.rrEnd)),latest:last.dev===latest.dev,tail:Math.max(0,last.rrEnd-Math.max(...a.filter(l=>l!==last).map(l=>l.rrEnd))),last,latestEntry:latest};
 }
 function renderPanel(){
  panel.hidden=!showPanel;if(!showPanel)return;panel.replaceChildren();
  const close=document.createElement('button');close.className='panel-close';close.textContent='×';close.setAttribute('aria-label','关闭证据');on(close,'click',()=>{showPanel=false;panel.hidden=true;});control(close,'关闭证据并保留视角与选择');panel.append(close);
  const h=document.createElement('h2');panel.append(h);
  const para=value=>{const p=document.createElement('p');p.textContent=value;panel.append(p);};
  if(help){h.textContent='Trace 证据与操作';
   for(const s of ['Overview 显示完整采集，Step Detail 单独放大一组调用；两者均保持真实线性时间。滚轮缩放、拖动画布平移，底部 Overview 可定位时间。','Serving：Request Lifecycle 使用请求 ID 配对的起始与流式结束；Actual Batch Size 使用实际采集字段；Token Output 为服务端 new_tokens，不是客户端送达时间。','Host：Scheduler 属于 API 进程；Executor / WorkerProcess 属于共享服务 Worker 进程；Per-worker Runtime 使用 node.* 的 worker_id。chip child PID 序号不等于 worker_id。','Device Runner Execution：Host 侧 chip.run.runner_run 调用窗，不能据此计算芯片有效利用率或算子执行时长。','选中为浅黄填充。字段匹配 / 同线程嵌套为浅黄关联，跨层时间候选为棕橙色。Entry / Completion Skew 为时间差异，不自动判定异常。','Critical-path Impact 尚无因果证据；只展示观测尾差与末端 lane，不能把相关性解释为收益估算。','Deployment × Lingqu 接口只发送观测到的 Runtime worker_id；没有物理映射时不高亮硬件。网络路径、MoE 通信、模型 Layer 进度不由这份 Trace 驱动。'])para(s);
   const a=document.createElement('a');a.href=data.run.provenanceFile;a.textContent='数据来源与指纹';panel.append(a);return;
  }
  const r=byId.get(selected),s=data.steps[stepIndex],d=diagnostic(s);
  h.textContent=r?r.name:s.label;
  if(r){para(recordTip(r));const pre=document.createElement('pre');pre.textContent=JSON.stringify(r.args,null,2);panel.append(pre);
   const edges=E.links.filter(l=>l.from===r.id||l.to===r.id);
   para('直接关联 '+edges.length+' 条 · 可选高亮含最多 3 跳关系，最多经过一次时间候选');
   for(const l of edges.slice(0,12)){const other=byId.get(l.from===r.id?l.to:l.from);para((other?.name||'')+' · '+l.basis+' · '+l.fields.join(' + '));}
  }
  const dh=document.createElement('h2');dh.textContent=s.label+' · 时间差异';panel.append(dh);
  const dl=document.createElement('dl');for(const [k,v]of [['Entry Skew',ms(d.entry)],['Completion Skew',ms(d.completion)],['末端尾差',ms(d.tail)],['末端 lane',String(d.last.dev)],['最晚进入 lane',String(d.latestEntry.dev)]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;dd.className='skew';dl.append(dt,dd);}panel.append(dl);
  para('Critical-path Impact：未确认。末端尾差 = 最晚 runner 结束 − 次晚 runner 结束；该差值不是优化后的收益。');
 }
 function render(){
  hideTip();svg.replaceChildren();const width=$('.stage').clientWidth,height=Math.max($('.stage').clientHeight,options.minCanvasHeight||0);svg.style.height=height+'px';
  const W=width,H=740;canvasScaleY=height/H;svg.setAttribute('viewBox','0 0 '+W+' '+height);svg.setAttribute('preserveAspectRatio','xMinYMin meet');
  const left=W<800?142:172,right=W-18,X=t=>left+(t-range[0])/(range[1]-range[0])*(right-left);
  const defs=node(svg,'defs'),clip=node(defs,'clipPath',{id:'evidence-clip'});node(clip,'rect',{x:left,y:0,width:right-left,height:H});
  const plot=node(svg,'g',{'clip-path':'url(#evidence-clip)'});
  const label=(name,y,fullName=name)=>{const el=text(svg,20,y+7,name,'sublabel');el.setAttribute('tabindex','0');el.setAttribute('role','img');el.setAttribute('aria-label',fullName);el.classList.add('lane-label');on(el,'pointerenter',e=>showTip(fullName,e,el));on(el,'focus',()=>showTip(fullName,null,el));on(el,'pointerleave',hideTip);on(el,'blur',hideTip);return el;};
  const row=(name,y,fullName=name)=>{label(name,y,fullName);node(plot,'line',{x1:left,x2:right,y1:y+11,y2:y+11,stroke:'#222'});};
  text(svg,20,20,'Serving','layer');
  row('Requests',34,'Request Lifecycle · '+E.requests.length+' requests · start / queued / stream finished');
  E.requests.forEach((q,i)=>{
   const r=byId.get(q.eventIds.find(id=>byId.get(id).name==='http.stream_completion')||q.eventIds[0]);
   mark({...r,start:q.start,end:q.end??maxTime},35+i*2.1,1.4,X,plot,q.id+'\nstart '+ms(q.start)+'\nqueued '+(q.queued==null?'unknown':ms(q.queued))+'\nfinished '+(q.end==null?'not observed':ms(q.end)));
  });
  E.requests.forEach((q,i)=>{if(q.queued!=null&&q.queued>=range[0]&&q.queued<=range[1])node(plot,'rect',{x:X(q.queued),y:34+i*2.1,width:1,height:3,fill:'#bbb','pointer-events':'none'});});
  row('Batch Size',82,'Actual Batch Size · 实际采集的 Prefill / Decode batch');let lastBatchLabel=-Infinity;const peak=Math.max(1,...E.batchSamples.map(b=>b.value||0));
  for(const b of E.batchSamples){const r=byId.get(b.eventId);mark(r,96-b.value/peak*14,Math.max(2,b.value/peak*14),X,plot,b.kind+' · actual batch '+b.value+'\n'+recordTip(r));if(r.start>=range[0]&&r.start<=range[1]&&X(r.start)-lastBatchLabel>35){text(plot,X(r.start)+3,79,String(b.value));lastBatchLabel=X(r.start);}}
  row('Token Output',110,'Token Output · '+E.tokenSamples.reduce((n,t)=>n+(t.value||0),0)+' new_tokens · 服务端输出处理');
  for(const t of E.tokenSamples){const r=byId.get(t.eventId);mark(r,117-Math.min(12,t.value??0),Math.max(2,Math.min(12,t.value??0)),X,plot,'Server output · '+t.value+' new_tokens\n'+recordTip(r));}
  text(svg,20,146,'Host','layer');
  for(const [track,y,name]of [['scheduler',161,'Scheduler'],['executor',183,'Executor']]){
   row(name,y,track==='scheduler'?'Global Scheduler · API process · scheduler.*':'Executor · shared serving worker process · PyptoExecutor.*');for(const r of records.filter(r=>r.track===track&&(track!=='executor'||r.name.startsWith('PyptoExecutor.'))))mark(r,y,8,X,plot);
  }
  for(const [phase,y,name]of [['prepare',205,'Prepare'],['dispatch',219,'Dispatch'],['reclaim',233,'Reclaim']]){
   row(name,y,'WorkerProcess · '+phase+' · shared serving worker process');for(const r of records.filter(r=>r.track==='orchestration'&&(phase==='dispatch'?/dispatch_decode|batch_prefill|batch_decode/.test(r.name):r.name.includes(phase+'_decode'))))mark(r,y,6,X,plot);
  }
  label('Runtime',246,'Per-worker Runtime · node.submit / node.dispatch / node.frame_submit / node.complete · worker_id 0–15');
  for(let dev=0;dev<16;dev++){const y=259+dev*8;text(svg,left-26,y+6,String(dev),'row-number');for(const r of records.filter(r=>r.track==='runtime'&&r.args.worker_id===dev))mark(r,y+(['node.submit','node.dispatch','node.frame_submit','node.complete'].indexOf(r.name))*1.4,1.2,X,plot);}
  label('Bind',392,'Host bind · chip.run.bind · chip child PID ordinal，非物理设备编号');
  const pids=[...new Set(records.filter(r=>r.track==='bind').map(r=>r.pid))].sort((a,b)=>a-b);
  pids.forEach((pid,i)=>{const y=408+i*7;text(svg,left-26,y+5,String(i),'row-number');for(const r of records.filter(r=>r.track==='bind'&&r.pid===pid))mark(r,y,4,X,plot);});
  text(svg,20,546,'Device','layer');label('Runner',556,'Device Runner Execution · chip.run.runner_run · Host-side 调用窗，非芯片算子有效计算时间');
  pids.forEach((pid,i)=>{const y=574+i*8;text(svg,left-26,y+6,String(i),'row-number');for(const r of records.filter(r=>r.track==='runner'&&r.pid===pid))mark(r,y,5,X,plot);});
  const s=data.steps[stepIndex],d=diagnostic(s);
  text(svg,left,732,s.id+' · Entry Skew '+ms(d.entry)+'   Completion Skew '+ms(d.completion),'sublabel').setAttribute('style','fill:#e5a352');
  const span=range[1]-range[0],unit=Math.pow(10,Math.floor(Math.log10(span/6))),tick=Math.max(.001,Math.ceil(span/6/unit)*unit);
  for(let t=Math.ceil(range[0]/tick)*tick;t<=range[1];t+=tick){const x=X(t);node(svg,'line',{x1:x,x2:x,y1:697,y2:702,stroke:'#777'});text(svg,x,713,mode==='detail'?(t-s.absoluteStart).toFixed(2)+' ms':t>=1000?(t/1000).toFixed(2)+' s':t.toFixed(tick<1?2:0)+' ms');}
  navigation.update({index:stepIndex,range});
  root.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  picker.value=s.id;stepSelector.sync();$('.view-note').textContent=(mode==='overview'?'完整采集':'相对调用起点')+' · '+ms(span);
  renderPanel();
 }
 function view(next){mode=next;range=mode==='overview'?[...full]:stepRange(data.steps[stepIndex]);sync();render();}
 root.querySelectorAll('[data-mode]').forEach(b=>{on(b,'click',()=>view(b.dataset.mode));control(b,b.dataset.mode==='overview'?'查看完整采集的真实时间比例':'放大当前调用组，保留真实线性时间');});
 on(picker,'change',()=>{stepIndex=data.steps.findIndex(s=>s.id===picker.value);selected=null;related.clear();view('detail');});
 function bounded(a,b){const w=Math.min(maxTime,Math.max(.1,b-a)),start=Math.max(0,Math.min(maxTime-w,a));return[start,start+w];}
 function zoom(f,anchor=.5){const w=range[1]-range[0],at=range[0]+w*anchor;range=bounded(at-w*f*anchor,at+w*f*(1-anchor));render();}
 root.querySelectorAll('[data-zoom]').forEach(b=>{on(b,'click',()=>zoom(b.dataset.zoom==='in'?.65:1.5));control(b,b.dataset.zoom==='in'?'放大当前时间窗':'缩小当前时间窗');});
 on($('[data-fit]'),'click',()=>view(mode));control($('[data-fit]'),'恢复当前 Overview 或 Step Detail 的完整时间窗');
 on($('[data-info]'),'click',()=>{help=!help;showPanel=help;renderPanel();});control($('[data-info]'),'查看数据来源、关系口径与操作方法');
 on($('[data-inspect]'),'click',()=>{help=false;showPanel=!showPanel;renderPanel();});control($('[data-inspect]'),'查看选中事件、关联字段与时间偏差');
 on(svg,'wheel',e=>{e.preventDefault();const b=svg.getBoundingClientRect(),left=b.width<800?142:172;zoom(Math.exp(Math.max(-100,Math.min(100,e.deltaY))*.004),Math.max(0,Math.min(1,(e.clientX-b.left-left)/(b.width-left-18))));});
 on(svg,'pointerdown',e=>{if(e.target.closest('[data-event]'))return;drag={x:e.clientX,range:[...range]};svg.setPointerCapture(e.pointerId);});
 on(svg,'pointermove',e=>{if(!drag)return;const delta=(e.clientX-drag.x)/Math.max(100,svg.clientWidth-(svg.clientWidth<800?142:172)-18)*(drag.range[1]-drag.range[0]);range=bounded(drag.range[0]-delta,drag.range[1]-delta);render();});
 on(svg,'pointerup',()=>drag=null);on(svg,'pointercancel',()=>drag=null);
 on(root,'keydown',e=>{if(e.key==='Escape'){selected=null;related.clear();showPanel=false;help=false;render();}if(['ArrowLeft','ArrowRight'].includes(e.key)&&e.target.tagName!=='SELECT'&&!e.target.closest('.trace-selector,.navigator')){e.preventDefault();stepIndex=Math.max(0,Math.min(data.steps.length-1,stepIndex+(e.key==='ArrowRight'?1:-1)));view('detail');}});
 const observer=new ResizeObserver(render);observer.observe(root);sync();render();
 return{getState:()=>({step:data.steps[stepIndex].id,view:mode,range:[...range],selected,related:[...related]}),selectEvent:id=>{const r=byId.get(id);if(!r)throw Error('Unknown event');chooseEvent(r);},setRange:next=>{if(!Array.isArray(next)||next.length!==2||!next.every(Number.isFinite)||next[0]>=next[1])throw Error('Invalid range');range=[Math.max(0,next[0]),Math.min(maxTime,next[1])];render();},setStep:id=>{const i=data.steps.findIndex(s=>s.id===id);if(i<0)throw Error('Unknown step');stepIndex=i;selected=null;related.clear();view('detail');},destroy:()=>{observer.disconnect();stepSelector.destroy();navigation.destroy();abort.abort();root.replaceChildren();root.classList.remove('ev');}};
}
global.TraceEvidenceView={mount};
})(window);
