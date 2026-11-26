const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../../../../..'),OUT=path.join(ROOT,'review-output/training-pattern-composition/glass-final-2026-11-26');
const {chromium}=require(path.join(ROOT,'ai-infra-visual-arch-v3/presentation/node_modules/playwright'));
for(const name of ['liquid-glass.js','liquid-glass.css'])assert.equal(fs.readFileSync(path.join(__dirname,name),'utf8'),fs.readFileSync(path.join(ROOT,'ai-infra-research/patterns/liquid-glass-controls',name),'utf8'));
assert.ok(!fs.readFileSync(path.join(__dirname,'../index_training.html'),'utf8').includes('function syncGlass()'));
for(const token of ['--ui-blur','Readability tuning:','Shared glass chrome'])assert.ok(!fs.readFileSync(path.join(__dirname,'../index_training.html'),'utf8').includes(token),token+' must not return after rebuild');
fs.mkdirSync(OUT,{recursive:true});let browser;
(async()=>{
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8907/ai-infra-research/patterns/npu-memory-atlas/variants/index_training.html');await p.evaluate(()=>{playing=false;render()});
 await p.waitForFunction(()=>document.querySelector('.zoom-controls .liquid-b-shine'));
 const themes={};for(const theme of ['dark','light']){
  await p.evaluate(t=>{document.documentElement.dataset.theme=t;render();},theme);await p.waitForTimeout(250);
  themes[theme]=await p.evaluate(()=>{const zoom=document.querySelector('.zoom-controls'),style=getComputedStyle(zoom);return {settings:LiquidGlassControls.getSettings(),zoom:{filter:style.backdropFilter,border:style.borderWidth,fill:style.backgroundColor,shine:zoom.querySelectorAll('.liquid-b-shine').length},playback:['#ep-playback','#ep-playback .mb-process','#ep-playback .request-track','#ep-progress'].map(s=>{const n=document.querySelector(s),css=getComputedStyle(n);return {selector:s,filter:css.backdropFilter,background:css.backgroundColor,shadow:css.boxShadow,glass:n.hasAttribute('data-liquid-glass')}}),oldFilters:document.querySelectorAll('[id^="liquid-glass-"]').length,slabs:document.querySelectorAll('[id^="liquid-slab-"]').length};});
  const t=themes[theme];assert.equal(t.settings.blur,1);assert.equal(t.settings.shine,theme==='dark'?.8:2.2);for(const [k,v]of Object.entries({strength:100,bezel:36,power:28,depth:37,rim:95,rimWidth:2.75,ior:1.5}))assert.equal(t.settings[k],v);
  assert.ok(t.zoom.filter.includes('url(')&&t.zoom.filter.includes('blur(1px)'));assert.equal(t.zoom.border,'0px');assert.equal(t.zoom.shine,1);assert.ok(await p.locator('[data-liquid-glass=icon]').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).position!=='static')));assert.equal(t.oldFilters,0);
  for(const s of t.playback){assert.equal(s.filter,'none',s.selector);assert.equal(s.background,'rgba(0, 0, 0, 0)',s.selector);assert.equal(s.shadow,'none');assert.equal(s.glass,false);}
  await p.mouse.move(2,2);await p.screenshot({path:path.join(OUT,theme+'-full.png')});await p.locator('.zoom-controls').screenshot({path:path.join(OUT,theme+'-zoom.png')});
 }
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(200);assert.equal(await p.locator('#ep-playback').evaluate(n=>getComputedStyle(n).backdropFilter),'none');assert.equal(await p.locator('.zoom-controls .liquid-b-shine').count(),1);
 await p.locator('#graph-mode').click();assert.ok(await p.locator('#graph-query').isVisible());await p.keyboard.press('Escape');await p.evaluate(async()=>{for(let i=0;i<8;i++){TrainingComposition.setPrimary(true,false);TrainingComposition.setPrimary(false,false);await new Promise(requestAnimationFrame);}});await p.waitForTimeout(100);assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(OUT,'checks.json'),JSON.stringify({verbatimFinalPattern:true,themes,errors},null,2));console.log('PASS final v2 files/defaults, directional shine/filter, no legacy glass, fully transparent playback in both themes/resize, graph entry');await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
