/* Source-ordered events: no per-event clock or overlap is inferred. */
let executionStep=0,executionKey='',reuseViewer=[],lastQueueTensor=null,reuseSplit=false,reuseMainView=null,queueCursorTick=null,reuseDataKey='';
const eventBarCache=new Map();
function executionModel(){
 const c=config(),split=selected().template==='row_split_2pass',cols=c.shape[1],b=c.dtype==='fp32'?4:2,n=split&&c.dtype==='fp32'?Math.ceil(cols/4096):1,events=[],life=[];
 const add=(lane,label,id,extra={})=>{const e={lane,label,id,...extra};events.push(e);return events.length-1};
 if(!split){
 add(0,'γ → UB','weight');const start=add(0,'X → UB','x',{bytes:cols*b});add(1,'Σx² → rstd','vf');const norm=add(1,'X · rstd · γ','scale');const out=add(2,'Y → GM','y');
 life.push({name:'X · 保留并复用',start,end:norm+1,size:cols*b,id:'x'},{name:'γ · 常驻当前核',start:0,end:events.length,size:cols*b,id:'weight'},{name:'rstd',start:2,end:norm+1,size:4,id:'vf'},{name:'Y',start:norm,end:out+1,size:cols*b,id:'y'});
 }else{
 for(let k=0;k<n;k++){const size=Math.min(c.dtype==='fp32'?4096:cols,cols-k*(c.dtype==='fp32'?4096:cols))*b,start=add(0,`X[${k}] 首读`,'x',{bytes:size,chunk:k});add(1,`Σx[${k}]²`,'vf');life.push({name:`X[${k}] · 第一遍`,start,end:events.length,size,id:'x'});}
 const reduction=add(1,'合并 → rstd','vf');life.push({name:'部分和 → rstd',start:1,end:0,size:n*4+4,id:'vf'});
 for(let k=0;k<n;k++){const size=Math.min(c.dtype==='fp32'?4096:cols,cols-k*(c.dtype==='fp32'?4096:cols))*b,start=add(0,`X[${k}] 再读`,'reread',{bytes:size,reread:true,chunk:k});const g=add(0,`γ[${k}] → UB`,'weight');const norm=add(1,`X[${k}] · rstd · γ`,'scale');const out=add(2,`Y[${k}] → GM`,'y');life.push({name:`X[${k}] · 第二遍`,start,end:norm+1,size,id:'reread'},{name:`γ[${k}]`,start:g,end:norm+1,size,id:'weight'},{name:`Y[${k}]`,start:norm,end:out+1,size,id:'y'});}
 life.find(l=>l.end===0).end=events.length;
 }
 return {events,life,split,n};
}
const hardwareColors={storage:'#3B79D2',transfer:'#FFE300',compute:'#0BB48E'};
function taskImage(label,w,active,reread,lane){const key=[label,w,active,reread,lane].join('|');if(eventBarCache.has(key))return eventBarCache.get(key);const canvas=document.createElement('canvas');canvas.width=Math.ceil(w*2);canvas.height=72;const ctx=canvas.getContext('2d');ctx.scale(2,2);PtoSwimlaneTaskPattern.drawTaskBar(ctx,{x:0,y:0,width:w,height:36,task:{label},baseColor:active?(lane===1?hardwareColors.compute:hardwareColors.transfer):'#55595d',fontFamily:'monospace'});const data=canvas.toDataURL();eventBarCache.set(key,data);return data}
function setExecutionStep(i,fromQueue=false){if(!fromQueue){lastQueueTensor=null;queueCursorTick=null}state.finding=null;state.queueSource=null;executionStep=Math.max(0,Math.min(executionModel().events.length-1,i));state.object=executionModel().events[executionStep].id;render()}

