/* KV storage adapter. Geometry is reused directly from rank-memory-view.js.
 * Outer bands follow the TensorRT-LLM 1.1.0rc1 reference log (79.10 GiB).
 * Equal layer slices and the expanded token sheet are logical organization,
 * not measured per-layer bytes or live occupancy. This is not a V4 budget.
 * No physical rank assignment or CSA compressed mapping is inferred here.
 */
(function(global){
 'use strict';
 const budget=Object.freeze({total:79.10,nonKV:8.62,kv:63.44,free:7.04,source:'https://nvidia.github.io/TensorRT-LLM/1.1.0rc1/reference/memory.html#faq'});
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render(target,state){
  const {P,points,polygon,block}=global.RankMemoryView.geometry;
  const {layer,ratios,position,stage,phase,inspection,range}=state;
  const height=64*6.7,ratio=ratios[layer],start=Math.max(0,position-127);
  const kind=ratio===0?'SWA':ratio===4?'CSA':'HCA';
  const ready=stage>0;
  const compressedCount=ratio===128&&ready?Math.floor((position+1)/128):0;
  const fill='#3187EC';
  const light=document.documentElement.dataset.theme==='light',ink=light?'#333':'#ddd',muted=light?'#666':'#aaa';
  const unit=height/budget.total,base=6,gap=8,nonKVHeight=budget.nonKV*unit,kvBase=base+nonKVHeight+gap,kvHeight=budget.kv*unit,pitch=kvHeight/ratios.length;
  let markup=polygon([[0,0,0],[245,0,0],[245,155,0],[0,155,0]],(light?'#eee':'#000'))
   +polygon([[0,0,0],[245,0,0],[245,0,height],[0,0,height]],(light?'#e5e5e5':'#030303'))
   +polygon([[0,0,0],[0,155,0],[0,155,height],[0,0,height]],(light?'#e5e5e5':'#030303'));
  markup+=`<g data-budget="non-kv"><title>权重与运行缓冲 8.62 GiB：权重、执行上下文与运行时缓冲合计；官方日志参考值</title>${block(base,nonKVHeight,light?'#ababab':'#858585')}</g>`;
  markup+=block(kvBase,kvHeight,light?'#c6cbd0':'#555c63');
  // Keep all layer hit regions; draw only the selected physical-looking slice.
  ratios.forEach((_,index)=>{
   const selected=index===layer&&ready;
   const z=kvBase+index*pitch;
   markup+=`<g class="kv-storage-layer" role="button" tabindex="0" data-layer="${index}" aria-label="查看 L${index} KV" aria-pressed="${index===layer}">${selected?block(z,Math.max(2,pitch*.65),fill):''}${polygon([[239,6,z],[239,149,z],[239,149,z+pitch],[239,6,z+pitch]],'transparent')}</g>`;
  });
  // Free space is the open headroom inside the wireframe, never a dark solid lid.
  markup+=`<path d="M${P(0,155,height)} L${P(0,0,height)} L${P(245,0,height)} L${P(245,155,height)} Z M${P(0,155,height)} L${P(0,155,0)} L${P(245,155,0)} L${P(245,0,0)} L${P(245,0,height)} M${P(245,155,height)} L${P(245,155,0)}" fill="none" stroke="${light?'#777':'#eee'}" stroke-width="2.4"/>`;
  const wall=P(0,140,height);
  markup+=`<g transform="matrix(0.8660254 -.5 0 1 ${wall[0]} ${wall[1]-75})" fill="${ink}"><text font-size="25" font-weight="600">Rank 内存</text><text y="23" font-size="13" fill="${muted}">79.10 GiB · 参考预算</text></g>`;
  const anchor=P(6,149,kvBase+layer*pitch+pitch/2);
  markup+=`<text transform="matrix(0.8660254 -.5 0 1 ${anchor[0]} ${anchor[1]})" fill="${layer===0&&light?'#333':ink}" font-size="16">L${layer}</text>`;
  const bandLabel=(z,text,size=16)=>{
   const a=P(239,140,z);
   markup+=`<text transform="matrix(0.8660254 -.5 0 1 ${a[0]} ${a[1]})" fill="${ink}" font-size="${size}">${text}</text>`;
  };
  bandLabel(base+nonKVHeight*.5,'权重/运行缓冲 · 8.62 GiB',13);
  bandLabel(kvBase+kvHeight*.52,'KV 池 · 63.44 GiB',18);
  bandLabel((kvBase+kvHeight+height)/2,'剩余 · 7.04 GiB',13);
  markup+=`<text x="575" y="779" text-anchor="middle" fill="${ink}" font-size="16">L${layer} · ${kind}</text>`;
  if(ratio===128&&compressedCount){
   markup+=`<g class="kv-storage-slot" role="button" tabindex="0" data-first="0" data-last="${compressedCount*128-1}" aria-label="HCA 压缩记录 · 来源 0–${compressedCount*128-1}"><title>在底部 Token 表查看 HCA 压缩来源 0–${compressedCount*128-1}</title><text x="575" y="803" text-anchor="middle" fill="${muted}" font-size="15">HCA · ${compressedCount} 条压缩记录 ↗</text></g>`;
  }
  // Read/write activity stays inside this storage view. Sampling retains data.
  if(ready&&state.layered){
   markup+=`<g fill="none" stroke-width="2">${phase==='decode'?'<path stroke="#aaa" d="M790 500v-45l-5 7m5-7 5 7"/>':''}<path stroke="#3187EC" d="M813 455v45l-5-7m5 7 5-7"/></g>${phase==='decode'?'<text x="780" y="524" fill="${muted}" font-size="13">读</text>':''}<text x="806" y="524" fill="#3187EC" font-size="13">写</text>`;
  }

  target.innerHTML=`<svg viewBox="335 220 505 610" role="group" aria-label="Rank 参考内存预算与 L${layer} KV 缓存槽">${markup}</svg>`;
  const activate=(node,callback)=>{
   node.addEventListener('click',callback);
   node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();callback();}});
  };
  target.querySelectorAll('[data-layer]').forEach(node=>activate(node,()=>state.onLayer(Number(node.dataset.layer))));
  target.querySelectorAll('[data-first]').forEach(node=>activate(node,()=>state.onToken(Number(node.dataset.first),[Number(node.dataset.first),Number(node.dataset.last)])));
 }
 global.InferenceKVMemory={render,budget};
})(window);
