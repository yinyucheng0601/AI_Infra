/* Optional UI components shared by all atlas variants. */
var AtlasControls=window.AtlasControls={
 mountDial(host,{center=false,onCenter,onSelect}){
  host.id='rank-view-dial';host.dataset.center=String(center);
  const icon=paths=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round">${paths}</svg>`;
  const icons=[icon('<path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10 9-5M12 12 3 7m9 5v10"/>'),icon('<path d="M3 4h18v16H3Z M3 8h18"/><path d="m8 14 4-3 4 3"/>'),icon('<path d="M4 4h16v16H4Z M4 15h16"/>'),icon('<path d="M4 4h16v16H4Z M10 4v16"/>')];
  const flatIcons=[icon('<rect x="3" y="4" width="7" height="16"/><rect x="14" y="4" width="7" height="16"/>'),icon('<path d="M3 4h18v16H3Z M9 4v16m6-16v16M3 12h18"/>')];
  host.innerHTML='<div class="view-orbit"></div>'+(center?'<button id="cycle-view" type="button" aria-label="切换3D / 2D"></button>':'')+'<div class="dial-options" role="group" aria-label="视角"></div><span id="view-name" class="dial-name" aria-live="polite"></span>';
  let buttons=[],count=-1;
  if(center)document.getElementById('cycle-view').onclick=onCenter;
  return {update({flat=false,centerActive=flat,views,selected,name,indices=views.map((_,i)=>i)}){
   host.dataset.layout=flat?'flat':'space';
   if(count!==views.length){count=views.length;const options=host.querySelector('.dial-options');options.innerHTML=views.map((_,i)=>`<button class="dial-port" type="button" data-slot="${indices[i]}"></button>`).join('');buttons=[...options.querySelectorAll('button')];buttons.forEach((b,i)=>b.onclick=()=>onSelect(indices[i]));}
   buttons.forEach((b,i)=>{b.innerHTML=(flat?flatIcons:icons)[indices[i]];b.setAttribute('aria-label',views[i]);b.setAttribute('title',views[i]);b.dataset.wbTip=views[i];b.setAttribute('aria-pressed',String(indices[i]===selected));});
   if(center){const button=document.getElementById('cycle-view');button.innerHTML=flat?flatIcons[1]:icons[0];button.setAttribute('aria-pressed',String(centerActive));button.title=centerActive?'切换到 3D':'切换到 2D';}
   document.getElementById('view-name').textContent=name;
  }};
 },
 mountScope(){
  const host=document.querySelector('.scope-switch');if(!host)return;
  host.setAttribute('role','tablist');host.setAttribute('aria-label','观测范围');
  for(const [id,label] of [['single','单 Rank'],['all','全部 Rank']]){const b=document.getElementById(id);b.textContent=label;b.setAttribute('role','tab');b.onclick=()=>{switchScope(id);AtlasControls.syncScope();};
   b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?'single':e.key==='End'?'all':id==='single'?'all':'single';document.getElementById(next).click();document.getElementById(next).focus();};}
  AtlasControls.syncScope();
 },
 syncScope(){
  for(const id of ['single','all']){const b=document.getElementById(id);if(!b||b.getAttribute('role')!=='tab')continue;const active=scope===id;b.setAttribute('aria-selected',String(active));b.setAttribute('tabindex',active?'0':'-1');b.removeAttribute('aria-pressed');}
 },
 mountTheme(){
  const root=document.documentElement,button=document.getElementById('theme-toggle');if(!button)return;
  try{root.dataset.theme=localStorage.getItem('npu-memory-atlas-theme')==='light'?'light':'dark';}catch{root.dataset.theme='dark';}
  function sync(){const light=root.dataset.theme==='light',label=light?'切换到深色模式':'切换到浅色模式';button.setAttribute('aria-label',label);button.title=label;button.dataset.wbTip=label;button.setAttribute('aria-pressed',String(light));}
  button.onclick=()=>{root.dataset.theme=root.dataset.theme==='light'?'dark':'light';try{localStorage.setItem('npu-memory-atlas-theme',root.dataset.theme);}catch{}sync();render();};sync();
 }
};