function executionAction(action){if(action==='reuse')openQueueViewer()}
function queueLifetimeData(){
 const c=config(),a=selected(),split=a.template==='row_split_2pass',k=a.kernel;if(c.dtype!=='fp32'||!k)return null;
 const {events,life,n}=executionModel(),rowBytes=Math.ceil(c.shape[1]*4/1024)*1024,rf=k.row_factor||1,tileBytes=rf*rowBytes,totalGroups=Math.ceil(k.rows_per_core/rf),shownGroups=Math.min(3,totalGroups);
 const q=split?[['inQ',32768],['gQ',32768],['outQ',32768],['rstdBuf',32],['workBuf',256]]:[['inQ',2*tileBytes],['gammaQ',rowBytes],['outQ',2*tileBytes],['rstdBuf',256]];
 const ticks=split?events.length:1+4*shownGroups,tensors=[],last={};
 function add(buffer,name,size,start,end,line,freeLine,event,kind='temp'){
  const id=buffer+'-'+tensors.length,previous=last[buffer],reuse=previous&&previous.freeTick<=start?previous:null;
  const item={id,name,buffer,offset:0,size,allocTick:start,freeTick:end,kind,reuseOf:reuse?.id||null,reusedBy:[],srcFile:K,srcLineStart:line,srcLineEnd:freeLine||line,srcHotLine:line,eventIndex:event,relation:'same queue allocator; physical slot is not resolved',code:DATA.sources[K].text.split('\n').slice(line-1,line+1).join('\n')+(freeLine?'\n…\n'+DATA.sources[K].text.split('\n')[freeLine-1]:''),cce:''};
  if(reuse)reuse.reusedBy.push(id);tensors.push(item);last[buffer]=item;
 }
 if(split){
  for(const l of life){if(l.id==='vf')continue;const buffer=l.id==='weight'?'gQ':l.id==='y'?'outQ':'inQ',second=l.id==='reread',ln=l.id==='weight'?280:l.id==='y'?285:second?277:263,fr=l.id==='weight'?289:l.id==='y'?292:second?288:268;
   add(buffer,l.name,l.size,l.start,l.end,ln,fr,l.start,second?'loop':'temp');}
  add('rstdBuf','rstd 工作区',32,0,ticks,243,null,2*n,'resident');add('workBuf','部分和工作区',256,0,ticks,244,null,1,'resident');
 }else{
  add('gammaQ','γ · 当前核常驻',rowBytes,0,ticks,188,221,0,'resident');
  for(let g=0;g<shownGroups;g++){const base=1+g*4;add('inQ',`X · 行组 ${g}`,tileBytes,base,base+3,204,215,1,g?'loop':'temp');add('outQ',`Y · 行组 ${g}`,tileBytes,base+2,base+4,211,219,3,g?'loop':'temp');}
  add('rstdBuf','rstd 工作区',256,0,ticks,181,null,2,'resident');
 }
 return {kernel:split?'rms_norm_split · Alloc / Free':'rms_norm_full · Alloc / Free',ticks,buffers:q.map(([name,capacity])=>({name,capacity})),tensors,sourceFiles:[],summary:split?`单行 ${n} 块：inQ ${2*n} 次申请，gQ / outQ 各 ${n} 次。`:`当前核前 ${shownGroups} / ${totalGroups} 个行组，rowFactor = ${rf}。`};
}

