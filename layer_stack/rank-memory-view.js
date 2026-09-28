/* Presentation only. No simulation, timers, network calls or layer selection. */
(function (global) {
  'use strict';
  const colors = {weight:'#D185E6',optimizer:'#8D89EE',gradient:'#79D4F2',activation:'#B1EF6B',workspace:'#D0D0D0',communication:'#606060',pool:'#858585'};
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Same orthographic projection and 1:1:1 ratio as the source atlas.
  const P = (x,y,z) => { y=y/155*245; return [575+(x-y)*Math.sqrt(3)/2,510+(x+y)*.5-z/(64*6.7)*245]; };
  const points = vertices => vertices.map(p => P(...p).join(',')).join(' ');
  const polygon = (vertices,color) => `<polygon points="${points(vertices)}" fill="${color}"/>`;
  const shade = (color,factor) => '#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(color.slice(i,i+2),16)*factor)).toString(16).padStart(2,'0')).join('');
  function block(z,h,color) {
    const x=6,y=6,w=233,d=143;
    return polygon([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],shade(color,.82))
      +polygon([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],shade(color,1.04))
      +polygon([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],shade(color,.94));
  }
  function render(target,data) {
    if (!Number.isFinite(data.capacityGB) || data.capacityGB<=0 || !Array.isArray(data.categories)
      || data.categories.some(c=>!Number.isFinite(c.valueGB)||c.valueGB<0)
      || Math.abs(data.categories.reduce((sum,c)=>sum+c.valueGB,0)-data.capacityGB)>.001) {
      throw new Error('Invalid memory snapshot');
    }
    const height=64*6.7,unit=height/data.capacityGB;
    let z=6,drawn=0;
    const occupied=data.categories.filter(c=>!['free','unknown'].includes(c.id)&&c.valueGB>0);
    // Decorative separation must fit inside the available capacity frame.
    const free=data.categories.find(c=>['free','unknown'].includes(c.id))?.valueGB||0;
    const gap=Math.min(8,Math.max(0,(free*unit-12)/Math.max(1,occupied.length-1)));
    z=Math.min(6,free*unit/2);
    let markup=polygon([[0,0,0],[245,0,0],[245,155,0],[0,155,0]],'#000')
      +polygon([[0,0,0],[245,0,0],[245,0,height],[0,0,height]],'#030303')
      +polygon([[0,0,0],[0,155,0],[0,155,height],[0,0,height]],'#030303');
    let surfaceLabels='';
    for (const c of occupied) {
      if(drawn++)z+=gap;
      const h=c.valueGB*unit;
      markup+=`<g data-category="${escape(c.id)}"><title>${escape(c.name)} · ${c.valueGB.toFixed(2)} GB</title>${block(z,h,colors[c.id]||'#858585')}</g>`;
      if(c.id===data.selectedCategory){
        markup+=`<path d="M${P(6,6,z+h)} L${P(239,6,z+h)} L${P(239,149,z+h)} L${P(6,149,z+h)} Z" fill="none" stroke="#fff" stroke-width="2"/>`;
      }
      // Original surface-value label style; omit bands too thin for a readable label.
      if(h/height*245>=18){
        const anchor=P(239,142,z+h/2);
        surfaceLabels+=`<g class="surface-value" aria-label="${escape(c.name)} ${c.valueGB.toFixed(2)} GB"><text transform="matrix(0.8660254 -.5 0 1 ${anchor[0]} ${anchor[1]})" dominant-baseline="middle" fill="#fff" font-size="18" font-weight="700"><tspan font-weight="400">${escape(c.symbol)} · </tspan><tspan>${c.valueGB.toFixed(2)}</tspan><tspan dx="4" font-size="10.8" font-weight="400">GB</tspan></text></g>`;
      }
      z+=h;
    }
    markup+=`<path d="M${P(0,155,height)} L${P(0,0,height)} L${P(245,0,height)} L${P(245,155,height)} Z M${P(0,155,height)} L${P(0,155,0)} L${P(245,155,0)} L${P(245,0,0)} L${P(245,0,height)} M${P(245,155,height)} L${P(245,155,0)}" fill="none" stroke="#eee" stroke-width="2.4"/>`;
    markup+=surfaceLabels;
    // Reuse v10's rank-wall typography, following the isometric left edge.
    const wall=P(0,140,height);
    markup+=`<g transform="matrix(0.8660254 -.5 0 1 ${wall[0]} ${wall[1]-40})" fill="#f5f5f5"><text font-size="26" font-weight="700">Rank ${String(data.rank).padStart(2,'0')}</text><text y="22" font-size="11" fill="#bdbdbd">${data.capacityGB} GB</text></g>`;
    const title=`Rank ${data.rank} · ${data.scope}；${(data.assumptions||[]).join('；')}`;
    target.innerHTML=`<svg viewBox="345 222 460 553" role="img" aria-label="${escape(title)}"><title>${escape(title)}</title>${markup}</svg>`;
  }
  global.RankMemoryView={render,colors:Object.freeze(colors)};
})(window);
