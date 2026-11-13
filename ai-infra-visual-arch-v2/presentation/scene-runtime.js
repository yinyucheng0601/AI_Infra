export async function createSceneRuntime(root,scene,id){
 const data=['attention','layers'].includes(id)?await fetch('/assets/swimlane-d23.json').then(r=>r.json()).then(d23=>fetch('/assets/layer18-sample.json').then(r=>r.json()).then(sample=>({d23,sample}))):{};
 const slides=[scene],active=0;let step=0;
 const fmt=n=>Number.isInteger(n)?String(n):String(Math.round(n*1000)/1000);
 function updateScaleConnections(){
  if(slides[active]?.id!=='agent')return;
  const svg=root.querySelector('.scale-connections'),ctm=svg.getScreenCTM();if(!ctm)return;const inverse=ctm.inverse();
  const pt=(el,side)=>{const b=el.getBoundingClientRect();return new DOMPoint(side==='left'?b.left:side==='right'?b.right:b.left+b.width/2,side==='bottom'?b.bottom:side==='top'?b.top:b.top+b.height/2).matrixTransform(inverse);};
  const mul=root.querySelector('[data-object="scale-multiply"] circle'),add=root.querySelector('[data-object="scale-add"] circle'),m=pt(mul,'left'),a=pt(add,'right');
  const inputs=[...svg.querySelectorAll('.input-line')],outputs=[...svg.querySelectorAll('.result-line')];
  ['x0','x1'].forEach((id,i)=>{const p=pt(root.querySelector(`[data-matrix="${id}"]`),'right'),mx=(p.x+m.x)/2;inputs[i].setAttribute('d',`M${p.x} ${p.y} H${mx} V${m.y} H${m.x}`);});
  ['y0','y1'].forEach((id,i)=>{const p=pt(root.querySelector(`[data-matrix="${id}"]`),'left'),mx=(a.x+p.x)/2;outputs[i].setAttribute('d',`M${a.x} ${a.y} H${mx} V${p.y} H${p.x}`);});
  const value=pt(root.querySelector('[data-scale-value]'),'bottom'),top=pt(mul,'top');svg.querySelector('.parameter-line').setAttribute('d',`M${value.x} ${value.y+5} H${top.x} V${top.y}`);
 }
 function buildLanes(){
  const s=data.d23,critical=s.lanes.reduce((a,b)=>b.rrStart>a.rrStart?b:a);
  const lo=-100,hi=280,W=1200,H=440,x=v=>(v-lo)/(hi-lo)*W;
  const hostY=i=>35+i*9,deviceY=i=>245+i*9;
  let body='<svg viewBox="0 0 1200 440" class="lane-svg" aria-label="D23：16 条 Host bind 与 runner_run 调用窗口，共享毫秒时间轴">';
  body+='<line x1="'+x(0)+'" x2="'+x(0)+'" y1="15" y2="410" stroke="#283323" stroke-dasharray="3 7"/>';
  for(const kind of ['bind','runner'])s.lanes.forEach((l,i)=>{
   const y=kind==='bind'?hostY(i):deviceY(i),start=kind==='bind'?l.bindStart:l.rrStart,end=kind==='bind'?l.bindEnd:l.rrEnd;
   body+=`<g class="lane-row ${l.dev===critical.dev?'critical':''}" data-lane="${l.dev}"><text x="-25" y="${y+5}" class="svg-lane-number">${l.dev}</text><rect class="lane-window ${kind}" x="${x(start)}" y="${y}" width="${x(end)-x(start)}" height="5" style="--row:${i}"><title>lane ${l.dev} · ${kind} · ${fmt(start)}–${fmt(end)} ms</title></rect></g>`;
  });
  const ci=s.lanes.findIndex(l=>l.dev===critical.dev);
  body+=`<g class="critical-connector"><path d="M${x(critical.bindEnd)} ${hostY(ci)+2.5} H${x(critical.rrStart)} V${deviceY(ci)+2.5}"/></g>`;
  [-100,0,100,200].forEach(t=>body+=`<text class="svg-axis" x="${x(t)}" y="432" text-anchor="middle">${t} ms</text>`);
  body+='</svg>';root.querySelector('#lane-chart').innerHTML=body;
  root.querySelector('[data-critical]').textContent=critical.dev;
  root.querySelector('[data-entry]').innerHTML=fmt(critical.rrStart)+' <small>ms</small>';
 }
 function drawSample(){
  const {values,limit}=data.sample,c=root.querySelector('#layer-sample'),ctx=c.getContext('2d');
  const stops=[[0,[51,51,51]],[.28,[80,80,80]],[.55,[136,136,136]],[.78,[188,188,188]],[1,[238,238,238]]];
  ctx.fillStyle='#080a09';ctx.fillRect(0,0,512,512);
  values.forEach((v,i)=>{const t=Math.pow(Math.max(0,Math.min(1,Math.abs(v)/limit)),.8);let k=0;while(k<stops.length-2&&t>stops[k+1][0])k++;const[a,ca]=stops[k],[b,cb]=stops[k+1],f=(t-a)/(b-a);ctx.fillStyle='rgb('+ca.map((x,j)=>Math.round(x+(cb[j]-x)*f)).join(',')+')';ctx.fillRect((i%64)*8,Math.floor(i/64)*8,7.5,7.5);});
 }
 function updateQueryLink(){
  if(slides[active]?.id!=='layers'||step<3)return;
  const selected=root.querySelector('.selected-plane [data-node="query-activation"] .tensor-outline'),canvas=root.querySelector('#layer-sample'),svg=root.querySelector('.query-link');
  if(!selected)return;const a=selected.getBoundingClientRect(),b=canvas.getBoundingClientRect(),ctm=svg.getScreenCTM();if(!ctm)return;
  const inverse=ctm.inverse(),from=new DOMPoint(a.right,a.top+a.height/2).matrixTransform(inverse),to=new DOMPoint(b.left,b.top+b.height*.22).matrixTransform(inverse);
  const sx=from.x,sy=from.y,tx=to.x,ty=to.y,m=(sx+tx)/2;
  svg.querySelector('path').setAttribute('d',`M${sx} ${sy} H${m} V${ty} H${tx}`);
 }

 if(id==='attention')buildLanes();
 if(id==='layers'){drawSample();root.querySelector('[data-sample-value]').textContent=fmt(data.sample.values[18*64+35]);}

 function download(value,name){const url=URL.createObjectURL(new Blob([value],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 let currentModel;
 function auditContext(){return window.ScaleModel.context(currentModel,0,root.querySelector('#scale-story-question').value);}
 function updateAudit(){if(!currentModel)return;const e=window.ScaleModel.element(currentModel,0);root.querySelector('[data-audit-values]').innerHTML=`<p class="audit-equation">${e.x} × ${e.scale} − 1.5 = <b>${e.y}</b></p><p class="audit-delta">Δy ${e.delta} · 关联输出 ${window.ScaleModel.affected(currentModel,0).length} 个</p>`;root.querySelector('[data-audit-evidence]').textContent=JSON.stringify(auditContext(),null,2);root.querySelector('.scale-audit-trigger').setAttribute('aria-expanded',String(scene.classList.contains('audit-open')));}
 if(id==='agent'){
 root.querySelector('.scale-audit-trigger').onclick=()=>{scene.classList.toggle('audit-open');updateAudit()};
 root.querySelector('[data-audit-close]').onclick=()=>{scene.classList.remove('audit-open');updateAudit()};
 root.querySelector('#scale-story-question').addEventListener('input',updateAudit);
 root.querySelector('[data-audit-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(auditContext(),null,2));root.querySelector('[data-audit-status]').textContent='已复制问题与证据'}catch{root.querySelector('[data-audit-status]').textContent='请从证据预览选择复制'}};
 root.querySelector('[data-audit-export]').onclick=()=>download(JSON.stringify(auditContext(),null,2),'scale-evidence.json');
 }
 const passAudit=root.querySelector('.pass-audit');
 if(passAudit){
 const question=passAudit.querySelector('textarea'),preview=passAudit.querySelector('pre');
 const evidence=()=>JSON.stringify({case:'CP-01',issue:'https://github.com/hw-native-sys/pypto/issues/1723',evidence:{addressSpace:'UB',address:74304,scaleBindings:4},pending:'逐 Pass 快照与完整 live range',question:question.value},null,2);
 const update=()=>preview.textContent=evidence();question.addEventListener('input',update);update();
 passAudit.querySelector('[data-pass-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(evidence());passAudit.querySelector('output').textContent='已复制证据与调查问题'}catch{passAudit.querySelector('output').textContent='复制失败，可展开交接预览手动复制。'}};
 passAudit.querySelector('[data-pass-export]').onclick=()=>download(evidence(),'cp-01-handoff.json');
 }
 const refresh=()=>{if(id==='agent')updateScaleConnections();if(id==='layers')updateQueryLink();};
 const observer=new ResizeObserver(refresh);observer.observe(root);
 return {update(n,model){step=n;currentModel=model;if(id==='agent'){scene.classList.toggle('audit-open',step===4);updateAudit()}requestAnimationFrame(refresh)},destroy(){observer.disconnect()}};
}
