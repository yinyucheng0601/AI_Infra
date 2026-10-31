/* Host adapter for MI-01 FunctionMemoryMap: transpose lifecycle to X.
   Rectangle and clipped two-line label contract follows the canonical component.
   Source: PyPTO3-main/Design/pass-error-cases/src/FunctionMemoryMap.jsx.
   No byte-address geometry is supplied: Y is request size within a named buffer.
   Host selection overrides MI-01 blue with neutral fill per AGENTS.md. */
const MemoryInspectorBlock=(()=>{
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render({x,y,width,height,name,size,line,endLine,color,selected=false,related=false}){
  const w=Math.max(2,width),h=Math.max(.05,height),fill=selected?'#f0f0f0':color,ink=color==='#666'?'#ddd':'#111',bytes=n=>n<1024?n+' B':Number((n/1024).toFixed(2))+' KiB';
  return `<rect class="mi-allocation" x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}"/>`+(w>44&&h>14?`<svg x="${x+4}" y="${y+2}" width="${Math.max(0,w-8)}" height="${Math.max(0,h-4)}" overflow="hidden" pointer-events="none"><text y="12" fill="${ink}" style="fill:${ink}" font-size="11" font-family="ui-monospace,monospace" font-weight="600">${escape(name)}</text>${h>30?`<text y="26" fill="${ink}" style="fill:${ink}" font-size="10" font-family="ui-monospace,monospace">${escape(bytes(size))} · L${line}–L${endLine}</text>`:''}</svg>`:'');
 }
 return {render};
})();
