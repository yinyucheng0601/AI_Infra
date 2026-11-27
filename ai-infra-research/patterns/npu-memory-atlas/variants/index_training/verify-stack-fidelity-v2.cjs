// HISTORICAL: _2-only geometry checks; superseded by docking verification.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../../../../..'),OUT=path.join(ROOT,'review-output/training-pattern-composition/stack-fidelity-2026-11-26');
const {chromium}=require(path.join(ROOT,'ai-infra-visual-arch-v3/presentation/node_modules/playwright'));
const source=fs.readFileSync(path.join(ROOT,'layer_stack/pangu-layer-stack_2.html'),'utf8'),generated=fs.readFileSync(path.join(__dirname,'stack-geometry-source.js'),'utf8');
// This prevents a new animation with similar-looking endpoints passing as reuse.
const position=source.slice(source.indexOf('function position(l,focus=focusPosition){'),source.indexOf('function paintGeometry(){'));
const motion=source.slice(source.indexOf('function animateGeometry(time){'),source.indexOf('function previewLayer(l){'));
assert.ok(generated.includes(position));assert.ok(generated.includes(motion));
let browser;const errors=[],evidence={sourceFunctionsVerbatim:true};
(async()=>{browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const pages={};
 for(const mode of ['reference','demo']){
  const p=await browser.newPage({viewport:{width:1440,height:900}});pages[mode]=p;p.on('pageerror',e=>errors.push(mode+': '+e.message));
  await p.goto(mode==='reference'?'file://'+path.join(ROOT,'layer_stack/pangu-layer-stack_2.html'):'http://127.0.0.1:8907/ai-infra-research/patterns/npu-memory-atlas/variants/index_training.html',{waitUntil:'domcontentloaded'});
  if(mode==='reference'){await p.locator('#layer-list button[data-layer="0"]').click();}else await p.evaluate(()=>{playing=false;TrainingComposition.setPrimary(true,false);TrainingComposition.selectLayer(0)});
  await p.waitForTimeout(600);
  // Use the real source button: source functions are scoped to its IIFE.
  if(mode==='reference')await p.locator('#layer-list button[data-layer="6"]').click();else await p.evaluate(()=>TrainingComposition.selectLayer(6));
  const samples=await p.evaluate(mode=>new Promise(resolve=>{const selector=(mode==='reference'?'#planes':'#training-stack')+' .plane[data-layer="6"]',samples=[];let frames=0;function capture(){const g=document.querySelector(selector),m=g.transform.baseVal.consolidate().matrix;samples.push({x:m.e,y:m.f,time:performance.now()});if(++frames<12)requestAnimationFrame(capture);else resolve(samples)};capture()}),mode);
  await p.waitForTimeout(600);
  const snapshot=await p.evaluate(mode=>{
   const container=document.querySelector(mode==='reference'?'#planes':'#training-stack>g'),svg=document.querySelector(mode==='reference'?'#scene':'#training-stack');
   // Source L18 carries its independent sample-data anomaly color; compare
   // neutral L0/L5/L7 and selected L6, rather than importing that dataset.
   const frames={};for(const l of [0,5,6,7]){const g=container.querySelector(`.plane[data-layer="${l}"]`),rect=g.querySelector(':scope>.outline'),s=getComputedStyle(rect),m=g.transform.baseVal.consolidate().matrix;frames[l]={x:m.e,y:m.f,fill:s.fill,stroke:s.stroke,strokeWidth:s.strokeWidth,vectorEffect:s.vectorEffect,width:rect.getAttribute('width'),height:rect.getAttribute('height')};}
   const selected=container.querySelector('.plane[data-layer="6"]');
   function hit(x,y){const pt=svg.createSVGPoint();pt.x=x;pt.y=y;const screen=pt.matrixTransform(selected.getScreenCTM()),node=document.elementFromPoint(screen.x,screen.y)?.closest('.plane[data-layer]');return node?Number(node.dataset.layer):null;}
   return {frames,order:[...container.children].filter(n=>n.classList.contains('plane')).map(n=>Number(n.dataset.layer)).filter(l=>l<48),visibleCap:hit(50,50),coveredLowerFace:hit(100,400)};
  },mode);
  assert.equal(snapshot.visibleCap,6,mode+' visible popped cap');assert.ok(snapshot.coveredLowerFace!==null&&snapshot.coveredLowerFace<6,mode+' foreground plane must cover popped lower face');
  assert.deepEqual(snapshot.order,Array.from({length:48},(_,i)=>47-i));
  assert.ok(samples.some(s=>s.y>83+.15&&s.y<293-.15),mode+' has real intermediate absorption frames');
  assert.ok(samples.every((s,i)=>!i||s.y<=samples[i-1].y+.01),mode+' settles monotonically without overshoot');
  assert.equal(snapshot.frames[6].y,83,mode+' exact snap target');
  evidence[mode]={...snapshot,motionSamples:samples};
  await p.mouse.move(10,10);await p.screenshot({path:path.join(OUT,mode+'-L6.png')});
 }
 assert.deepEqual(evidence.demo.frames,evidence.reference.frames,'poses, ordinary/selected frame fill/stroke/width/vector-effect must match the rendered reference');
 const demo=pages.demo;
 await demo.evaluate(()=>TrainingComposition.selectLayer(18));await demo.waitForFunction(()=>!TrainingComposition.geometry.moving);
 assert.deepEqual(await demo.evaluate(()=>[...document.querySelector('#training-stack>g').children].map(n=>+n.dataset.layer)),Array.from({length:48},(_,i)=>47-i));
 await demo.evaluate(()=>TrainingComposition.selectLayer(6));await demo.waitForFunction(()=>!TrainingComposition.geometry.moving);
 await demo.locator('#plus').click();
 const zoomed=await demo.locator('#training-stack .plane[data-layer="6"]>.outline').evaluate(n=>{const s=getComputedStyle(n);return {strokeWidth:s.strokeWidth,vectorEffect:s.vectorEffect}});
 assert.deepEqual(zoomed,{strokeWidth:'2px',vectorEffect:'non-scaling-stroke'});
 await demo.emulateMedia({reducedMotion:'reduce'});await demo.evaluate(()=>TrainingComposition.selectLayer(18));
 const reduced=await demo.evaluate(()=>TrainingComposition.geometry);assert.equal(reduced.moving,false);assert.equal(reduced.positions[18].y,365-18*12-210);
 assert.deepEqual(errors,[]);evidence.errors=errors;evidence.zoomedBorder=zoomed;evidence.reducedMotion={moving:reduced.moving,y:reduced.positions[18].y};
 fs.writeFileSync(path.join(OUT,'comparison.json'),JSON.stringify(evidence,null,2));console.log('PASS source functions, fixed painter order, real foreground occlusion, absorption intermediate frames, exact snap endpoints, matching plane borders, zoom and reduced motion');
 await browser.close();
})().catch(async e=>{console.error(e);fs.writeFileSync(path.join(OUT,'failure.json'),JSON.stringify({...evidence,errors,error:String(e.stack)},null,2));await browser?.close();process.exitCode=1});
