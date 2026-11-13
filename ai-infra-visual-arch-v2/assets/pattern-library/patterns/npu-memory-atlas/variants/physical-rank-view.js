/* Physical Rank geometry: width : depth : height = 2.5 : 5.5 : 1.
 * Capacity is encoded along depth; hardware dimensions are a visual proportion.
 * The logical projection and its vertical memory stack remain owned by the host.
 */
(()=>{
 const old={P,drawRank,rankWallLabel,physicalRankPosition,rankPaintOrder,rankAxisRulers,drawRankRulers,drawViewGroups,focusedRankGeometry,transform};
 const size={w:245,d:539,h:98};
 P=function(x,y,z){
  if(rankLayout!=='physical')return old.P(x,y,z);
  x=x/245*size.w;y=y/155*size.d;z=z/(HBM*6.7)*size.h;
  if(viewMode==='Top')return [575+x,265+y];
  if(viewMode==='Front')return [575+x,510-z];
  if(viewMode==='Side')return [575+y,510-z];
  return [575+(x-y)*Math.sqrt(3)/2,510+(x+y)*.5-z];
 };
 function placement(id){return RankPhysicalLayout.position(id,{world:worldSize,capacity:physicalRanksPerCabinet,...size,sx:300,sy:579,sz:126,cabinetGap:900,thin:true,view:viewMode});}
 physicalRankPosition=function(r){
  const p=placement(r.id);if(Array.isArray(p))return [537+p[0]*RANK_SCALE,325+p[1]*RANK_SCALE];
  return [537+(p.x-p.y)*Math.sqrt(3)/2*RANK_SCALE,325+((p.x+p.y)*.5-p.z)*RANK_SCALE];
 };
 rankPaintOrder=function(){
  if(rankLayout!=='physical')return old.rankPaintOrder();
  return [...ranks].sort((a,b)=>{const aa=physicalCoordinates(a),bb=physicalCoordinates(b);return aa.z-bb.z||aa.group-bb.group||aa.x-bb.x;});
 };
 focusedRankGeometry=function(geometry,id,focus){
  if(rankLayout==='physical'&&mode==='comm')return neutralRankGeometry(geometry);
  return old.focusedRankGeometry(geometry,id,focus);
 };
 rankWallLabel=function(){
  if(rankLayout!=='physical')return old.rankWallLabel();
  if(!labels)return '';
  const local=renderRank%physicalRanksPerCabinet,side=viewMode==='Side';
  if(side&&local%2===0&&renderRank+1<worldSize&&local+1<physicalRanksPerCabinet)return '';
  const pair=side&&local%2===1?`R${renderRank-1} / R${renderRank}`:`R${renderRank}`;
  const anchor=viewMode==='Top'?P(12,147,HBM*6.7):side?P(245,8,HBM*6.7*.68):P(12,155,HBM*6.7*.68);
  return `<g class="rank-external-label physical-rank-label" pointer-events="none"><text x="${anchor[0]}" y="${anchor[1]}" fill="${epPalette().ink}" font-size="18" font-family="ui-monospace,monospace">${pair}</text></g>`;
 };
 rankAxisRulers=function(){
  if(rankLayout!=='physical')return old.rankAxisRulers();
  if(scope!=='all'||viewMode!=='2.5D')return [];
  const first=ranks.slice(0,physicalRanksPerCabinet),corners=first.flatMap(rankSilhouette);
  const left=Math.min(...corners.map(p=>p[0]))-70,top=Math.min(...corners.map(p=>p[1]))-80;
  const rows=Math.min(Math.ceil(physicalRanksPerCabinet/2),Math.ceil(worldSize/2));
  const rowPoints=Array.from({length:rows},(_,i)=>{const [x,y]=rankPosition(ranks[i*2]);return [left,y+RANK_SCALE*P(0,155,HBM*6.7*.5)[1]];});
  const a=rankPosition(ranks[0]),b=rankPosition(ranks[Math.min(1,worldSize-1)]);
  return [{axis:'z',title:'行',count:rows,points:rowPoints},{axis:'x',title:'卡列',count:Math.min(2,worldSize),points:[[left,top],[left+b[0]-a[0],top+b[1]-a[1]]].slice(0,Math.min(2,worldSize))}];
 };
 drawRankRulers=function(){
  if(rankLayout!=='physical')return old.drawRankRulers();
  if(scope!=='all'||viewMode!=='2.5D')return '';
  const axis=rankAxisRulers()[0],points=axis.points,ink=epPalette().muted;
  let out=`<g class="physical-rulers" pointer-events="none" fill="${ink}" stroke="${ink}" stroke-width=".7"><path d="M${points[0]}L${points.at(-1)}" fill="none"/>`;
  points.forEach(([x,y],i)=>{out+=`<path d="M${x} ${y}h-8"/><text x="${x-14}" y="${y}" font-size="13" stroke="none" dominant-baseline="middle" text-anchor="end">${i}</text>`;});
  const a=rankPosition(ranks[0]),b=rankPosition(ranks[Math.min(1,worldSize-1)]),pa=P(0,0,HBM*6.7),pb=P(245,0,HBM*6.7);
  const start=[a[0]+RANK_SCALE*(pa[0]-440),a[1]+RANK_SCALE*pa[1]-62],end=[b[0]+RANK_SCALE*(pb[0]-440),b[1]+RANK_SCALE*pb[1]-62];
  const cx=(start[0]+end[0])/2,cy=(start[1]+end[1])/2;
  out+=`<path d="M${start[0]} ${start[1]+10}L${start}L${end}l0 10" fill="none"/><text data-physical-column-label="true" transform="matrix(.8660254 .5 0 1 ${cx} ${cy-12})" font-size="13" text-anchor="middle" stroke="none">卡列 · ${Math.min(2,worldSize)} 列</text></g>`;
  return out;
 };
 drawViewGroups=function(){
  if(rankLayout!=='physical'||scope!=='all'||viewMode!=='2.5D')return old.drawViewGroups();
  return Array.from({length:Math.ceil(worldSize/physicalRanksPerCabinet)},(_,group)=>{
   const first=group*physicalRanksPerCabinet,last=Math.min(worldSize,first+physicalRanksPerCabinet)-1;
   const origin=rankPosition(ranks[first]),back=P(0,0,HBM*6.7);
   const x=origin[0]+RANK_SCALE*(back[0]-440)-12,y=origin[1]+RANK_SCALE*back[1]-110;
   return `<text data-physical-group="${group}" data-label-plane="cabinet-back" transform="matrix(0.8660254 .5 0 1 ${x} ${y})" fill="${epPalette().muted}" font-size="13" pointer-events="none">机柜组 ${group} · R${first}–R${last} · ${last-first+1} Rank</text>`;
  }).join('');
 };
 function slices(){
  const total=cats.reduce((sum,c)=>sum+Math.max(0,c.value),0),denominator=Math.max(HBM,total);
  let depth=155;return stackOrder.map(i=>{const length=Math.max(0,cats[i].value)/denominator*155;depth-=length;return {i,y:depth,length};});
 }
 drawRank=function(){
  if(rankLayout!=='physical')return old.drawRank();
  applySimulation();
  const height=HBM*6.7,light=document.documentElement.dataset.theme==='light';
  let out=backFaces();
  const bands=slices(),gap=mode==='explode'||mode==='comm'?8/(size.d/155):0,active=bands.filter(b=>b.length>.00001).length,usable=155-6-gap*Math.max(0,active-1);
  let cursor=3;
  for(const band of bands){
   const {i}=band,rawLength=band.length,y=cursor,length=rawLength/155*usable;
   if(rawLength>.00001)cursor+=length+gap;
   if(length<.00001||!memoryCategoryVisible(i))continue;
   const a=cats[i],free=i===7;
   const target=selectedMemoryTarget,matched=target?.rank===renderRank&&[0,1,2].includes(i)&&selectedMemoryCategory===i;
   const shard=mode==='shard'&&[0,1,2].includes(i),color=free?(light?'#f5f5f5':'#181818'):matched||shard?'#454545':a.color;
   const attrs=shard?shardDetailAttrs(i===0?0:1):'';
   out+=`<g data-physical-memory="${i}" data-memory-start="${y}" data-memory-length="${rawLength}" ${attrs}><title>${a.name} · ${memorySize(a.value)}</title>`+(free?'':block(8,y,height*.09,229,length,height*.82,color));
   if(matched){
    const regions=RankAtlasModel.parameterRegions(renderRank,atlasConfig),total=RankAtlasModel.parameters(renderRank,atlasConfig);
    for(const region of regions)if((target.layer===undefined||region.layer===target.layer)&&target.indices.includes(region.index))out+=`<g data-memory-target="${renderRank}:${region.layer}:${region.index}">`+block(8,y+length*region.offset/total,height*.09,229,length*region.elements/total,height*.82,a.color)+'</g>';
   }else if(shard){
    const selected=+$('tensor').value,owned=rankGroups(renderRank),total=owned.reduce((n,g)=>n+g[2],0),amount=owned[selected]?.[2]||0,offset=owned.slice(0,selected).reduce((n,g)=>n+g[2],0);
    if(amount>0)out+=block(8,y+length*offset/total,height*.09,229,length*amount/total,height*.82,a.color);
   }
   out+='</g>';
  }
  return `<g data-physical-rank="${renderRank}" data-memory-axis="depth">${out}${outline(0,height)}${outerRankBorder()}${rankWallLabel()}</g>`;
 };
 // Fit the thin physical assemblies using their actual projected extents.
 transform=function(){
  if(rankLayout!=='physical'||mode==='comm')return old.transform();
  const world=$('world'),box=world.getBBox(),width=scope==='single'?820:860,height=scope==='single'?580:650;
  const fit=Math.min(width/Math.max(1,box.width),height/Math.max(1,box.height));
  world.setAttribute('transform',`translate(${700+pan[0]} ${430+pan[1]}) scale(${zoom*fit}) translate(${-box.x-box.width/2} ${-box.y-box.height/2})`);
  $('zoom').textContent=Math.round(zoom*100)+'%';
 };
})();
