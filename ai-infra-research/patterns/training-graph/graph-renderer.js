// Keyed SVG reconciliation. Unchanged nodes and their descendants retain DOM identity.
function graphElementKey(el){return el.nodeType===1?(el.getAttribute('data-node')||el.getAttribute('data-edge')||(el.hasAttribute('data-rank-id')?'rank:'+el.getAttribute('data-rank-id'):null)||(el.hasAttribute('data-rank-band')?'rank-band:'+el.getAttribute('data-rank-band'):null)||el.id||null):null;}
function patchGraphElement(target,source,stats){
 if(target.isEqualNode(source)){stats.unchanged++;return;}
 if(target.nodeType!==1||source.nodeType!==1){if(target.nodeValue!==source.nodeValue){target.nodeValue=source.nodeValue;stats.updated++;}return;}
 for(const attr of Array.from(target.attributes))if(!source.hasAttribute(attr.name))target.removeAttribute(attr.name);
 for(const attr of Array.from(source.attributes))if(target.getAttribute(attr.name)!==attr.value){target.setAttribute(attr.name,attr.value);stats.updated++;}
 patchGraphChildren(target,source,stats);
}
function patchGraphChildren(target,source,stats){
 const old=Array.from(target.childNodes),keyed=new Map(old.map(n=>[graphElementKey(n),n]).filter(([k])=>k));
 const used=new Set();let cursor=target.firstChild;
 for(const candidate of Array.from(source.childNodes)){
  const key=graphElementKey(candidate);
  let match=key?keyed.get(key):old.find(n=>!used.has(n)&&!graphElementKey(n)&&n.nodeType===candidate.nodeType&&n.nodeName===candidate.nodeName);
  if(match&&(match.nodeType!==candidate.nodeType||match.nodeName!==candidate.nodeName))match=null;
  if(match){used.add(match);if(match!==cursor)target.insertBefore(match,cursor);patchGraphElement(match,candidate,stats);stats.reused++;}
  else{match=target.ownerDocument.importNode(candidate,true);target.insertBefore(match,cursor);stats.created++;}
  cursor=match.nextSibling;
 }
 for(const n of old)if(!used.has(n)&&n.parentNode===target){target.removeChild(n);stats.removed++;}
}
function updateGraphSvg(target,markup){
 const source=new DOMParser().parseFromString(markup,'image/svg+xml');
 if(source.querySelector('parsererror'))throw Error('Invalid graph SVG');
 target.querySelectorAll('[data-animation-exit]').forEach(el=>el.remove());
 const stats={reused:0,unchanged:0,updated:0,created:0,removed:0};
 patchGraphChildren(target,source.documentElement,stats);return stats;
}
function createFrameScheduler(callback,request=requestAnimationFrame,cancel=cancelAnimationFrame){
 let frame=null;
 const schedule=()=>{if(frame!==null)return;frame=request(()=>{frame=null;callback();});};
 schedule.cancel=()=>{if(frame!==null)cancel(frame);frame=null;};
 return schedule;
}
