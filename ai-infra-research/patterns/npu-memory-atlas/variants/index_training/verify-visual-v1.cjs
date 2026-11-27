const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../../../../..'),OUT=path.join(ROOT,'review-output/training-pattern-composition/implementation');
const {chromium}=require(path.join(ROOT,'ai-infra-visual-arch-v3/presentation/node_modules/playwright'));
const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
const luminance=arr=>arr.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(rgb(a)),y=luminance(rgb(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto('http://127.0.0.1:8907/ai-infra-research/patterns/npu-memory-atlas/variants/index_training.html');
 await page.evaluate(()=>{playing=false;TrainingComposition.selectLayer(18);TrainingWorkbench.setGraph(true);render()});
 const contrastSamples=[];
 for(const theme of ['dark','light']){
  if(theme==='light')await page.locator('#theme-toggle').click();
  const v=await page.evaluate(()=>{const txt=document.querySelector('[data-cg-node=router] .op-label'),op=document.querySelector('[data-cg-node=router] .op'),ann=document.querySelector('.cg-annotation');return {annotation:getComputedStyle(ann).fill,background:getComputedStyle(document.getElementById('graph-query')).backgroundColor,op:getComputedStyle(op).fill,opText:getComputedStyle(txt).fill}});
  const a=contrast(v.annotation,v.background),b=contrast(v.opText,v.op);assert.ok(a>=4.5&&b>=4.5,JSON.stringify(v));contrastSamples.push({theme,...v,annotationRatio:a,opTextRatio:b});
 }
 await page.locator('#theme-toggle').click();
 await page.locator('#graph-mode').click();await page.evaluate(()=>TrainingComposition.setPrimary(true,false));
 await page.setViewportSize({width:390,height:844});await page.locator('#graph-mode').click();
 const text=await page.locator('[data-cg-node=router] .op-label').boundingBox();assert.ok(text.height>=12);
 await page.mouse.move(1,1);await page.screenshot({path:path.join(OUT,'graph-mobile.png')});
 await page.locator('#graph-fit').click();const afterFit=await page.locator('.training-compute').getAttribute('viewBox');assert.ok(Number(afterFit.split(' ')[2])>=1330);
 fs.writeFileSync(path.join(OUT,'visual-checks.json'),JSON.stringify({contrastSamples,mobileRouterText:text,mobileFitOverview:afterFit,note:'Contrast samples cover primary graph OP text and annotations, not a complete pixel-level audit.'},null,2));
 console.log(JSON.stringify({contrastSamples,mobileRouterTextHeight:text.height,overviewFit:true}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
