// Run with PLAYWRIGHT_MODULE pointing at an installed Playwright package.
const assert=require("node:assert/strict"),fs=require("node:fs");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 const check=async(name,fn)=>{await fn();console.log("PASS: "+name);};
 try{
 await page.goto(process.env.DEMO_URL||"http://127.0.0.1:8896/inference-layer-stack.html");
 await page.evaluate(()=>pausePlayback());
 assert(await page.locator("#token-workspace").isHidden());
 assert.equal(await page.locator("#token-mode").getAttribute("aria-expanded"),"false");
 await page.locator("#token-mode").click();
 await page.selectOption("#model-select","deepseek");await page.evaluate(()=>pausePlayback());
 await check("Measured DS stages, request coverage and Prompt positions",async()=>{
  assert.deepEqual(await page.evaluate(()=>[requestSteps.length,dsProfile.requests.length,positions.prefill,get("token-grid").querySelectorAll("[data-position]").length]),[27,16,8191,8192]);
  await page.locator("#profile-token-sequence button").nth(15).click();
  assert(await page.evaluate(()=>requestSteps[requestIndex].profile.requestIds.includes(dsProfile.requests[dsRequest].id)&&dsRequest===15));
 });
 await check("Prompt selection changes SWA range without changing runtime step",async()=>{
  await page.locator('#token-grid [data-position="8100"]').click();
  assert.equal(await page.locator("#token-current").textContent(),"8100");assert.equal(await page.locator("#token-swa").textContent(),"7973–8100");
 });
 await check("Playback, pause and aggregate Decode boundary",async()=>{
  await page.evaluate(()=>{selectRequest(5,1);togglePlayback();});await page.waitForTimeout(240);await page.evaluate(()=>pausePlayback());
  assert(await page.evaluate(()=>selected>1&&phase==='decode'&&requestSteps[requestIndex].input===null));
 });
 await check("16 Worker cards, selection and camera-preserving return",async()=>{
  const before=await page.locator("#scene").getAttribute("viewBox");await page.locator(".rank-overview").click();await page.waitForTimeout(600);
  assert.equal(await page.locator('#parallel-rank-scene [data-rank-id]').count(),16);
  await page.locator('#parallel-rank-scene [data-rank-id="15"]').click();assert.equal(await page.evaluate(()=>selectedRank),15);
  await page.locator("#rank-return").click();await page.waitForTimeout(600);assert.equal(await page.locator("#scene").getAttribute("viewBox"),before);
 });
 await check("Front architecture, cache node linkage, close and resize",async()=>{
  await page.evaluate(()=>{choose(19);openArchitecture();});await page.waitForTimeout(900);
  await page.locator("#front-graph [data-node-id=compressed]").click();
  assert.equal(await page.evaluate(()=>cacheFocus),"compressed");assert.match(await page.locator("#token-compression-value").textContent(),/64/);
  await page.locator("#architecture-model").click();await page.waitForTimeout(800);
  await page.locator("#observation-resize").focus();await page.keyboard.press("ArrowUp");
  assert(Number(await page.locator("#observation-resize").getAttribute("aria-valuenow"))>240);
 });
 await check("Light mode and bottom panel width/vertical scrolling",async()=>{
  await page.locator("#theme-mode").click();
  assert.equal(await page.locator("html").getAttribute("data-theme"),"light");
  assert(await page.evaluate(()=>{const g=get('token-grid');return g.scrollWidth<=g.clientWidth+1&&g.scrollHeight>g.clientHeight&&getComputedStyle(g).scrollbarWidth==='none';}));
 });
 await page.screenshot({path:"/private/tmp/deepseek-accepted-light.png"});
 await check("Qwen Token/Task/Block and Task graph regression",async()=>{
  await page.selectOption("#model-select","qwen");await page.evaluate(()=>pausePlayback());
  for(const mode of ['tasks','blocks','tokens'])await page.locator(`[data-observe="${mode}"]`).click();
  assert.equal(await page.evaluate(()=>mappingView.rowNodes.length),16);
  await page.evaluate(()=>{openArchitecture();});await page.waitForTimeout(900);
  await page.evaluate(()=>enterExecutionTask(7));assert.equal(await page.evaluate(()=>executionSelection.task),7);
 });
 await check("Narrow viewport and DS model restoration",async()=>{
  await page.setViewportSize({width:800,height:900});await page.selectOption("#model-select","deepseek");await page.evaluate(()=>pausePlayback());
  assert.equal(await page.locator("#profile-token-sequence button").count(),16);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 });
 assert.deepEqual(errors,[]);console.log('PASS: no browser runtime errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
