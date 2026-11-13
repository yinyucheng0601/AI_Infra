// Logic regression only. DOM doubles do not validate optical rendering.
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const source=fs.readFileSync(path.join(__dirname,"liquid-glass.js"),"utf8");
let mutation,queue=[],nextId=1;const elements=[],calls=[];
function makeElement(preset){
 const attrs=new Map(),styles=new Map();if(preset)attrs.set("data-liquid-glass",preset);
 const element={visible:true,radius:24,style:{
  getPropertyValue:n=>styles.get(n)?.[0]||"",getPropertyPriority:n=>styles.get(n)?.[1]||"",
  setProperty(n,v,p=""){styles.set(n,[v,p])},removeProperty:n=>styles.delete(n)
 },getAttribute:n=>attrs.get(n)||null,setAttribute:(n,v)=>attrs.set(n,v),removeAttribute:n=>attrs.delete(n),
 getBoundingClientRect(){return {width:this.visible?240:0,height:this.visible?48:0}}};
 Object.defineProperty(element.style,"backdropFilter",{get(){return element.style.getPropertyValue("backdrop-filter")},set(v){element.style.setProperty("backdrop-filter",v)}});
 elements.push(element);return element;
}
const a=makeElement("control"),b=makeElement("panel"),c=makeElement("icon");b.visible=false;
a.style.setProperty("backdrop-filter","blur(2px)","important");a.style.setProperty("background","red");
const window={addEventListener(){},removeEventListener(){}};
const sandbox={window,navigator:{userAgent:"Firefox/130"},document:{readyState:"complete",documentElement:{},querySelectorAll(){return elements.filter(e=>e.getAttribute("data-liquid-glass"))},createElementNS(){return {}}},
 getComputedStyle:e=>({visibility:"visible",borderTopLeftRadius:String(e.radius)}),
 MutationObserver:class{constructor(fn){mutation=fn}observe(){}disconnect(){}},
 requestAnimationFrame(fn){queue.push(fn);return nextId++},cancelAnimationFrame(){queue=[]},calls};
// Record resolved options while exercising the real upstream fallback lifecycle.
const instrumented=source.replace("const presets=", "const originalCreate=createLiquidGlass;createLiquidGlass=(e,o)=>{calls.push(o);return originalCreate(e,o)};\nconst presets=");
vm.runInNewContext(instrumented,sandbox);
const api=window.LiquidGlassControls;
assert.equal(calls.length,2);assert.equal(calls[0].scale,-110);assert.equal(calls[0].displaceBlur,4);assert.equal(calls[1].scale,-36);
assert.equal(a.style.backdropFilter,"blur(12px)");
b.visible=true;mutation();queue.shift()();assert.equal(b.style.backdropFilter,"blur(18px)");assert.equal(calls.at(-1).scale,-12);
const before=calls.length;api.refresh();assert.equal(calls.length,before,"idempotent refresh");
a.visible=false;api.refresh();assert.equal(a.style.backdropFilter,"blur(2px)");assert.equal(a.style.getPropertyPriority("backdrop-filter"),"important");assert.equal(a.style.getPropertyValue("background"),"red");
a.visible=true;api.refresh();assert.equal(a.style.backdropFilter,"blur(12px)");
api.init(a,"panel");assert.equal(a.style.backdropFilter,"blur(18px)");assert.equal(calls.at(-1).scale,-12);
api.destroy(a);assert.equal(a.getAttribute("data-liquid-glass"),null);assert.equal(a.style.backdropFilter,"blur(2px)");
const dynamic=makeElement();api.init(dynamic);assert.equal(dynamic.style.backdropFilter,"blur(12px)");
elements.splice(elements.indexOf(dynamic),1);api.refresh();assert.equal(dynamic.style.backdropFilter,"");
assert.throws(()=>api.init(a,"unknown"),/Unknown/);
api.disconnect();assert.equal(b.style.backdropFilter,"");api.start();assert.equal(b.style.backdropFilter,"blur(18px)");
const count=calls.length;vm.runInNewContext(instrumented,sandbox);assert.equal(calls.length,count,"duplicate load ignored");
api.disconnect();console.log("PASS: exact presets, fallback, hidden/show, preset switch, dynamic removal, restoration, restart, duplicate load.");
