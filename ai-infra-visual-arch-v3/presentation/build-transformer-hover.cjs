const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const src='ai-infra-research/reports/llm-compute/transformer-layer-guide-v3.html',base='ai-infra-research/reports/llm-compute/diagram-legend-library/',dest='ai-infra-visual-arch-v3/presentation/public/knowledge-mindmap/';
const h=fs.readFileSync(src,'utf8'),js=h.match(/<script>([\s\S]*?)<\/script>/)[1],c=vm.createContext({document:{head:{insertAdjacentHTML(){}},getElementById(){return {}}},window:{}});
vm.runInContext(js.slice(0,js.indexOf('function render(')),c);
const DATA=JSON.parse(fs.readFileSync(base+'index.html','utf8').match(/<script id="legendData" type="application\/json">([\s\S]*?)<\/script>/)[1]),t=fs.readFileSync(base+'template.html','utf8'),theme=vm.createContext({DATA,lightTheme:true,Uint8Array,TextDecoder,TextEncoder,atob,btoa});
vm.runInContext(t.slice(t.indexOf('const rolePalette='),t.indexOf('const images=')),theme);
const css=[...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n').replaceAll(':root','svg');
function scene(i,title,box){let svg=vm.runInContext('diagram('+i+')',c).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ');svg=svg.replace('><defs>','><style><![CDATA['+css+']]></style><defs>');if(box)svg=svg.replace(/viewBox="[^"]+"/,'viewBox="'+box+'"');theme.svg=svg;svg=vm.runInContext('themedSvg(svg)',theme);return{id:'transformer-diagram-'+i,title,kind:'diagram',href:'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'),source:src+' / diagram('+i+')',sha256:crypto.createHash('sha256').update(h).digest('hex')}}
const file=dest+'legend-assets.js';let data=JSON.parse(fs.readFileSync(file,'utf8').replace(/^window.KnowledgeLegend=/,'').trim().replace(/;$/,''));
data['0:1']=[scene(5,'Layer · Attention / FFN 子层'),scene(0,'Model · Token 到模型输出')];
data['0:2']=[scene(2,'Attention · 计算结构'),scene(3,'FFN · 计算结构'),scene(5,'Layer · 两个子层')];
data['0:4']=[scene(7,'Loss · 梯度与参数更新')];
data['1:0']=[scene(0,'Token · Embedding · 模型计算')];
data['1:1']=[scene(1,'激活、参数与梯度')];
fs.writeFileSync(file,'window.KnowledgeLegend='+JSON.stringify(data)+';\n');
