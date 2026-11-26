/* Source dock: pangu-layer-stack-standalone.html; animation/occlusion: _2.html. */
window.createTrainingStackGeometry=function(options){
let selected=0,hovered=null,focusPosition=0,animationFrame=0,lastFrameTime=0,mbPlaying=false;
let projectionX=.72,projectionY=.3312,layerStepY=12;const layerStepX=40,planeWidth=362,planeHeight=462;
let layers=[],displayedPositions=[];const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function paintGeometry(){options.paint({projectionX,projectionY,positions:displayedPositions.map((p,l)=>({...p,occluded:labelIsOccluded(l)})),selected,hovered});}
function position(l,focus=focusPosition){
 const d=l-focus,fraction=(1-Math.tanh(d/.9))/2;
 const lift=180*Math.exp(-.5*Math.pow(d/.55,2));
 return {x:170+l*layerStepX-220*fraction,y:365-l*layerStepY+66*fraction-lift};
}
// Test the label footprint / top-left corner against foreground parallelograms.
// Painter order is L48 ... L0, so only lower-index planes can occlude this layer.
function labelIsOccluded(l){
 const p=displayedPositions[l]??position(l);
 const samples=[[p.x-14,p.y-14],[p.x-23,p.y-14],[p.x+4,p.y+8]];
 for(let front=0;front<l;front++){
 const q=displayedPositions[front]??position(front);
 for(const [x,y] of samples){const localX=(x-q.x)/projectionX,localY=y-q.y-projectionY*localX;
 if(localX>=0&&localX<=planeWidth&&localY>=0&&localY<=planeHeight)return true;}
 }
 return false;
}
function animateGeometry(time){
 const target=hovered??selected,dt=lastFrameTime?Math.min(40,time-lastFrameTime):16.7;lastFrameTime=time;
 const blend=1-Math.exp(-dt/(mbPlaying?12:55));let moving=false;focusPosition=target;
 // Interpolate each plane toward its own destination. Do not sweep a focus
 // index through unrelated layers when switching between distant targets.
 for(const l of layers){const dest=position(l,target),from=displayedPositions[l]??dest;
 if(reducedMotion.matches||Math.hypot(dest.x-from.x,dest.y-from.y)<.15)displayedPositions[l]=dest;
 else{displayedPositions[l]={x:from.x+(dest.x-from.x)*blend,y:from.y+(dest.y-from.y)*blend};moving=true;}}
 paintGeometry();
 if(moving)animationFrame=requestAnimationFrame(animateGeometry);
 else{animationFrame=0;lastFrameTime=0;}
}
function requestGeometry(){
 if(reducedMotion.matches){if(animationFrame)cancelAnimationFrame(animationFrame);animationFrame=0;lastFrameTime=0;focusPosition=hovered??selected;for(const l of layers)displayedPositions[l]=position(l,focusPosition);paintGeometry();return;}
 if(!animationFrame)animationFrame=requestAnimationFrame(animateGeometry);
}

return {update(next){
const rebuild=layers.length!==next.count;if(selected!==next.selected)hovered=null;selected=next.selected;mbPlaying=next.playing;projectionX=next.side?.035:.72;projectionY=next.side?0:.3312;layerStepY=next.side?0:12;
if(rebuild){if(animationFrame)cancelAnimationFrame(animationFrame);animationFrame=0;lastFrameTime=0;layers=Array.from({length:next.count},(_,l)=>l);displayedPositions=layers.map(l=>position(l));}
requestGeometry();},preview(l){const preview=l===selected?null:l;if(hovered===preview)return;hovered=preview;requestGeometry();},snapshot(){return {positions:displayedPositions.map(p=>({...p})),selected,hovered,moving:animationFrame!==0,projectionX,projectionY};}};
};
