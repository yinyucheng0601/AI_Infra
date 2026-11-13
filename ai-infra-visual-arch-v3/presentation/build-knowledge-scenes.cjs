const fs=require('fs'),vm=require('vm');const root='ai-infra-research/reports/llm-compute/',dest='ai-infra-visual-arch-v3/presentation/components/';
const DATA=JSON.parse(fs.readFileSync(root+'diagram-legend-library/index.html','utf8').match(/<script id="legendData" type="application\/json">([\s\S]*?)<\/script>/)[1]),t=fs.readFileSync(root+'diagram-legend-library/template.html','utf8');
const theme=vm.createContext({DATA,lightTheme:true,Uint8Array,TextDecoder,TextEncoder,atob,btoa});vm.runInContext(t.slice(t.indexOf('const rolePalette='),t.indexOf('const images=')),theme);
function load(file,cut){const h=fs.readFileSync(root+file,'utf8'),ss=[...h.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]),c=vm.createContext({document:{head:{insertAdjacentHTML(){}},getElementById(){return {}}},window:{}});if(file.startsWith('pass-')){vm.runInContext(ss[0],c);const main=ss.slice(1).join('\n');vm.runInContext(main.slice(0,main.indexOf("$('start').onclick")),c)}else vm.runInContext(ss[0].slice(0,ss[0].indexOf(cut)),c);return{run:x=>vm.runInContext(x,c),css:[...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n').replaceAll(':root','svg').replaceAll('.canvas svg','svg')}}
function pack(e,body,box){let defs='';try{defs=e.run('defs')}catch{try{defs=e.run('wrap("asset",400,160,"")').match(/<defs>[\s\S]*?<\/defs>/)[0]}catch{}}theme.svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+box+'"><style><![CDATA['+e.css+']]></style>'+defs+body+'</svg>';return 'data:image/svg+xml;base64,'+Buffer.from(vm.runInContext('themedSvg(svg)',theme)).toString('base64')}
const pass=load('pass-observability-guide/index.html'),c=load('pypto-compilation-guide/index.html','function draw()'),r=load('pypto-runtime-evidence-guide/index.html','let page=0');
const scenes={relations:{href:pack(c,c.run('diagram("relations")'),'0 0 800 540'),source:'pypto-compilation-guide/index.html#relations / diagram("relations")'},facets:[]};
for(const[i,title]of [[0,'包含与数据依赖'],[1,'一对多降级'],[9,'多对一融合'],[11,'验证与运行证据']])scenes.facets.push({title,href:pack(pass,pass.run('facetScene('+i+')'),'-8 -8 376 140'),source:'pass-observability-guide/index.html#objects / facetScene('+i+')'});
scenes.data={href:pack(pass,pass.run('vocabulary()'),'20 60 800 120'),source:'pass-observability-guide/index.html#vocabulary'};
fs.writeFileSync(dest+'knowledgeSourceScenes.json',JSON.stringify(scenes,null,2));
const a=JSON.parse(fs.readFileSync(dest+'knowledgeGlyphAssets.json'));
for(const label of ['Attention','Operator','MatMul','GELU','Collective']){const x=a[label],f=216/x.width;for(const k of ['width','height','imageWidth','imageHeight'])x[k]*=f}
for(const label of ['Kernel','Kernel A','Kernel B','Task']){const x=a[label],f=(label==='Task'?120:175.5)/x.width;for(const k of ['width','height','imageWidth','imageHeight'])x[k]*=f}
a.Event={href:pack(r,r.run('bar(5,5,200,"Event","wait")'),'0 0 210 54'),width:200,height:44,imageWidth:210,imageHeight:54,source:'pypto-runtime-evidence-guide/index.html / bar()'};
fs.writeFileSync(dest+'knowledgeGlyphAssets.json',JSON.stringify(a,null,2));

{

const fs=require('fs'),vm=require('vm');const root='ai-infra-research/reports/llm-compute/diagram-legend-library/',dir='ai-infra-visual-arch-v3/presentation/components/';
const DATA=JSON.parse(fs.readFileSync(root+'index.html','utf8').match(/<script id="legendData" type="application\/json">([\s\S]*?)<\/script>/)[1]),t=fs.readFileSync(root+'template.html','utf8'),ctx=vm.createContext({DATA,lightTheme:true,Uint8Array,TextDecoder,TextEncoder,atob,btoa});vm.runInContext(t.slice(t.indexOf('const rolePalette='),t.indexOf('const images=')),ctx);
const k=DATA.items.find(e=>e.id==='system-kernel').svg,assets=JSON.parse(fs.readFileSync(dir+'knowledgeGlyphAssets.json'));function href(svg){ctx.svg=svg;return 'data:image/svg+xml;base64,'+Buffer.from(vm.runInContext('themedSvg(svg)',ctx)).toString('base64')}
const head=k.slice(0,k.indexOf('</defs>')+7),group=k.match(/<g class="hit"[^>]*data-key="op"[\s\S]*?<\/g>/)[0];
assets.Operator={href:href((head+group+'</svg>').replace(/viewBox="[^"]+"/,'viewBox="65 80 190 56"')),width:182,height:48,imageWidth:190,imageHeight:56,source:'index.html#system-kernel / exact IR OP group, fx variant'};
assets.MatMul=assets.Operator;
assets.Kernel={href:href(k.replace(/viewBox="[^"]+"/,'viewBox="31 21 258 138"')),width:220,height:114.4,imageWidth:227.04,imageHeight:121.44,source:'index.html#system-kernel / complete projection + AIC + MatMul'};
fs.writeFileSync(dir+'knowledgeGlyphAssets.json',JSON.stringify(assets,null,2));
const scenes=JSON.parse(fs.readFileSync(dir+'knowledgeSourceScenes.json'));scenes.containment={href:href(k.replace(/viewBox="[^"]+"/,'viewBox="31 21 258 138"')),source:'diagram-legend-library/index.html#system-kernel; compiler kernel + op'};
fs.writeFileSync(dir+'knowledgeSourceScenes.json',JSON.stringify(scenes,null,2));

}
