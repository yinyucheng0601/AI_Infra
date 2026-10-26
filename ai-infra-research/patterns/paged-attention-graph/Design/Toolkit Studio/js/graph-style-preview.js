(function(){
const model=window.PTO_PYPA_SEMANTIC_GRAPH,scene=document.querySelector('#scene'),viewport=document.querySelector('#viewport');
const layers={shape:true,precision:true,memory:true,control:true,execution:true,sync:true};
const expanded=new Set();let graph,scale=1,x=0,y=0,selected=null;
const transform=()=>{scene.style.transform=`translate(${x}px,${y}px) scale(${scale})`;document.querySelector("#zoom-status").textContent=Math.round(scale*100)+"%";};
function readable(){scale=1;const n=graph.nodes.find(n=>n.id==="qk");x=viewport.clientWidth/2-(n.x+n.w/2);y=48-n.y;transform();}
function fit(){scale=Math.min((viewport.clientWidth-80)/graph.width,(viewport.clientHeight-60)/graph.height,1);x=(viewport.clientWidth-graph.width*scale)/2;y=24;transform();}
function render(refit=false){
 graph=window.PTO_COMPUTATION_LAYOUT.layout(model,expanded,{overviewLayout:true,architectureLayout:true});
 scene.classList.remove('legend-skin');
 window.PtoStudioGraphScene.render(scene,graph,{selectedNodeId:selected,expandedStages:expanded,synchronizations:layers.sync,compactNodes:true});
 window.PtoStudioGraphLegendSkin.apply(scene,graph,{layers});
 scene.dataset.showControl=String(layers.control);
 scene.dataset.overlayControl=String(layers.control);
 document.querySelector('#scenario').hidden=!layers.execution;
 if(layers.execution){
  const task=Number(document.querySelector('#task').value),seqLen=Number(document.querySelector('#seq').value);
  const counts=window.PtoPagedAttentionExecution.derive(model,window.PtoPagedAttentionIntro.model,{task,seqLen});
  for(const el of scene.querySelectorAll('[data-pypa-node]')){
   const node=graph.nodes.find(n=>n.id===el.dataset.pypaNode);
   const entry=window.PtoPagedAttentionExecution.decoration(node,counts);if(!entry)continue;
   const badge=document.createElement('span');badge.className='preview-count';badge.textContent=`×${entry.count}`;el.append(badge);
   el.setAttribute('aria-label',`${node.title}，整个 Task ${task}：${entry.label}`);
   if(entry.count>1){
    const deck=document.createElement('div');deck.className='preview-execution-deck';deck.style.cssText=`left:${node.x}px;top:${node.y}px;width:${node.w}px;height:${node.h}px`;
    for(let i=entry.count;i>=2;i--){const card=document.createElement('i'),offset=window.PtoPagedAttentionExecution.deckOffset(i);card.style.transform=`translate(${offset.right}px,${offset.bottom}px)`;deck.append(card);}
    scene.insertBefore(deck,el);
   }
  }
  for(const path of scene.querySelectorAll('[data-pypa-edge]')){
   const edge=graph.edges.find(e=>e.id===path.dataset.pypaEdge);
   const entries=(edge.sourceEdgeIds||[edge.id]).map(id=>counts?.edges[id]).filter(Boolean);
   if(entries.length){path.style.strokeWidth=String(Math.max(...entries.map(e=>e.width)));path.dataset.executionLabel=[...new Set(entries.map(e=>e.label))].join(' → ');}
  }
 }
 if(refit)fit();
}
scene.addEventListener('click',e=>{const sync=e.target.closest('[data-pypa-sync]');if(sync){const event=graph.synchronizations.find(s=>s.id===sync.dataset.pypaSync);const d=document.querySelector('#detail');d.hidden=false;d.textContent=event.name+' · '+event.explanation;return;}const el=e.target.closest('[data-pypa-node]');if(!el)return;selected=el.dataset.pypaNode;const n=graph.nodes.find(n=>n.id===selected);if(n.expandable){const before={x:n.x+n.w/2,y:n.y};expanded.has(selected)?expanded.delete(selected):expanded.add(selected);render();const after=graph.nodes.find(n=>n.id===selected);x+=(before.x-after.x-after.w/2)*scale;y+=(before.y-after.y)*scale;transform();}else{render();const d=document.querySelector('#detail');d.hidden=false;d.replaceChildren();const close=document.createElement('button');close.textContent='×';close.onclick=()=>d.hidden=true;const h=document.createElement('h3');h.textContent=n.title;const p=document.createElement('p');p.textContent=n.detail;const s=document.createElement('p');s.textContent=`源码 ${n.source?.file||''} : ${n.lines}`;d.append(close,h,p,s);}});
scene.addEventListener('pointerover',e=>{const id=e.target.closest('[data-pypa-node]')?.dataset.pypaNode;scene.querySelectorAll('[data-pypa-edge]').forEach(el=>el.classList.toggle('is-related',!!id&&(el.dataset.edgeSource===id||el.dataset.edgeTarget===id)));});
scene.addEventListener('pointerleave',()=>scene.querySelectorAll('.is-related').forEach(el=>el.classList.remove('is-related')));
viewport.addEventListener('wheel',e=>{e.preventDefault();const r=viewport.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,prev=scale;scale=Math.max(.08,Math.min(3,scale*Math.exp(-e.deltaY*.001)));x=mx-(mx-x)*scale/prev;y=my-(my-y)*scale/prev;transform();},{passive:false});
let drag;viewport.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag={px:e.clientX,py:e.clientY,x,y};viewport.setPointerCapture(e.pointerId);});viewport.addEventListener('pointermove',e=>{if(!drag)return;x=drag.x+e.clientX-drag.px;y=drag.y+e.clientY-drag.py;transform();});viewport.addEventListener('pointerup',()=>drag=null);
document.querySelectorAll('[data-layer]').forEach(input=>input.onchange=()=>{layers[input.dataset.layer]=input.checked;render();});document.querySelector('#task').onchange=()=>render();document.querySelector('#seq').onchange=()=>render();document.querySelector("#fit").onclick=fit;window.addEventListener("resize",transform);render();readable();
})();