function destroyQueueOverview(){reuseViewer.forEach(v=>v.destroy());reuseViewer=[];}
function openQueueViewer(){
 const data=queueLifetimeData();if(!data)return;destroyQueueOverview();lastQueueTensor=null;queueCursorTick=null;reuseDataKey=executionKey;if(!reuseSplit){reuseMainView={...view};reuseSplit=true;document.body.classList.add('reuse-split');$('reuseWindow').show();fit();}
 const reserved=data.buffers.reduce((n,b)=>n+b.capacity,0),peak=Math.max(...Array.from({length:data.ticks},(_,i)=>data.tensors.filter(t=>t.allocTick<=i&&i<t.freeTick).reduce((n,t)=>n+t.size,0)));
 $('reuseHost').innerHTML=`<div id="queueHelp" hidden><div class="queue-info-metrics"><span>预留 <b>${kib(reserved)}</b></span><span>最大同时申请 <b>${kib(peak)}</b></span></div><p>横向区分队列，纵向共用源码步骤。每个区间表示一次申请到释放；同队列再次申请不指定物理槽号。</p><p>横轴各列为独立队列，每列从0比较请求尺寸；横向滚动查看全部队列。峰值曲线表示当前步骤的申请量，不表示告警。点击区间联动主体事件；Ctrl / ⌘ 滚轮不改变各列的共同纵轴。</p><div class="queue-legend"><span><i style="background:#858585"></i>未关联申请</span><span><i style="background:#B1EF6B"></i>X / Y</span><span><i style="background:#BCA0F3"></i>γ</span><span><i style="background:#F2C45F"></i>部分和 / rstd</span><span><i class="peak-key"></i>当前申请量</span></div></div><div class="queue-scroll" tabindex="0" aria-label="横向滚动查看全部队列"><div class="queue-columns">${data.buffers.map((b,i)=>`<section class="queue-column"><h3>${esc(b.name)} <small>预留 ${b.capacity<1024?b.capacity+' B':kib(b.capacity)}</small></h3><div id="queuePlot${i}" class="queue-plot"></div></section>`).join('')}</div></div>`;
 data.buffers.forEach((buffer,i)=>{const subset={...data,buffers:[buffer],tensors:data.tensors.filter(t=>t.buffer===buffer.name)};const v=PtoMemoryReuseViewer.render($('queuePlot'+i),subset,{initialBuffer:buffer.name});reuseViewer.push(v);v.state.showPeak=true;v.root.querySelector('[data-reuse-toggle="peak"]')?.remove();v.root.querySelectorAll('[title]').forEach(el=>el.removeAttribute('title'));});
 $('queueInfo').onclick=()=>{$('queueHelp').hidden=!$('queueHelp').hidden;$('queueInfo').setAttribute('aria-expanded',String(!$('queueHelp').hidden))};
 const scroll=$('reuseHost').querySelector('.queue-scroll');scroll.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();scroll.scrollLeft=e.key==='Home'?0:e.key==='End'?scroll.scrollWidth:scroll.scrollLeft+(e.key==='ArrowRight'?1:-1)*scroll.clientWidth*.8}});scroll.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();e.stopImmediatePropagation();return}if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){scroll.scrollLeft+=e.deltaY;e.preventDefault();e.stopImmediatePropagation()}},{capture:true,passive:false});
 requestAnimationFrame(()=>{reuseViewer.forEach(v=>v.resize());syncQueueSelection()});
}
$('reuseHost').addEventListener('pto-memory-reuse-open-source',e=>{if(!reuseSplit)closeQueueOverview();state.object=e.detail.tensor?.buffer==='gQ'||e.detail.tensor?.buffer==='gammaQ'?'weight':'ub';state.source='kernel';state.queueSource=e.detail.tensor?[e.detail.tensor.srcLineStart,e.detail.tensor.srcLineEnd]:null;$('sourcePanel').hidden=false;sourceRecord()});
$('reuseHost').addEventListener('pto-memory-reuse-tensor-select',e=>{lastQueueTensor=e.detail.tensor;queueCursorTick=lastQueueTensor?.allocTick;const i=e.detail.tensor?.eventIndex;if(Number.isInteger(i)){setExecutionStep(i,true);if(reuseSplit){const x=220+(executionStep+.5)*1400/executionModel().events.length,screenX=view.x+x*view.scale;if(screenX<24||screenX>innerWidth*.5-24){view.x=innerWidth*.25-x*view.scale;transform()}}}});

