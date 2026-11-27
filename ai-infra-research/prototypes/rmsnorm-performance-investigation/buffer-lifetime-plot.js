// Shared inline UB plot. Callers supply the address or logical-offset semantics.
function renderBufferLifetimePlot({x0,width,top,steps,capacity,title,description,axis,items}) {
  const cw=width/steps, scale=640/capacity;
  const plotEnd=Math.min(capacity,Math.ceil(Math.max(...items.map(t=>t.offset+t.size))/8192)*8192);
  const bottom=top+plotEnd*scale;
  let markup=headerTip(20,top-46,500,36,tx(30,top-20,title,'resource-label'),description);
  for(let b=0;b<=plotEnd;b+=8192){
    const major=b%32768===0, y=top+b*scale;
    if(b===plotEnd&&!major) break;
    markup+=`<path d="M${x0} ${y}H${x0+width}" stroke="${major?'#303030':'#202020'}" stroke-width="1"/>`;
    if(major) markup+=tx(30,y+4,axis(b),'muted');
  }
  for(let i=0;i<=steps;i++){
    const x=x0+i*cw;
    markup+=`<path d="M${x} ${top}V${bottom}" stroke="#252525" stroke-width="1"/>`;
  }
  for(const t of items){
    const label=esc(t.buffer+' / '+t.name);
    const block=MemoryInspectorBlock.render({x:x0+t.start*cw+1,y:top+t.offset*scale,
      width:(t.end-t.start)*cw-2,height:t.size*scale,name:t.name,size:t.size,
      line:t.srcLineStart,endLine:t.srcLineEnd,color:t.color,selected:t.selected});
    const hitbox=t.size*scale<4?`<rect x="${x0+t.start*cw+1}" y="${top+t.offset*scale-1}" width="${(t.end-t.start)*cw-2}" height="4" fill="transparent" pointer-events="all"/>`:'';
    markup+=`<g data-step="${t.eventIndex}" data-buffer-id="${esc(t.id)}" role="button" tabindex="0" aria-label="${label}" data-tip="${esc(t.tip)}">${block}${hitbox}</g>`;
  }
  return {markup,bottom};
}
