// Layout consumes semantic rows. It does not choose model or parallelism.
function layoutTrainingRows(rows,{opWidth=256,startY=82,gap=25}={}){
 const oh=opWidth*64/360;
 let cursorY=startY;
 for(const r of rows){r.y=cursorY;r.h=r.kind==='moe'?660:r.kind==='value'?Math.max(42,72*r.shape[0]/Math.max(...r.shape)):r.kind==='add'?44:oh;r.cy=r.y+r.h/2;r.top=r.y+(r.kind==='value'?(r.h-72*r.shape[0]/Math.max(...r.shape))/2-3:0);r.bottom=r.kind==='moe'?r.y+580+oh:r.y+r.h-(r.kind==='value'?(r.h-72*r.shape[0]/Math.max(...r.shape))/2-3:0);cursorY+=r.h+gap;}
 return cursorY;
}