function eventSourceLine(e){const split=selected().template==='row_split_2pass';return split?({weight:281,x:264,reread:278,scale:286,y:291}[e.id]||(e.label.includes('合并')?270:267)):({weight:189,x:205,vf:210,scale:213,y:218}[e.id]||198)}
function eventHardwarePath(){const e=executionModel().events[executionStep];return !e?'':e.lane===0?'GM → L2 → MTE2 → UB':e.lane===1?'UB ↔ SIMD / Vector':'UB → MTE3 → L2 → GM'}
function syncImplementation(){const c=config(),a=selected(),options=c.alternatives.filter(v=>v.feasible),control=$('implementationPicker'),fixed=$('implementationFixed');control.hidden=options.length<2;fixed.hidden=options.length>1;if(options.length>1){$('implementationTrigger').textContent=a.template==='row_resident_1pass'?'整行驻留':'两遍分块';$('implementationMenu').innerHTML=options.map(v=>`<button role="option" aria-selected="${v.template===a.template}" data-mode="${v.template==='row_resident_1pass'?'full':'split'}" data-tip="切换到${v.template==='row_resident_1pass'?'整行驻留':'两遍分块'}实现">${v.template==='row_resident_1pass'?'整行驻留':'两遍分块'}</button>`).join('')}else{fixed.textContent='两遍分块';fixed.dataset.tip=`整行 live ${kib(c.resident_footprint_bytes)} 超过可用 UB ${kib(DATA.ub_bytes)}，当前仅有分块估算`;fixed.tabIndex=0}}

function prepareExecution(){const key=config().shape.join()+'/'+config().dtype+'/'+selected().template;if(executionKey!==key){executionKey=key;executionStep=0;state.finding=null;state.queueSource=null;state.object=executionModel().events[0].id;}}

function closeQueueOverview(){const win=$('reuseWindow'),restore=reuseSplit&&reuseMainView?{...reuseMainView}:null;win.close();reuseSplit=false;reuseMainView=null;document.body.classList.remove('reuse-split');if(restore){Object.assign(view,restore);transform()}$('reuseSplit').setAttribute('aria-pressed','false');destroyQueueOverview();}
function syncQueueSelection(){
 if(!reuseViewer.length||!$('reuseWindow').open)return;if(reuseDataKey!==executionKey){if(!queueLifetimeData()){closeQueueOverview();return}openQueueViewer()}const tick=queueCursorTick??executionStep;
 for(const v of reuseViewer){const active=v.data.tensors.find(t=>t.allocTick<=tick&&tick<t.freeTick);v.state.selected=active?.id||null;if(!lastQueueTensor){v.detailPopover.hidden=true;v.tip.style.display='none'}v.draw()}
 if(reuseSplit&&!lastQueueTensor){const object=executionModel().events[executionStep]?.id,buffer=object==='weight'?(selected().template==='row_split_2pass'?'gQ':'gammaQ'):object==='y'||object==='scale'?'outQ':object==='vf'?'workBuf':'inQ',i=reuseViewer.findIndex(v=>v.data.buffers[0].name===buffer);if(i>=0){const sc=$('reuseHost').querySelector('.queue-scroll'),col=sc.querySelectorAll('.queue-column')[i];if(col.offsetLeft<sc.scrollLeft||col.offsetLeft+col.offsetWidth>sc.scrollLeft+sc.clientWidth)sc.scrollLeft=col.offsetLeft-sc.querySelector('.queue-columns').offsetLeft;}}
}
$('reuseSplit').hidden=true;$('reuseClose').onclick=closeQueueOverview;


