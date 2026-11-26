// Runs in the source workbench closure, sharing its camera and interaction state.
let graphFocusFrame=0;
function cancelGraphFocus(){if(graphFocusFrame)cancelAnimationFrame(graphFocusFrame);graphFocusFrame=0;}
function focusTrainingMoe(animate=true){
 cancelGraphFocus();const svg=graphSurface();if(!svg?.dataset.moeWidth)return false;
 const box=svg.getBoundingClientRect();if(!box.width||!box.height)return false;
 const region={x:Number(svg.dataset.moeX),y:Number(svg.dataset.moeY),w:Number(svg.dataset.moeWidth),h:Number(svg.dataset.moeHeight)};
 const width=Math.max(region.w,region.h*box.width/box.height)*1.08,height=width*box.height/box.width;
 const target={x:region.x+region.w/2-width/2,y:region.y+region.h/2-height/2,w:width},from={x:graphCamera.x,y:graphCamera.y,w:graphWidth()/graphCamera.zoom};
 const apply=v=>{graphCamera.x=v.x;graphCamera.y=v.y;graphCamera.zoom=graphWidth()/v.w;applyGraphCamera();};
 if(!animate||matchMedia('(prefers-reduced-motion: reduce)').matches){apply(target);return true;}
 const start=performance.now();function frame(time){const t=Math.min(1,(time-start)/400),k=1-Math.pow(1-t,3);apply({x:from.x+(target.x-from.x)*k,y:from.y+(target.y-from.y)*k,w:from.w+(target.w-from.w)*k});if(t<1)graphFocusFrame=requestAnimationFrame(frame);else graphFocusFrame=0;}
 graphFocusFrame=requestAnimationFrame(frame);return true;
}
