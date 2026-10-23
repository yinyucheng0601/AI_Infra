/* Opt-in presentation adapter; semantic IDs, ports and edges remain unchanged. */
(function(root){
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function apply(scene,graph,{metadata=false,layers={}}={}){
 scene.classList.add('legend-skin');
 for(const node of graph.nodes){
  const el=[...scene.querySelectorAll('[data-pypa-node]')].find(e=>e.dataset.pypaNode===node.id);if(!el)continue;
  el.removeAttribute('title');el.style.height=`${node.h}px`;
  if(node.expandedGroup){el.innerHTML=`<b>${esc(node.title)}</b><span class="legend-toggle">−</span>`;continue;}
  const data=node.kind==='data';el.classList.toggle('legend-data',data);
  let icon='';
  if(!data){
   const label=node.title;
   const key=/matmul|QK|PV/i.test(label)?'matmul':/softmax/i.test(label)?'softmax':/sum|max|reduce/i.test(label)?'reduce':/transpose/i.test(label)?'transpose':/reshape/i.test(label)?'reshape':null;
   const semanticKey=key||(/cache|store|load/i.test(label)?"cache":/scal|multiply|mul|mask/i.test(label)?"gate":/accumul|update/i.test(label)?"reduce":null);const entry=root.PtoOpIcons.find(x=>x.id===semanticKey)||root.PtoOpIconFor(label);
   icon=`<span class="legend-icon">${entry?`<svg viewBox="0 0 24 24"><path d="${entry.path}"/></svg>`:'<span>ƒ</span>'}</span>`;
  }
  const info=node.overlay||{};
  const fields=[layers.shape?info.shape:null,layers.shape&&info.valid?`Valid ${info.valid}`:null,layers.precision?info.precision:null,layers.memory?[info.memory,info.executionUnit].filter(Boolean).join(' · '):null].filter(Boolean);
  el.classList.toggle('is-control-object',!!layers.control&&!!info.control);
  el.innerHTML=icon+`<span class="legend-text"><b>${esc(node.title)}</b>${fields.length?`<small>${esc(fields.join(' · '))}</small>`:''}</span>`+(node.expandable?'<span class="legend-toggle">+</span>':'');
  if(data){
   el.style.setProperty('--data-role','#b1df58');
   const cols=Math.max(6,Math.floor((node.w-14)/8)),rows=4;
   const cells=Array.from({length:cols*rows},()=>'<i></i>').join('');
   el.innerHTML=`<span class="legend-matrix" aria-hidden="true" style="--grid-cols:${cols}">${cells}</span><span class="legend-text"><b>${esc(node.title)}</b>${fields.length?`<small>${esc(fields.join(' · '))}</small>`:''}</span>`;
  }
 }
}
root.PtoStudioGraphLegendSkin=Object.freeze({apply});
})(window);
