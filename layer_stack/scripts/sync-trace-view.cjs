// Rebuild the offline Traceview embed from canonical shared Pattern sources.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),pattern=path.join(root,'ai-infra-research/patterns');
const files=['critical-path-swimlane/trace-data.js','sequence-navigation/navigation.js','critical-path-swimlane/selector.js','critical-path-swimlane/evidence-view.js'];
const css=['sequence-navigation/navigation.css','critical-path-swimlane/selector.css','critical-path-swimlane/evidence-view.css'];
let js='(function(){const previous=window.SWIMLANE_DATA;\n'+fs.readFileSync(path.join(pattern,files[0]),'utf8')+'\nwindow.INFERENCE_TRACE_DATA=window.SWIMLANE_DATA;window.SWIMLANE_DATA=previous;})();\n'+files.slice(1).map(f=>fs.readFileSync(path.join(pattern,f),'utf8')).join('\n');
const provenance=fs.readFileSync(path.join(pattern,'critical-path-swimlane/trace-provenance.json'),'utf8');
js+='\nwindow.INFERENCE_TRACE_DATA.run.provenanceFile=URL.createObjectURL(new Blob(['+JSON.stringify(provenance)+'],{type:"application/json"}));';
const styles=css.map(f=>fs.readFileSync(path.join(pattern,f),'utf8')).join('\n');
const target=path.join(root,'layer_stack/inference-layer-stack.html');let html=fs.readFileSync(target,'utf8');
const block='<!-- TRACEVIEW_SHARED_START --><style>'+styles+'</style><script>'+js.replace(/<\/script/gi,'<\\/script')+'</script><!-- TRACEVIEW_SHARED_END -->';
html=html.replace(/<!-- TRACEVIEW_SHARED_START -->[\s\S]*?<!-- TRACEVIEW_SHARED_END -->/,'');html=html.replace('</head>',block+'\n</head>');fs.writeFileSync(target,html);
fs.writeFileSync(path.join(root,'layer_stack/trace-view-sources.json'),JSON.stringify({files:[...files,...css,'critical-path-swimlane/trace-provenance.json'].map(file=>({file:'ai-infra-research/patterns/'+file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(pattern,file))).digest('hex')}))},null,2)+'\n');
console.log('Embedded canonical Traceview renderer and data');
