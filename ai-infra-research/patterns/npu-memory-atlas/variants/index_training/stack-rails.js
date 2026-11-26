/* Pangu ground rail: same skew, 84-unit MB pitch, 36-unit F/B pitch,
 * arrow paths and hit rectangles as pangu-layer-stack_2.html:527–541.
 * Host clock/config replaces its four-MB sample data. No second clock. */
window.createTrainingStackRails=function({svg,el,onSeek}){
 const rails=el('g',{class:'ground-rail','aria-label':'微批前向与反向'});svg.append(rails);
 let key='',marks=[],rows=[],links=[];
 function update({count,ga,process,selected,geometry}){
  const {projectionX:px,projectionY:py,positions}=geometry,side=px===.035,stepX=40,stepY=side?0:12,span=(count-1)*stepX;
  const ground={x:170+362*px,y:365+362*py+462+50,slope:-stepY/stepX};
  rails.setAttribute('transform',`matrix(1 ${ground.slope} 0 1 ${ground.x} ${ground.y})`);
  if(key!==count+':'+ga){
   key=count+':'+ga;rails.replaceChildren();marks=[];rows=[];links=[];
   for(let row=0;row<ga*2+2;row++){
    const y=row<ga*2?Math.floor(row/2)*84+(row%2)*36:ga*84+6+(row-ga*2)*42;
    const group=el('g',{'data-step-row':row});rails.append(group);rows.push(group);
    const caption=row<ga*2?`${Math.floor(row/2)+1} ${row%2?'B':'F'}`:row===ga*2?'累积':'更新';
    group.append(el('text',{x:-24,y:y+10,'text-anchor':'end',class:'mb-axis-label'},caption));
    group.append(el('path',{d:`M0,${y} H${span}`,class:'rail-baseline',fill:'none','stroke-width':.7}));
    for(let l=0;l<count;l++){
     const x=l*stepX,g=el('g',{class:'mb-mark',role:'button',tabindex:0,'data-rail-layer':l,'data-rail-row':row});
     const mark=el('path',{class:row<ga*2?'mb-flow-arrow':'mb-accumulation-mark',d:row<ga*2?(row%2?`M${x+4},${y-4} l-6,4 l6,4`:`M${x-4},${y-4} l6,4 l-6,4`):`M${x-5},${y} h10`,fill:'none','pointer-events':'none'});
     g.append(el('rect',{x:x-10,y:y-10,width:20,height:20,fill:'transparent'}),mark);
     const title=`${caption} · L${l}`;g.setAttribute('aria-label',title);g.dataset.wbTip=title;
     const seek=()=>onSeek(row<ga*2?row*count+(row%2?count-1-l:l):ga*count*2+row-ga*2);
     g.addEventListener('click',seek);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();seek();}});
     group.append(g);marks.push({row,l,g,mark});
    }
   }
   // Actual plane bottoms connect to their depth-axis ports, including dock X.
   for(let l=0;l<count;l++){const link=el('path',{class:'rail-plane-link',fill:'none','stroke-width':1,'stroke-dasharray':'3 5','pointer-events':'none'});rails.prepend(link);links.push(link);}
  }
  const phase=process.layer===null?ga*2+(process.phase==='update'?1:0):process.mb*2+Number(process.backward);
  rows.forEach((g,row)=>{g.style.display=row<ga*2?Math.floor(row/2)<=process.mb?'':'none':row<=phase?'':'none';});
  for(const {row,l,g,mark} of marks){
   const ready=row<phase||row===phase&&(process.backward?l>=process.layer:l<=process.layer),active=row===phase&&l===selected;
   mark.setAttribute('stroke',active?'var(--ink)':ready?'var(--muted)':'var(--line)');mark.setAttribute('stroke-width',active?3:2);mark.setAttribute('stroke-dasharray',ready?'none':'2 3');g.setAttribute('aria-pressed',String(active));
  }
  links.forEach((link,l)=>{const p=positions[l];if(!p)return;const x=p.x+362*px-ground.x,y=p.y+362*py+462-ground.y-ground.slope*x;link.setAttribute('d',`M${x},${y} V-8`);link.style.display=l===selected||l===0||l===count-1?'':'none';});
 }
 return {update,element:rails};
};
