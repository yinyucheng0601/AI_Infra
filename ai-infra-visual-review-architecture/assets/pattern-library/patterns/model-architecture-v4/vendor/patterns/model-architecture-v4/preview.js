(async function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const evidence=await fetch('vendor/patterns/model-architecture-v4/runtime-evidence.json').then(r=>{if(!r.ok)throw Error('Evidence '+r.status);return r.json();});
  const layers=new Set((params.get('infoLayers')??'shape,precision,storage,control,count,sync').split(',').filter(k=>PtoV4InformationLayers.names[k]));
  const layerGroup=document.getElementById('information-layers');
  layerGroup.innerHTML='<button type="button" id="layers-toggle" class="btn btn-ghost btn-sm" aria-expanded="false" aria-controls="layers-menu">信息叠加 <span id="layers-count"></span> ▾</button><div id="layers-menu" role="group" aria-label="选择叠加图层" hidden>'+Object.entries(PtoV4InformationLayers.names).map(([key,label])=>`<label class="v4-layer-option"><input type="checkbox" data-info-layer="${key}" ${layers.has(key)?'checked':''}><span>${label}</span></label>`).join('')+'</div>';
  const layerToggle=document.getElementById('layers-toggle'),layerMenu=document.getElementById('layers-menu');
  function setLayersOpen(open){layerMenu.hidden=!open;layerToggle.setAttribute('aria-expanded',String(open));}
  function syncLayerCount(){document.getElementById('layers-count').textContent=layers.size?'· '+layers.size:'';}
  syncLayerCount();layerToggle.addEventListener('click',()=>setLayersOpen(layerMenu.hidden));
  document.addEventListener('pointerdown',event=>{if(!layerGroup.contains(event.target))setLayersOpen(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!layerMenu.hidden){setLayersOpen(false);layerToggle.focus();}});
  layerGroup.addEventListener('focusout',event=>{if(!layerGroup.contains(event.relatedTarget))setLayersOpen(false);});
  const evidencePanel=document.getElementById('runtime-evidence');
  document.getElementById('close-evidence').onclick=()=>evidencePanel.hidden=true;
  let theme = params.get('theme') === 'light' ? 'light' : 'dark';
  const legendButton = document.getElementById('legend-toggle');
  const legendPanel = document.getElementById('legend-panel');
  function showLegend(open) { legendPanel.hidden = !open; legendButton.setAttribute('aria-expanded', String(open)); }
  legendButton.addEventListener('click', () => showLegend(legendPanel.hidden));
  document.addEventListener('pointerdown', event => {
    if (!legendPanel.contains(event.target) && !legendButton.contains(event.target)) showLegend(false);
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !legendPanel.hidden) { showLegend(false); legendButton.focus(); } });

  function onEvent(message) {
    if (message.type === 'csa-operator-select' || message.type === 'csa-operator-toggle') {
      const detail=PtoV4InformationLayers.details(message.nodeId,evidence);if(detail){document.getElementById('runtime-evidence-content').innerHTML=detail;evidencePanel.hidden=false;}else evidencePanel.hidden=true;
    }
    if (message.type === 'csa-operator-clear') evidencePanel.hidden=true;
  }
  try {
    const controller = await PtoV4ModelArchitecturePattern.render('#v4Graph', {modelGraph:true, level:'l1', initialTheme:theme, onEvent, onRender:(host,graph)=>PtoV4InformationLayers.decorate(host,graph,layers,evidence)});
    window.v4PatternController = controller;
    layerGroup.addEventListener('change',event=>{const input=event.target.closest('[data-info-layer]');if(!input)return;const key=input.dataset.infoLayer;input.checked?layers.add(key):layers.delete(key);syncLayerCount();const q=new URLSearchParams(location.search);q.set('infoLayers',[...layers].join(','));history.replaceState(null,'','?'+q);controller.refresh();});
    const setLevel = level => {
      controller.setRootFolded(level === 'l0');
      if (level !== 'l0') controller.setAllCompounds(level === 'l2');
      controller.fit({whole:true});
    };
    const themeButton = document.getElementById('theme');
    function syncTheme() { themeButton.textContent = theme === 'dark' ? '浅色模式' : '深色模式'; }
    themeButton.addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; controller.setTheme(theme); syncTheme(); });
    window.addEventListener('message', event => {
      if (event.source === window.parent && event.data?.type === 'pto-preview-theme') {
        theme = event.data.theme === 'light' ? 'light' : 'dark'; controller.setTheme(theme); syncTheme();
      }
    });
    syncTheme();
    if (['l0','l2'].includes(params.get('level'))) setLevel(params.get('level'));
  } catch (error) { console.error(error);const alert=document.createElement('p');alert.setAttribute('role','alert');alert.textContent=`架构图加载失败：${error.message}`;document.getElementById('v4Graph').replaceChildren(alert); }
})();
