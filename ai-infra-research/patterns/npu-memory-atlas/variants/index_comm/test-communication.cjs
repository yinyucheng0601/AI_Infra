const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('./rank-model.js'),EP=require('./ep-model.js'),P=require('./physical-layout.js');
const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',attrs:{},writes:0,setAttribute(k,v){this.attrs[k]=String(v);},addEventListener(){},getBoundingClientRect(){return {left:0,top:0,width:1400,height:900};}});return nodes.get(id);}
let pathWrites=0;Object.defineProperty(node('flows'),'innerHTML',{get(){return this.markup||'';},set(v){this.markup=v;pathWrites++;}});
class Worker{postMessage(data){const e=EP.event({pp:0,edp:0,tp:0,layer:data.layer,config:{...EP.baseline,seq:32,tp:1,dp:data.config.ep}});this.onmessage({data:{flows:e.flows.map(f=>({...f,source:data.ids[f.source],target:data.ids[f.target]})),total:e.totalTokens,local:e.localTokens,incidents:[]}});}terminate(){}}
const ctx={RankAtlasModel:M,RankPhysicalLayout:P,EPTeachingModel:EP,URLSearchParams,URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob:class{},Worker,location:{hash:''},document:{getElementById:node,addEventListener(){}},requestAnimationFrame(){},console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/communication.js','utf8'),ctx);
assert.equal((node('deck').innerHTML.match(/class="physical-rank /g)||[]).length,16,'focus retains physical rows with both columns');
assert.equal((node('flows').innerHTML.match(/class="flow"/g)||[]).length,7);
assert(!/NaN|Infinity/.test(node('flows').innerHTML));
const writes=pathWrites;node('progress').value='300';node('progress').oninput();assert.equal(pathWrites,writes,'scrubbing within Dispatch does not rebuild SVG routes');
node('progress').value='850';node('progress').oninput();assert(pathWrites>writes);assert(node('flows').innerHTML.includes('到 R23'));
node('all').onclick();assert.equal((node('flows').innerHTML.match(/class="flow"/g)||[]).length,56);
node('fit').onclick();assert.equal((node('deck').innerHTML.match(/class="physical-rank /g)||[]).length,128);
node('focus').onclick();assert.equal((node('deck').innerHTML.match(/class="physical-rank /g)||[]).length,16);
console.log('PASS: physical cabinet focus, proportional routes, all-group filtering, Combine reversal and static SVG during scrubbing');
