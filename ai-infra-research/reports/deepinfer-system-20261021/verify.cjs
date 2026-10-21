const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/deepinfer-system-20261021-r1.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const elements=new Map(),listeners={};
function el(id){if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',hidden:true,scrollTop:0,scrollLeft:0,clientWidth:600,offsetLeft:0,attrs:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;},getBoundingClientRect(){return{width:800,height:600}},querySelector(){return null},addEventListener(){},setPointerCapture(){}});return elements.get(id);}
const context={document:{getElementById:el,body:{classList:{toggle(){}}},addEventListener(k,v){listeners[k]=v}},window:{addEventListener(){}},console};
vm.createContext(context);vm.runInContext(script,context);
vm.runInContext(`
let visited=[];
for(let i=0;i<30;i++){visited.push([pageIndex,stateIndex]);stepReading(1);}
if(pageIndex!==PAGES.length-1)throw Error('right boundary');
if(!visited.some(([p,s])=>p===6&&s===1))throw Error('missing branch state');
for(let i=0;i<30;i++)stepReading(-1);
if(pageIndex!==0||stateIndex!==0)throw Error('left boundary');
for(let p=0;p<PAGES.length;p++){gotoPage(p);for(let i=0;i<PAGES[p].nodes.length;i++)selectNode(i);if(document.getElementById('scene').innerHTML.includes('NaN'))throw Error('invalid SVG');zoom(1.5);fit();}
gotoPage(6,1);stepReading(1);stepReading(-1);if(pageIndex!==6||stateIndex!==1)throw Error('previous page last state');
`,context);
const e={key:'ArrowRight',target:{closest:()=>true},preventDefault(){throw Error('form key intercepted')}};listeners.keydown(e);
assert(!/<script[^>]+src=|<link[^>]+stylesheet/i.test(html));
assert(!/教学模拟|教学纹理|仅作教学示意/.test(html));
const sources=JSON.parse(fs.readFileSync(__dirname+'/sources.json','utf8'));
assert(sources.files.length===24);
console.log('PASS: script syntax; all 12 chapters and node selections; both reading directions; branch boundaries; form keys; zoom/fit; offline dependencies; source inventory. Browser layout not tested.');
