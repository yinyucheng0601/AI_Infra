const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../../../../..'),OUT=path.join(ROOT,'review-output/training-pattern-composition/stack-journey-2026-11-26');
const {chromium}=require(path.join(ROOT,'ai-infra-visual-arch-v3/presentation/node_modules/playwright'));
fs.mkdirSync(OUT,{recursive:true});let browser;
(async()=>{
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8907/ai-infra-research/patterns/npu-memory-atlas/variants/index_training.html');
 await p.evaluate(()=>{playing=false;TrainingComposition.setPrimary(true,false);TrainingComposition.selectLayer(6)});
 const settle=async()=>{await p.waitForFunction(()=>!TrainingComposition.geometry.moving);return p.evaluate(()=>TrainingComposition.geometry);};
 const initial=await settle();
 const expected=(l,focus)=>{const d=l-focus,f=(1-Math.tanh(d/.9))/2,lift=180*Math.exp(-.5*Math.pow(d/.55,2));return {x:170+l*40-220*f,y:365-l*12+66*f-lift}};
 for(const l of [4,5,6,7,8])assert.deepEqual(initial.positions[l],expected(l,6));
 assert.ok(initial.positions[5].y<365-5*12+66,'selected front neighbour is lifted');assert.ok(initial.positions[7].y<365-7*12,'selected rear neighbour is lifted');
 const point=async layer=>p.locator(`#training-stack .plane[data-layer="${layer}"]`).evaluate(g=>{const q=new DOMPoint(12,12).matrixTransform(g.getScreenCTM());return {x:q.x,y:q.y}});
 // Real hover sweep. A stationary pointer must not retarget itself as layers move.
 const hoverStates=[];for(const layer of [10,11,12,13,14,13,12,11,10,9]){const q=await point(layer);await p.mouse.move(q.x,q.y);await p.waitForFunction(l=>TrainingComposition.geometry.hovered===l,layer);const h=await settle();for(const l of [layer-1,layer,layer+1])assert.deepEqual(h.positions[l],expected(l,layer));hoverStates.push(h);}
 await p.screenshot({path:path.join(OUT,'hover-neighbours.png')});await p.mouse.move(2,2);assert.deepEqual((await settle()).positions,initial.positions);
 const rails=await p.locator('#training-stack .ground-rail').evaluate(n=>({rows:[...n.querySelectorAll('[data-step-row]')].filter(n=>getComputedStyle(n).display!=='none').map(n=>n.querySelector('text').textContent),marks:n.querySelectorAll('.mb-mark').length,box:n.getBoundingClientRect().toJSON()}));
 assert.ok(rails.rows.includes('1 F'));assert.ok(rails.rows.includes('1 B'));assert.equal(rails.marks,48*18);
 // A real rail click seeks the shared clock and selected layer, without opening Front.
 await p.locator('.ground-rail [data-rail-row="1"][data-rail-layer="6"]').click();await settle();assert.equal(await p.evaluate(()=>TrainingClock.state(atlasConfig,simTime).phase),'backward');assert.equal(await p.evaluate(()=>TrainingComposition.layer),6);assert.equal(await p.locator('#graph-query').isVisible(),false);
 await p.mouse.move(2,2);await settle();const camera=await p.evaluate(()=>TrainingComposition.camera);
 const q=await point(6);await p.mouse.click(q.x,q.y);
 await p.waitForFunction(()=>document.getElementById('training-layer-turn'));
 const turn=await p.locator('#training-layer-turn>g').evaluate(g=>({transform:getComputedStyle(g).transform,running:g.getAnimations().some(a=>a.playState==='running')}));assert.ok(turn.running,'single click rotates a real layer clone');
 await p.waitForFunction(()=>document.body.classList.contains('training-front-view'));
 assert.equal(await p.locator('#stack-view-name').innerText(),'Front');assert.equal(await p.locator('#graph-query').isVisible(),true);
 const frontBox=await p.locator('#graph-query').boundingBox();assert.equal(frontBox.width,1440);assert.equal(frontBox.height,900);
 assert.ok(await p.locator('.training-full-source [data-cg-node]').count()>64);await p.screenshot({path:path.join(OUT,'single-click-front.png')});
 await p.keyboard.press('Escape');await settle();assert.equal(await p.locator('#graph-query').isVisible(),false);assert.equal(await p.locator('#stack-view-name').innerText(),'2.5D');assert.deepEqual(await p.evaluate(()=>TrainingComposition.camera),camera);
 await p.screenshot({path:path.join(OUT,'return-stack-fb.png')});
 await p.evaluate(()=>document.documentElement.dataset.theme='light');await p.screenshot({path:path.join(OUT,'light-stack-fb.png')});
 const light=await p.locator('.ground-rail .mb-axis-label').first().evaluate(n=>({fill:getComputedStyle(n).fill,font:getComputedStyle(n).fontSize}));assert.equal(light.fill,'rgb(98, 98, 98)');assert.equal(light.font,'18px');
 await p.emulateMedia({reducedMotion:'reduce'});await p.locator('#training-stack .plane[data-layer="6"]').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('#graph-query').isVisible(),true);assert.equal(await p.locator('#training-layer-turn').count(),0);await p.keyboard.press('Escape');
 await p.setViewportSize({width:390,height:844});await p.locator('#training-stack .plane[data-layer="6"]').focus();await p.keyboard.press('Enter');
 const narrow=await p.locator('#graph-query').boundingBox();assert.equal(narrow.width,390);assert.equal(narrow.height,844);
 for(const selector of ['#training-token','#graph-fit','[data-close-query]']){const box=await p.locator(selector).boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390,selector+' fits narrow Front');}
 await p.screenshot({path:path.join(OUT,'narrow-front.png')});await p.locator('#primary-swap').click();assert.equal(await p.locator('#graph-query').isVisible(),false);assert.equal(await p.evaluate(()=>TrainingComposition.primary),'rank');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'checks.json'),JSON.stringify({initial,hoverStates,rails,camera,turn,frontBox,light,errors},null,2));
 console.log('PASS selected neighbour dock, real hover sweep/leave, F/B rail seek, single-click rotation to full Front graph, Escape camera restore, light and reduced motion');await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
