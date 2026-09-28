(function () {
  'use strict';
  const trigger=document.getElementById('view-all-ranks');
  const drawer=document.getElementById('all-ranks-drawer');
  const frame=document.getElementById('all-ranks-frame');
  const close=document.getElementById('close-all-ranks');
  const handle=document.getElementById('all-ranks-resize');
  let drag=null;
  function setHeight(value){
    const maximum=Math.max(160,innerHeight-180),minimum=Math.min(240,maximum);
    const height=Math.min(maximum,Math.max(minimum,value));
    document.documentElement.style.setProperty('--all-ranks-height',height+'px');
    handle.setAttribute('aria-valuemin',Math.round(minimum));
    handle.setAttribute('aria-valuemax',Math.round(maximum));
    handle.setAttribute('aria-valuenow',Math.round(height));
  }
  function syncFrame(){
    if(!drawer.hidden&&window.LayerAtlasTrainingState)
      frame.contentWindow.postMessage({type:'layer-atlas:state',context:window.LayerAtlasTrainingState},'*');
  }
  frame.addEventListener('load',syncFrame);
  window.addEventListener('layer-atlas:training-state',syncFrame);
  window.addEventListener('message',event=>{
    if(event.source!==frame.contentWindow)return;
    if(event.data?.type==='rank-atlas:ready')syncFrame();
    if(event.data?.type==='rank-atlas:close')setOpen(false);
  });
  handle.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    drag={y:event.clientY,height:drawer.getBoundingClientRect().height};
    handle.setPointerCapture(event.pointerId);document.body.classList.add('resizing-ranks');
  });
  handle.addEventListener('pointermove',event=>{if(drag)setHeight(drag.height+drag.y-event.clientY);});
  function stopDrag(){drag=null;document.body.classList.remove('resizing-ranks');}
  handle.addEventListener('pointerup',stopDrag);handle.addEventListener('pointercancel',stopDrag);handle.addEventListener('lostpointercapture',stopDrag);
  handle.addEventListener('keydown',event=>{
    if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){
      event.preventDefault();setHeight(event.key==='Home'?0:event.key==='End'?innerHeight:drawer.getBoundingClientRect().height+(event.key==='ArrowUp'?32:-32));
    }
  });
  window.addEventListener('resize',()=>{if(!drawer.hidden)setHeight(drawer.getBoundingClientRect().height);});
  function setOpen(open){
    drawer.hidden=!open;
    document.body.classList.toggle('all-ranks-open',open);
    trigger.setAttribute('aria-expanded',String(open));
    if(open){
      setHeight(drawer.getBoundingClientRect().height);
      frame.src=frame.dataset.src;
      close.focus();
    }else{
      stopDrag();
      // Stop the embedded simulation while its drawer is closed.
      frame.removeAttribute('src');
      trigger.focus();
    }
  }
  trigger.addEventListener('click',()=>setOpen(drawer.hidden));
  close.addEventListener('click',()=>setOpen(false));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!drawer.hidden){
      event.preventDefault();event.stopImmediatePropagation();setOpen(false);
    }
  },true);
})();
