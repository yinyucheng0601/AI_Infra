/* EP surface treatment only: same centerlines, ports, metadata and 1.5 unit footprint. */
function applyEPCopper(root,selector){
 const NS='http://www.w3.org/2000/svg';
 root.querySelectorAll('[data-ep-copper-overlay],[data-ep-copper-defs]').forEach(n=>n.remove());root.querySelectorAll('.ep-copper-path').forEach(n=>n.classList.remove('ep-copper-path'));
 if(!selector)return;
 const paths=[...root.querySelectorAll(selector)];if(!paths.length)return;
 const defs=document.createElementNS(NS,'defs');defs.setAttribute('data-ep-copper-defs','');root.prepend(defs);
 defs.innerHTML='<marker id="ep-copper-port" viewBox="-3 -3 6 6" markerWidth="6" markerHeight="6" markerUnits="userSpaceOnUse" orient="auto-start-reverse" refX="0" refY="0"><circle r="1.2" fill="#B87952"/></marker>';
 paths.forEach((source,index)=>{
  const b=source.getBBox(),id='ep-copper-'+index,g=document.createElementNS(NS,'linearGradient');g.id=id;g.setAttribute('gradientUnits','userSpaceOnUse');g.setAttribute('x1','0');g.setAttribute('x2','0');g.setAttribute('y1',b.y-3);g.setAttribute('y2',b.y+Math.max(1,b.height)+3);
  g.innerHTML='<stop offset="0" stop-color="#C58B65"/><stop offset=".18" stop-color="#B97B54"/><stop offset=".48" stop-color="#C98F69"/><stop offset=".72" stop-color="#AF704A"/><stop offset="1" stop-color="#9F623F"/>';defs.append(g);
  const markers=['start','end'].filter(end=>getComputedStyle(source).getPropertyValue('marker-'+end)!=='none');
  const overlay=document.createElementNS(NS,'g');overlay.setAttribute('data-ep-copper-overlay','');overlay.setAttribute('aria-hidden','true');overlay.style.pointerEvents='none';source.classList.add('ep-copper-path');
  const fan=source.matches('.b-fan')&&source.tagName.toLowerCase()==='line';
  const make=(width,stroke,opacity,shift)=>{const n=document.createElementNS(NS,fan?'path':source.tagName);for(const name of ['d','x1','y1','x2','y2'])if(source.hasAttribute(name))n.setAttribute(name,source.getAttribute(name));if(fan){const x1=+source.getAttribute('x1'),y1=+source.getAttribute('y1'),x2=+source.getAttribute('x2'),y2=+source.getAttribute('y2');n.setAttribute('d',`M${x1},${y1+1.6} L${x2},${y2-7} V${y2-1.6}`);}
  if(source.matches('.b-mesh')){let d=source.getAttribute('d');d=d.replace(/^(M[-\d.]+,)([-\d.]+)/,(_,m,y)=>m+(+y-1.6)).replace(/V([-\d.]+)$/,(_,y)=>'V'+(+y-1.6));n.setAttribute('d',d);}
  n.style.setProperty('fill','none');n.style.setProperty('stroke',stroke,'important');n.style.setProperty('stroke-width',width+'px','important');n.style.setProperty('stroke-opacity',String(opacity),'important');n.style.setProperty('vector-effect','none','important');n.style.setProperty('stroke-linecap','butt');n.style.setProperty('stroke-linejoin','miter');n.style.setProperty('marker-start','none','important');n.style.setProperty('marker-end','none','important');if(shift)n.setAttribute('transform','translate(-.18 -.24)');return n;};
  overlay.append(make(1.5,'#A96C47',1,false),make(1.1,'url(#'+id+')',1,false),make(.2,'#D8A381',.25,false));
  // Paint ports last so the fine highlight terminates inside the solid copper pad.
  const ports=make(1.5,'none',0,false);
  for(const end of markers)ports.style.setProperty('marker-'+end,'url(#ep-copper-port)','important');
  overlay.append(ports);source.style.setProperty('stroke-opacity','0','important');source.style.setProperty('marker-start','none','important');source.style.setProperty('marker-end','none','important');source.after(overlay);
 });
}
