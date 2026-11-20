// Expert sizes are fixed; only representation and placement change with count.
function layoutExpertGrid(count,ep){
 const compact=count>8,columns=Math.min(count,compact?8:4),rows=Math.ceil(count/columns),width=compact?96:280,stride=width+(compact?36:20),rowHeight=compact?180:320;
 const cards=Array.from({length:count},(_,id)=>{const owner=Math.floor(id/(count/ep));return {id,owner,x:(id%columns-(columns-1)/2)*stride+(count/ep>=columns?0:(owner-(ep-1)/2)*50),y:250+Math.floor(id/columns)*rowHeight+(count/ep>=columns?owner*70:0),width,height:compact?150:300};});
 const halfWidth=Math.max(600,...cards.map(c=>Math.abs(c.x)+c.width/2+130));
 const combineY=Math.max(...cards.map(c=>c.y+c.height))+80;return {compact,cards,halfWidth,combineY,height:combineY+80};
}
// Layout consumes semantic rows. It does not choose model or parallelism.
function layoutTrainingRows(rows,{opWidth=256,startY=82,gap=25,expertLayout=layoutExpertGrid(4,1)}={}){
 const oh=opWidth*64/360;
 let cursorY=startY;
 for(const r of rows){r.y=cursorY;r.h=r.kind==='moe'?expertLayout.height:r.kind==='value'?Math.max(42,72*r.shape[0]/Math.max(...r.shape)):r.kind==='add'?44:oh;r.cy=r.y+r.h/2;r.top=r.y+(r.kind==='value'?(r.h-72*r.shape[0]/Math.max(...r.shape))/2-3:0);r.bottom=r.kind==='moe'?r.y+expertLayout.combineY+oh:r.y+r.h-(r.kind==='value'?(r.h-72*r.shape[0]/Math.max(...r.shape))/2-3:0);cursorY+=r.h+gap;}
 return cursorY;
}
