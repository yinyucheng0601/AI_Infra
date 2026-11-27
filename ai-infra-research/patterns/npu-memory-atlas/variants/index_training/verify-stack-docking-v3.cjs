// HISTORICAL: single-hover endpoint checks; superseded by the consecutive-layer journey.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../../../../..'),OUT=path.join(ROOT,'review-output/training-pattern-composition/stack-docking-2026-11-26');
const {chromium}=require(path.join(ROOT,'ai-infra-visual-arch-v3/presentation/node_modules/playwright'));
const dock=fs.readFileSync(path.join(ROOT,'layer_stack/pangu-layer-stack-standalone.html'),'utf8');
const source=dock.slice(dock.indexOf('function position(l,focus=focusPosition){'),dock.indexOf('// Test the label footprint')).replace('l*20','l*layerStepX').replace('l*6','l*layerStepY');
assert.ok(fs.readFileSync(path.join(__dirname,'stack-geometry-source.js'),'utf8').includes(source));
fs.mkdirSync(OUT,{recursive:true});let browser;
(async()=>{
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8907/ai-infra-research/patterns/npu-memory-atlas/variants/index_training.html');
 await p.evaluate(()=>{playing=false;TrainingComposition.setPrimary(true,false);TrainingComposition.selectLayer(6)});
 const settled=async()=>{await p.waitForFunction(()=>!TrainingComposition.geometry.moving);return p.evaluate(()=>TrainingComposition.geometry)};
 const initial=await settled();
 const occlusion=await p.evaluate(()=>{const svg=document.querySelector('#training-stack'),g=svg.querySelector('.chosen'),m=g.getScreenCTM(),point=new DOMPoint(100,400).matrixTransform(m);return {order:[...svg.firstElementChild.children].map(n=>+n.dataset.layer),front:Number(document.elementFromPoint(point.x,point.y)?.closest('.plane')?.dataset.layer)}});
 assert.deepEqual(occlusion.order,Array.from({length:48},(_,i)=>47-i));assert.ok(occlusion.front<6,'foreground still covers popped lower face');
 // Source dock groups the planes in front, splits the selected layer halfway,
 // and keeps the rear group at its original position.
 for(const l of [0,5,6,7,20]){const fraction=l<6?1:l===6?.5:0;assert.deepEqual(initial.positions[l],{x:170+l*40-220*fraction,y:365-l*12+66*fraction-(l===6?180:0)});}
 const target=await p.locator('#training-stack .plane[data-layer="10"]').evaluate(g=>{const m=g.getScreenCTM();const pt=new DOMPoint(12,12).matrixTransform(m);return {x:pt.x,y:pt.y}});
 await p.mouse.move(target.x,target.y);await p.waitForFunction(()=>TrainingComposition.geometry.hovered===10);
 const mid=await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(TrainingComposition.geometry)))));
 const hover=await settled();assert.notDeepEqual(mid.positions,hover.positions,'hover must interpolate');
 for(const l of [5,6,9,10,11,20]){const d=l-10,fraction=(1-Math.tanh(d/.9))/2,lift=180*Math.exp(-.5*Math.pow(d/.55,2));assert.deepEqual(hover.positions[l],{x:170+l*40-220*fraction,y:365-l*12+66*fraction-lift});}
 assert.equal(hover.selected,6,'hover preserves selection');assert.notEqual(hover.positions[9].x,initial.positions[9].x,'front neighbour follows the hover dock');assert.notEqual(hover.positions[11].x,initial.positions[11].x,'rear neighbour follows the hover dock');
 await p.screenshot({path:path.join(OUT,'hover-dark.png')});
 await p.mouse.move(2,2);const restored=await settled();assert.equal(restored.hovered,null);assert.deepEqual(restored.positions,initial.positions,'leave restores the current pop and its front/back groups');
 const themes={};for(const theme of ['dark','light']){
  await p.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  themes[theme]=await p.evaluate(()=>{const root=document.querySelector('#training-stack');const style=selector=>{const s=getComputedStyle(root.querySelector(selector));return {fill:s.fill,stroke:s.stroke,fontSize:s.fontSize,fontFamily:s.fontFamily}};return {ordinary:style('.plane[data-layer="7"]>.outline'),selected:style('.plane.chosen>.outline'),label:style('.external-layer-number.active'),normalLabel:style('.external-layer-number:not(.active):not(.preview)'),op:style('.chosen .op'),opLabel:style('.chosen .op-label'),tensorLabel:style('.chosen .tensor-label'),tensor:style('.chosen .tensor-outline')};});
  assert.equal(themes[theme].label.fontSize,'18px');assert.equal(themes[theme].normalLabel.fontSize,'13px');assert.equal(themes[theme].label.fontFamily,'monospace');assert.equal(themes[theme].opLabel.fontSize,'15px');assert.equal(themes[theme].tensorLabel.fontSize,'13px');
  await p.screenshot({path:path.join(OUT,'selected-'+theme+'.png')});
 }
 assert.equal(themes.light.tensor.fill,'rgb(239, 239, 239)');assert.equal(themes.light.label.fill,'rgb(37, 37, 37)');assert.equal(themes.light.label.stroke,'rgb(246, 246, 246)');assert.equal(themes.light.op.fill,'rgb(213, 213, 213)');assert.equal(themes.light.opLabel.fill,'rgb(37, 37, 37)');assert.equal(themes.light.tensorLabel.fill,'rgb(37, 37, 37)');assert.equal(themes.light.ordinary.stroke,'rgb(255, 255, 255)');
 await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>TrainingComposition.selectLayer(20));assert.equal((await settled()).moving,false);
 const reference=await browser.newPage({viewport:{width:1440,height:900}});
 await reference.goto('file://'+path.join(ROOT,'layer_stack/pangu-layer-stack-standalone.html'));
 await reference.locator('#layer-list button[data-layer="6"]').click();await reference.waitForTimeout(600);
 const sourcePose=()=>reference.evaluate(()=>Object.fromEntries([5,6,9,10,11,20].map(l=>{const m=document.querySelector('#planes .plane[data-layer="'+l+'"]').transform.baseVal.consolidate().matrix;return [l,{x:m.e+l*20,y:m.f-l*6}]})));
 const referenceSelected=await sourcePose();for(const [l,p] of Object.entries(referenceSelected)){assert.ok(Math.abs(p.x-initial.positions[l].x)<.01);assert.ok(Math.abs(p.y-initial.positions[l].y)<.01);}
 const sourceTarget=await reference.locator('#planes .plane[data-layer="20"]').evaluate(g=>{const p=new DOMPoint(12,12).matrixTransform(g.getScreenCTM());return {x:p.x,y:p.y,hit:document.elementFromPoint(p.x,p.y)?.closest('.plane')?.dataset.layer}});
 await reference.mouse.move(sourceTarget.x,sourceTarget.y);await reference.waitForTimeout(650);
 const referenceHover=await sourcePose();assert.equal(sourceTarget.hit,'20');for(const [l,p] of Object.entries(referenceHover)){const d=Number(l)-20,fraction=(1-Math.tanh(d/.9))/2,lift=180*Math.exp(-.5*Math.pow(d/.55,2));assert.ok(Math.abs(p.x-(170+l*40-220*fraction))<.01,'actual source hover x '+l);assert.ok(Math.abs(p.y-(365-l*12+66*fraction-lift))<.01,'actual source hover y '+l);}
 await reference.mouse.move(2,2);await reference.waitForTimeout(650);assert.deepEqual(await sourcePose(),referenceSelected);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'checks.json'),JSON.stringify({sourceDockVerbatimWithHostPitch:true,referenceSelected,referenceHover,initial,mid,hover,restored,themes,errors},null,2));
 console.log('PASS real pointer hover, front/rear docking, intermediate frames, leave restore, source typography, dark/light palette, reduced motion');await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
