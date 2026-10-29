// Execute the real gallery script for every Skill deep link without a source server.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog/assets.json'),'utf8'));
const code=fs.readFileSync(path.join(root,'web/gallery.js'),'utf8');
const built=fs.readFileSync(path.join(root,'skills.html'),'utf8');
const runtime=JSON.parse(built.match(/<script id="runtimeConfig" type="application\/json">([\s\S]*?)<\/script>/)[1]);
for(const asset of catalog.assets.filter(a=>a.type==='method'))test('Skill detail: '+asset.id,()=>{
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',hidden:false,dataset:{},classList:{add(){},toggle(){}},setAttribute(){},addEventListener(){}});return nodes.get(id)};
 node('catalogData').textContent=JSON.stringify(catalog);
 node('runtimeConfig').textContent=JSON.stringify({collection:'skills',mode:'standalone',skillReadmes:runtime.skillReadmes,skillTexts:{[asset.id]:fs.readFileSync(path.join(root,asset.content),'utf8')}});
 const C={escapeHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),parseState:()=>({asset:asset.id}),topics:[],projects:{},stateQuery:()=>'?asset='+asset.id};
 const context={window:{CatalogCore:C,addEventListener(){}},document:{getElementById:node,querySelector:()=>node('query'),documentElement:{dataset:{}},addEventListener(){},title:''},location:{protocol:'file:',search:'?asset='+asset.id},localStorage:{getItem:()=>null},history:{},fetch(){throw Error('Skill details must not need source service')}};
 vm.runInNewContext(code,context);
 assert.equal(context.document.title,asset.title+' · AI Infra Skill');
 assert.ok(node('detailView').innerHTML.includes('id="detailTitle"'));
 assert.ok(node('detailView').innerHTML.includes(C.escapeHtml(asset.title)));
 assert.ok(node('detailView').innerHTML.includes(C.escapeHtml(fs.readFileSync(path.join(root,asset.content),'utf8'))));
 assert.ok(runtime.skillReadmes[asset.id]);
 assert.ok(node('detailView').innerHTML.includes(runtime.skillReadmes[asset.id]));
 assert.ok(!node('detailView').innerHTML.includes('skill-start'));
 assert.notEqual(node('connectionStatus').textContent,'');
});