function renderComparison(){
 prepareExecution();const c=config(),a=selected(),{events,life,split,n}=executionModel();
 executionStep=Math.min(executionStep,events.length-1);const current=events[executionStep];
 $('identity').textContent=`${c.shape.join(' × ')} · ${c.dtype.toUpperCase()} · ${DATA.revision.slice(0,12)}`;$('caseName').textContent=`${c.shape.join(' × ')} / ${c.dtype.toUpperCase()}`;
 syncImplementation();
 const x0=220,ww=1400,cw=ww/events.length,at=i=>x0+i*cw,rh=104,ys=[140,140+rh,140+2*rh],my=ys[2]+rh+65;
 let s=' '+tx(25,49,c.dtype==='fp32'?(split?`${n} chunks · 4096 elements / chunk`:'整行 X 保留至归一化'):'BF16 · flow 聚合依赖','muted');
 s+=hit('estimate',`<rect data-focus-target="estimate" class="hit" x="1245" y="-2" width="380" height="60" rx="7" fill="transparent"/>`+tx(1610,20,a.feasible?`${fmt(a.result.theoretical_time_us)} µs`:'容量不满足','lane-title local-label')+tx(1610,46,'全张量 · 模型估算','muted local-sub'),'核对整张量模型时延与带宽口径');
 const phase=(l,r,name)=>{s+=`<path d="M${at(l)} 79H${at(r)-8}" stroke="#505050"/>`+tx(at(l)+5,71,name,'phase-label')};
 if(split){phase(0,n*2,'第一遍 · 平方和');phase(n*2,n*2+1,'rstd');phase(n*2+1,events.length,'第二遍 · 重读与归一化')}else{phase(0,2,'装入');phase(2,4,'归约 → 归一化');phase(4,5,'写回')}
 for(let i=0;i<events.length;i++)s+=`<rect x="${at(i)}" y="88" width="${cw}" height="29" fill="${i===executionStep?getComputedStyle(document.documentElement).getPropertyValue('--hi').trim():'transparent'}"/><text x="${at(i)+cw/2}" y="108" text-anchor="middle" font-size="12" fill="${i===executionStep?'#111':'#aaa'}">${i+1}</text>`;
 if(state.object==='estimate')s+=`<rect data-focus-target="resources" x="18" y="128" width="1610" height="${3*rh-4}" fill="#ffffff0c"/>`;
 const names=['MTE2','Vector','MTE3'],subs=['GM → UB','归约 / 归一化','UB → GM'];
 names.forEach((name,k)=>{const y=ys[k];s+=`<rect x="18" y="${y-8}" width="1610" height="${rh-14}" fill="${state.object==='estimate'?'#292929':k%2?'#171717':'#141414'}"/>`+tx(30,y+19,name,'resource-label')+tx(30,y+43,subs[k],'muted');if(state.object==='estimate'&&a.feasible)s+=tx(30,y+75,fmt([a.result.mte2_time_us,a.result.vector_time_us,a.result.mte3_time_us][k])+' µs · 总需求','muted');

 });
 s+=`<g tabindex="0" role="note" aria-label="源码步骤轴说明" data-tip="源码步骤顺序，等宽排列，非时间轴；横向距离不表示耗时或重叠。"><rect x="220" y="55" width="1400" height="66" fill="transparent" pointer-events="all"/></g>`;
 // Only immediate dependencies of the selected source event are shown.
 for(const i of [executionStep-1,executionStep]){if(i<0||i>=events.length-1)continue;const e=events[i],d=events[i+1];s+=`<path d="M${at(i+1)-7} ${ys[e.lane]+17}H${at(i+1)}V${ys[d.lane]+17}H${at(i+1)+5}" fill="none" stroke="#bdbdbd" stroke-width="1.5" marker-end="url(#arrow)"/>`;}
 function short(e,i){if(!split)return e.id==='weight'?'γ → UB':e.id==='x'?'X → UB':e.id==='vf'?'Σx² → rstd':e.id==='scale'?'X · rstd · γ':'Y → GM';const m=e.label.match(/\[(\d+)\]/),k=m?m[1]:'';return e.id==='x'||e.id==='reread'?'X'+k:e.id==='weight'?'γ'+k:e.id==='y'?'Y'+k:e.id==='scale'?'×'+k:k!==''?'Σ'+k:'rstd'}
 events.forEach((e,i)=>{const w=cw-8,y=ys[e.lane],shortName=short(e,i);s+=`<g class="event-button" data-step="${i}" role="button" tabindex="0" aria-label="${esc(e.label)}" data-tip="${esc(e.label)} · 点击查看当前事件证据"><image x="${at(i)+4}" y="${y}" width="${w}" height="36" href="${taskImage(shortName,w,i===executionStep,e.reread,e.lane)}"/></g>`});
 s+=hit('ub',`<rect class="hit" x="20" y="${my-38}" width="215" height="38" rx="7" fill="transparent"/>`+tx(30,my-10,'UB · 数据驻留','resource-label local-label'),'定位 UB 数据驻留与队列复用');if(state.object==='ub')s+=tx(275,my-10,`模型 live ${kib(c.resident_footprint_bytes)} / 可用 ${kib(DATA.ub_bytes)} · Kernel ${a.kernel?kib(a.kernel.allocation_bytes):'—'}`,'caption');if(state.object==='ub')s+=`<rect data-focus-target="ub" x="20" y="${my+8}" width="1600" height="235" rx="6" fill="#ffffff14"/>`;
 state.memoryAnchor={x:1620,y:my-36};$('memoryReuseButton').hidden=c.dtype!=='fp32';
 const track=l=>l.id==='x'||l.id==='reread'?0:l.id==='weight'?1:l.id==='vf'?2:3;
 ['X','γ','部分和 / rstd','Y'].forEach((name,k)=>s+=tx(60,my+38+k*56,name,'life-label')+`<path d="M220 ${my+53+k*56}H1620" stroke="#292929"/>`);
 for(const l of life){const y=my+17+track(l)*56,w=(l.end-l.start)*cw-8,live=l.start<=executionStep&&executionStep<l.end;const match=l.name.match(/\[(\d+)\]/),label=match?(l.id==='weight'?'γ':l.id==='y'?'Y':'X')+match[0]:l.id==='x'?'X · 保留':l.id==='weight'?'γ · 常驻':l.id==='vf'?'部分和 → rstd':'Y';
  s+=`<g data-step="${l.start}" class="event-button" role="button" tabindex="0" aria-label="检查 ${esc(l.name)} 存活区间" data-tip="${esc(l.name)} · ${kib(l.size)} · 步骤 ${l.start+1}—${l.end}">${live?`<rect class="tensor-live-marker" x="${at(l.start)}" y="${y-4}" width="${w+8}" height="43" rx="7"/>`:''}${GridTensor.render(at(l.start)+4,y,w,label,live?(l.id==='weight'?VisualSystem.tokens.role.weight:l.id==='vf'?VisualSystem.tokens.role.aggregate:VisualSystem.tokens.role.activation):'#858585',l.id)}</g>`;
 }

 const cm=current.label.match(/\[(\d+)\]/);if(split&&cm){const k=Number(cm[1]),first=life.find(l=>l.id==='x'&&l.name.includes(`[${k}]`)),second=life.find(l=>l.id==='reread'&&l.name.includes(`[${k}]`));if(first&&second){const left=at(first.end)-5,right=at(second.start)+5;s+=`<path d="M${left} ${my+18}V${my+3}H${right}V${my+18}" fill="none" stroke="#bdbdbd" stroke-width="1.2" stroke-dasharray="3 4" pointer-events="none"/>`;}}
 const cx=at(executionStep)+cw/2;s+=`<path d="M${cx} 117V${my+235}" stroke="#bdbdbd" stroke-dasharray="2 5" opacity=".4"/>`;
 const read=events.slice(0,executionStep+1).reduce((s,e)=>s+(e.bytes||0),0),reread=events.slice(0,executionStep+1).filter(e=>e.reread).reduce((s,e)=>s+e.bytes,0);
 s+=tx(25,my+276,`步骤 ${executionStep+1} · ${current.label}`,'caption')+tx(25,my+303,`当前行 X 装入 ${kib(read)} · 其中再读 ${kib(reread)}`,'muted');
 const active=life.filter(l=>l.start<=executionStep&&executionStep<l.end);s+=tx(700,my+276,'UB 当前数据','caption')+tx(700,my+303,active.map(l=>l.name.replace(' · 第一遍','').replace(' · 第二遍','').replace(' · 保留并复用','').replace(' · 常驻当前核','')).join(' · ')||'等待装入','muted');
 s+=hit('reread',box(1290,my+252,330,60)+tx(1305,my+276,`全张量 X 再读 ${mib(split?c.shape[0]*c.shape[1]*(c.dtype==='fp32'?4:2):0)}`,'caption')+tx(1305,my+303,'包含在模型总读取量中','muted'),'核对重读量及模型容量分支');
 $('business').innerHTML=s;transform();if(!$('inspector').hidden)detail();if(!$('auditPanel').hidden)audits();if(!$('sourcePanel').hidden)sourceRecord();syncMenu();
}
