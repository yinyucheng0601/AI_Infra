const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8896/inference-layer-stack.html');
for(const model of ['deepseek','qwen']){
 await page.evaluate(model=>{pausePlayback();get('model-select').value=model;get('model-select').onchange();pausePlayback();selectRequest(2,7);selectedRank=model==='qwen'?1:7;
 if(model==='deepseek'){rankDetail=true;rankViewIndex=0;setRankPrimary(true,false);zoomRank(1.2);}
 else{setViewInstant(1);paExpanded=true;render();get('token-workspace').hidden=false;observationMode='tasks';render();}
 saveSceneState();},model);
 const before=await page.evaluate(()=>captureSceneState());
 await page.reload();await page.waitForFunction(()=>typeof restoringScene!=='undefined'&&!restoringScene);await page.waitForTimeout(150);
 const after=await page.evaluate(()=>captureSceneState());
 for(const key of ['model','layer','request','rank','rankPrimary','rankDetail','rankView','view','playing','panel','observationMode','paExpanded'])assert.deepEqual(after[key],before[key],model+': '+key);
 const camera=model==='deepseek'?'rank':'front';assert.equal(after.cameras[camera],before.cameras[camera],model+' camera');
 if(model==='deepseek'){assert.equal(await page.locator('#parallel-rank-scene [data-rank-content] path').evaluateAll(nodes=>nodes.every(n=>!n.getAttribute('d').includes('V'))),true);await page.screenshot({path:'/private/tmp/rank-restored-final.png'});}
 if(model==='qwen'){await page.evaluate(()=>closeArchitecture());assert.equal(await page.evaluate(()=>cameraTransition),false);assert.equal(await page.evaluate(()=>viewIndex),0);}
 console.log('PASS refresh restores '+model+' scene, camera, selection, progress and pause state');
}
assert.deepEqual(errors,[]);await browser.close();})().catch(e=>{console.error(e);process.exitCode=1;});
