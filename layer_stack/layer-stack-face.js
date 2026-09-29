/* A compact layer face, sharing the Front view's tensor renderer and node IDs. */
(()=>{
'use strict';
const {matrix,colors}=window.LayerFront.glyphs;
const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
defs.innerHTML='<marker id="stack-face-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="#777" stroke-width="1.3"/></marker>';
document.getElementById('scene').prepend(defs);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render({layer,mode,ready,rms,detailed=false,anomalySamples=[]}){
 const tensor=(id,x,y,w,h,label,kind='activation',detail=false)=>{
  const query=id.startsWith('query-');
  const active=id===`query-${mode}`&&ready;
  const alerts=active?anomalySamples:[];
  const caption=query?(active&&Number.isFinite(rms)?rms.toFixed(4):'—'):label;
  return `<g data-node="${id}" class="stack-tensor ${kind}${detail?' stack-detail':''}${alerts.length?' has-alert':''}"><title>${escape(label)}${alerts.length?' · '+alerts.length+' 个采样点超阈值':''}</title>${matrix(x-w/2,y,w,h,colors[kind],layer,alerts)}<text x="${x}" y="${y+h/2}" class="tensor-label">${escape(caption)}</text></g>`;
 };
 const op=(id,y,label,detail=false)=>`<g data-node="${id}" class="${detail?'stack-detail':''}"><rect class="op" x="60" y="${y-12}" width="160" height="24" rx="12"/><text class="op-label" x="140" y="${y}">${label}</text></g>`;
 const edge=(d,kind='',detail=false)=>`<path class="stack-edge ${kind}${detail?' stack-detail':''}" d="${d}" marker-end="url(#stack-face-arrow)"/>`;
 const add=y=>`<g class="stack-residual-add"><circle cx="140" cy="${y}" r="9"/><path class="add-mark" d="M136 ${y}h8 M140 ${y-4}v8"/></g>`;
 // Lay out only visible nodes, with equal edge-to-edge gaps and a stable total height.
 const sequence=[['input',26],...(detailed?[['attn-read',24]]:[]),['q-down',24],['query-activation',28],['mla',24],['attn-add',18],['between',28],...(detailed?[['ffn-read',24]]:[]),['ffn',24],['ffn-add',18],['output',26]];
 const gap=(364-sequence.reduce((sum,[,h])=>sum+h,0))/(sequence.length-1),layout={};
 let top=14;
 for(const [id,h] of sequence){layout[id]={top,bottom:top+h,center:top+h/2};top+=h+gap;}
 const y=id=>layout[id].center;
 let b=`<g class="stack-face" data-mode="${mode}" data-ready="${ready}" aria-label="L${layer} · MLA + ${layer<2?'Dense FFN':'MoE'}">`;
 for(let i=1;i<sequence.length;i++)b+=edge(`M140 ${layout[sequence[i-1][0]].bottom}V${layout[sequence[i][0]].top}`);
 b+=edge(`M50 ${y('input')}H30V${y('attn-add')}H131`)+edge(`M50 ${y('between')}H30V${y('ffn-add')}H131`);
 b+=tensor('input',140,layout.input.top,180,26,'X');
 if(detailed)b+=op('attn-read',y('attn-read'),'Norm 1');
 b+=op('q-down',y('q-down'),'Query Down');
 b+=tensor('query-activation',140,layout['query-activation'].top,156,28,'Query activation');
 b+=op('mla',y('mla'),'Attention · MLA')+add(y('attn-add'));
 b+=tensor('between',140,layout.between.top,180,28,'Y');
 if(detailed)b+=op('ffn-read',y('ffn-read'),'Norm 2');
 b+=op('ffn',y('ffn'),layer<2?'FFN · SwiGLU':'MoE · top-8')+add(y('ffn-add'));
 b+=tensor('output',140,layout.output.top,180,26,layer===48?'Z · Output':`Z → L${layer+1}`);
 // Parameter branches follow the corresponding operators when the layout changes.
 b+=edge(`M282 ${layout['query-activation'].top}V${y('q-down')}H220`,'weight')+edge(`M232 ${y('ffn')}H220`,'weight',true);
 b+=tensor('query-weight',282,layout['query-activation'].top,100,28,'W_Query','weight');
 b+=tensor('ffn-weight',282,y('ffn')-14,100,28,'W_FFN','weight',true);
 b+=edge(`M338 ${y('output')}V${y('mla')}H332`,'gradient');
 if(detailed)b+=edge(`M338 ${y('ffn-add')}H332`,'gradient');
 b+=tensor('query-gradient',282,y('mla')-14,100,28,'∂L/∂W_Query','gradient');
 b+=tensor('ffn-gradient',282,y('ffn-add')-14,100,28,'∂L/∂W_FFN','gradient',true);
 return b+'</g>';
}
window.LayerStackFace={render};
})();
