// Layout adaptation only. Card geometry comes from the approved expert grid.
function layoutTrainingExperts(count,ep){
 const source=layoutExpertGrid(count,ep);if(!source.compact)return source;
 const perGroup=count/ep,columns=Math.min(ep===1?16:8,perGroup);
 const groupColumns=Math.min(ep,2**Math.max(0,Math.ceil(Math.log2(12/columns))));
 const width=source.cards[0].width,height=source.cards[0].height,stride=width+36;
 const groupWidth=(columns-1)*stride+width,groupHeight=Math.ceil(perGroup/columns)*100+52;
 const totalWidth=groupColumns*groupWidth+(groupColumns-1)*64;
 const cards=source.cards.map(card=>{const local=card.id%perGroup;return {...card,
  x:-totalWidth/2+(card.owner%groupColumns)*(groupWidth+64)+width/2+(local%columns)*stride,
  y:220+Math.floor(card.owner/groupColumns)*groupHeight+Math.floor(local/columns)*100};});
 const halfWidth=totalWidth/2+52,combineY=Math.max(...cards.map(c=>c.y+c.height))+80;
 return {...source,cards,halfWidth,combineY,height:combineY+80};
}
