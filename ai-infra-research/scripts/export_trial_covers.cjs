// Export application-generated SVG scenes with a DOM substitute, not browser screenshots.
const fs=require('fs'),vm=require('vm'),path=require('path');
const R=path.resolve(__dirname,'..');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
for(const [folder,id]of [['unpack-case3','unpack-case3-inspector'],['scale-investigation-trial','scale-broadcast-inspector'],['rsfa-performance-trial','rsfa-performance-comparison']]){
 const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{id,hidden:true,value:({metric:'avg_ms',reference:'baseline',mode:'all',threshold:'1'})[id]||'',textContent:'',innerHTML:'',style:{},dataset:{},attrs:{},children:[],clientWidth:1440,clientHeight:900,classList:{add(){},remove(){}},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]},addEventListener(){},append(x){this.children.push(x)},appendChild(x){this.children.push(x)},insertBefore(){},replaceChildren(){this.children=[]},querySelector(){return node('dummy')},querySelectorAll(){return[]},focus(){},getBoundingClientRect(){return{left:0,top:0,width:1440,height:900}}});return nodes.get(id)}
 const document={getElementById:node,createElementNS(ns,t){const e=node('generated-'+nodes.size);e.tag=t;return e},createElement(){return node('created')},querySelector(){return node('dummy')},querySelectorAll(){return[]},addEventListener(){},documentElement:{}};
 const ctx=vm.createContext({document,window:{addEventListener(){}},innerWidth:1440,innerHeight:900,console,setTimeout(){},navigator:{},URL,Blob,getComputedStyle(){return{getPropertyValue(){return'150ms'}}}});
 const dir=path.join(R,'prototypes',folder),html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 let body,w,h,css='';
 if(folder==='rsfa-performance-trial'){
  vm.runInContext(fs.readFileSync(path.join(dir,'model.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(dir,'app.js'),'utf8').split('for(const panel of')[0],ctx);
  function serialize(e){return '<'+e.tag+' '+Object.entries(e.attrs).map(([k,v])=>k+'="'+esc(v)+'"').join(' ')+'>'+esc(e.textContent)+e.children.map(serialize).join('')+'</'+e.tag+'>'}
  body=node('scene').children.map(serialize).join('');w=1240;h=vm.runInContext('view.height',ctx);css='text{fill:#ddd;font:13px monospace}.sub{fill:#aaa;font-size:11px}.bad{fill:#fd5644}.hit{fill:transparent}.hit.active{fill:#303030}';
 }else{
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
  for(const s of scripts.slice(0,-1))vm.runInContext(s,ctx);
  if(folder==='unpack-case3'){body=node('world').innerHTML;const b=vm.runInContext('bounds',ctx);w=b.w;h=b.h;css=[...html.matchAll(/\.scene [^{]+\{[^}]+\}/g)].map(x=>x[0]).join('\n')}
  else{body=node('scene').innerHTML;w=1280;h=900;}
 }
 if(!body||body.length<500)throw Error('Empty scene: '+folder);
 const out='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -10 '+(w+60)+' '+(h+30)+'" role="img" aria-label="'+id+'"><rect x="-30" y="-10" width="'+(w+60)+'" height="'+(h+30)+'" fill="#111"/><style>'+css+'</style><g class="scene">'+body+'</g></svg>';
 fs.writeFileSync(path.join(R,'web/media',id+'-cover.svg'),out);
 console.log('Exported '+id);
}
