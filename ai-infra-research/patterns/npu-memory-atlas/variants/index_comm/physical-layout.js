/* Shared physical layout: contiguous cabinet slots, cabinet slots. */
(function(root){
 const coordinates=(id,capacity=32)=>{const slot=id%capacity;return {group:Math.floor(id/capacity),column:slot%2,row:Math.floor(slot/2),slot};};
 function position(id,{world=128,capacity=32,w=245,d=245,h=245*4/3,sx=385,sy=365,sz=245*4/3+75,view='2.5D'}={}){
  const c=coordinates(id,capacity),count=Math.ceil(world/capacity),columns=count,cabinetColumn=c.group,cabinetRow=0;
  const x=cabinetColumn*(2*sx+220)+c.column*sx,y=cabinetRow*(d+1100),z=-(c.row*sz+(c.row>=8?sz*.5:0));
  if(view==='Top')return [cabinetColumn*(2*sx+220)+c.column*sx,cabinetRow*(Math.ceil(capacity/2)*sy+400)+c.row*sy];
  if(view==='Front')return [c.group*(2*sx+220)+c.column*sx,-z];
  if(view==='Side')return [c.group*(2*sy+220)+c.column*sy,-z];
  return {x,y,z,cabinetColumn,cabinetRow,...c};
 }
 const api={coordinates,position};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RankPhysicalLayout=api;
})(typeof globalThis!=='undefined'?globalThis:this);
