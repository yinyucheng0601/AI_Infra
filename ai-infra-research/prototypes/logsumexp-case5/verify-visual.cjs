// Headless SVG contract checks; not a browser layout test.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path'),crypto=require('node:crypto');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const html=read('index.html'),contract=JSON.parse(read('visual-contract.json'));
for(const [file,hash] of Object.entries(contract.assets))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../../..',file))).digest('hex'),hash,'Unreviewed glyph source');
let svg='';const ctx={window:{},esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;'),$:()=>({set innerHTML(v){svg=v}}),rect:(x,y,w,h,c,a='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${c}" ${a}/>`,tx:(x,y,t,c='',a='')=>`<text x="${x}" y="${y}" class="${c}" ${a}>${t}</text>`};
vm.createContext(ctx);
const start=html.indexOf('window.PtoOpIcons ='),end=html.indexOf('function toggleScope()',start);
assert.ok(start>0&&end>start);vm.runInContext(html.slice(start,end)+';renderScope();',ctx);
const tensors=[...svg.matchAll(/<g class="library-tensor">([\s\S]*?)<\/text><\/g><\/g>/g)];assert.equal(tensors.length,contract.objects.scopeTensor.count);
for(const [,body] of tensors){const box=body.match(/class="outline[^"]*" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);const text=body.match(/<text x="([\d.]+)" y="([\d.]+)"/);assert.ok(box&&text);assert.ok(+text[1]>+box[1]&&+text[1]<+box[1]+ +box[3]);assert.ok(+text[2]>+box[2]&&+text[2]<+box[2]+ +box[4]);assert.ok(body.includes('data-tile'));}
for(const [label,category] of Object.entries(contract.objects.scopeOperator.categories)){assert.ok(svg.includes(`data-category="${category}"`));assert.ok(svg.includes(label));}
assert.equal((svg.match(/class="library-op"/g)||[]).length,contract.objects.scopeOperator.count);assert.equal((svg.match(/r="22"/g)||[]).length,contract.objects.scopeOperator.count);assert.equal((svg.match(/scale\(1.25\)/g)||[]).length,contract.objects.scopeOperator.count);
assert.throws(()=>vm.runInContext("ScopeGlyphs.op('unknown',0,0,'bad')",ctx),/Unknown OP category/);
assert.ok(!html.includes('id="startGuide"'));assert.ok(html.includes('border-radius:999px'));
console.log('PASS: source locks, overlay tensors, category icons, unknown-category rejection, removed guide');
