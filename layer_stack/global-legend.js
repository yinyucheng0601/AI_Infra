(function () {
  'use strict';
  const root=document.getElementById('global-legend');
  const toggle=document.getElementById('global-legend-toggle');
  const panel=document.getElementById('global-legend-panel');
  let pinned=false;
  function show(open){panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));}
  root.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')show(true);});
  root.addEventListener('pointerleave',()=>{if(!pinned&&!root.contains(document.activeElement))show(false);});
  toggle.addEventListener('click',()=>{pinned=!pinned;show(pinned);});
  root.addEventListener('focusin',()=>show(true));
  root.addEventListener('focusout',event=>{if(!pinned&&!root.contains(event.relatedTarget))show(false);});
  document.addEventListener('pointerdown',event=>{if(!root.contains(event.target)){pinned=false;show(false);}});
  root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();pinned=false;toggle.focus();show(false);}});
  // Category names and swatches share the same sources as the memory view.
  window.RankMemoryData.querySnapshot().then(snapshot=>{
    const list=document.getElementById('global-memory-legend');
    for(const category of snapshot.categories){
      const item=document.createElement('span'),swatch=document.createElement('i');
      swatch.setAttribute('aria-hidden','true');
      swatch.style.background=window.RankMemoryView.colors[category.id]||'transparent';
      if(category.id==='free')swatch.className='legend-free';
      item.append(swatch,document.createTextNode(`${category.symbol} · ${category.name}`));
      list.append(item);
    }
  }).catch(()=>{document.getElementById('global-memory-legend').textContent='内存图例暂不可用';});
})();
