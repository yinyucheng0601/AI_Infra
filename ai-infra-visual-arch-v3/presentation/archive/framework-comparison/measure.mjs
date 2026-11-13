import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const results=[];
try {
  for(const [name,url] of [['slidev','http://localhost:8851/1'],['reveal','http://127.0.0.1:8852/reveal.html']]) {
    for(let run=0;run<3;run++) {
      const context=await browser.newContext({viewport:{width:1440,height:810},reducedMotion:'no-preference'});
      const page=await context.newPage();const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
      await page.addInitScript(()=>{
        window.trialPerf={frames:[],longTasks:[]};let last;
        function tick(t){if(last)window.trialPerf.frames.push(t-last);last=t;requestAnimationFrame(tick)}requestAnimationFrame(tick);
        new PerformanceObserver(list=>window.trialPerf.longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});
      });
      await page.goto(url,{waitUntil:'load'});
      await page.locator('.trial-stage[data-ready="true"]').first().waitFor();
      const initial=await cdp.send('Performance.getMetrics');
      // Use host navigation rather than key events inside an iframe.
      let current=0;
      for(let cycle=0;cycle<1;cycle++)for(const slide of [0,1,2,1,0]) {
        if(name==='reveal')await page.evaluate(i=>window.trialDeck.slide(i),slide);
        else if(slide!==current) { await page.locator('body').click({position:{x:2,y:2}}); await page.keyboard.press(slide>current?'ArrowRight':'ArrowLeft'); }
        current=slide;
        const fixture=page.locator(name==='reveal'?'.reveal .slides > section.present .trial-stage[data-ready="true"]':`.slidev-page-${slide+1} .trial-stage[data-ready="true"]`).first();await fixture.waitFor();
        await page.waitForTimeout(700);
        const expected=['language','agent','system'][slide];
        if(await fixture.locator('.slide').getAttribute('id')!==expected)throw new Error('Navigation did not reach '+expected);
        await fixture.getByRole('button',{name:'下一步',exact:true}).click();
        await page.waitForTimeout(1200);
      }
      const final=await cdp.send('Performance.getMetrics');
      results.push({name,run,errors,initial,final,frames:page.frames().length,performance:await page.evaluate(()=>({navigation:performance.getEntriesByType('navigation').map(n=>n.toJSON()),...window.trialPerf}))});
      console.log(name,run,'completed');
      await mkdir('results',{recursive:true});await writeFile('results/raw.json',JSON.stringify({viewport:'1440x810',results},null,2));
      await context.close();
    }
  }
} finally {await browser.close()}
await mkdir('results',{recursive:true});
await writeFile('results/raw.json',JSON.stringify({viewport:'1440x810',results},null,2));
console.log('Saved raw measurements. Inspect errors and navigation methodology before comparing.');
