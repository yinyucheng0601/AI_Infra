const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(__dirname+'/graph-renderer.js','utf8'),ctx);
// Minimal DOM contract for deterministic reconciliation tests; browser rendering is separate.
class Element{
 constructor(name,attrs={},children=[]){this.nodeType=1;this.nodeName=name;this.attrs={...attrs};this.childNodes=[];this.ownerDocument={importNode:n=>n.clone()};for(const c of children)this.insertBefore(c,null);}
 get attributes(){return Object.entries(this.attrs).map(([name,value])=>({name,value}));}get id(){return this.attrs.id||'';}get firstChild(){return this.childNodes[0]||null;}get nextSibling(){const a=this.parentNode?.childNodes||[];return a[a.indexOf(this)+1]||null;}
 getAttribute(k){return this.attrs[k]??null;}hasAttribute(k){return k in this.attrs;}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}
 insertBefore(n,b){if(n===b)return;if(n.parentNode)n.parentNode.removeChild(n);const i=b?this.childNodes.indexOf(b):this.childNodes.length;if(i<0)throw Error('Invalid cursor');this.childNodes.splice(i,0,n);n.parentNode=this;}
 removeChild(n){this.childNodes.splice(this.childNodes.indexOf(n),1);n.parentNode=null;}
 clone(){return new Element(this.nodeName,this.attrs,this.childNodes.map(n=>n.clone()));}
 isEqualNode(n){return JSON.stringify(this.plain())===JSON.stringify(n.plain());}plain(){return [this.nodeName,this.attrs,this.childNodes.map(n=>n.plain())];}
}
const node=(id,fill)=>new Element('g',{'data-node':id},[new Element('rect',{fill})]);
const a=node('a','gray'),b=node('b','gray'),target=new Element('g',{},[a,b]);
const stats=()=>({reused:0,unchanged:0,updated:0,created:0,removed:0});
ctx.target=target;ctx.source=new Element('g',{},[node('b','white'),node('a','gray'),node('c','green')]);ctx.stats=stats();
vm.runInContext('patchGraphChildren(target,source,stats)',ctx);
assert.strictEqual(target.childNodes[0],b);assert.strictEqual(target.childNodes[1],a);assert.equal(b.firstChild.getAttribute('fill'),'white');assert.equal(target.childNodes.length,3);
const rect=a.firstChild;ctx.source=new Element('g',{},[node('a','gray')]);ctx.stats=stats();vm.runInContext('patchGraphChildren(target,source,stats)',ctx);assert.strictEqual(target.firstChild,a);assert.strictEqual(a.firstChild,rect);assert.equal(target.childNodes.length,1);
let queued=[],calls=0;ctx.callback=()=>calls++;ctx.request=f=>(queued.push(f),queued.length);ctx.cancel=()=>{queued=[];};const schedule=vm.runInContext('createFrameScheduler(callback,request,cancel)',ctx);schedule();schedule();schedule();assert.equal(queued.length,1);queued.shift()();assert.equal(calls,1);schedule();schedule.cancel();assert.equal(queued.length,0);
console.log('PASS: keyed reorder, nested attribute updates, unchanged DOM identity, stale removal, one callback per frame and cancellation');
