// Runtime configuration contract; does not claim optical browser validation.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'liquid-glass.js'),'utf8');
function boot(saved=new Map()){
 const root={dataset:{theme:'light'}},window={addEventListener(){},removeEventListener(){},dispatchEvent(){}},queue=[];
 vm.runInNewContext(source,{window,document:{documentElement:root,readyState:'complete',querySelectorAll:()=>[]},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},MutationObserver:class{observe(){}disconnect(){}},requestAnimationFrame:f=>{queue.push(f);return queue.length},cancelAnimationFrame(){},Event:class{}});
 return {api:window.LiquidGlassControls,root,saved};
}
const {api,root,saved}=boot();
assert.equal(api.version,'2.0.0');
for(const [key,value] of Object.entries({strength:100,bezel:36,depth:37,blur:1,shine:2.2,power:28,rim:95,rimWidth:2.75,ior:1.5}))assert.equal(api.getSettings()[key],value,key);
root.dataset.theme='dark';assert.equal(api.getSettings().shine,.8);
api.configure({shine:1.1,blur:12});assert.equal(api.getSettings().shine,1.1);
root.dataset.theme='light';assert.equal(api.getSettings().shine,2.2);assert.equal(api.getSettings().blur,12);
api.configure({blur:100,depth:-1,shine:NaN});assert.equal(api.getSettings().blur,20);assert.equal(api.getSettings().depth,0);assert.equal(api.getSettings().shine,2.2);
const restored=boot(saved);assert.equal(restored.api.getSettings().blur,20);restored.root.dataset.theme='dark';assert.equal(restored.api.getSettings().shine,1.1);
api.disconnect();api.start();assert.equal(api.getSettings().blur,20);
console.log('PASS: v2 defaults, theme isolation, shared blur, bounds, persistence, restart');
