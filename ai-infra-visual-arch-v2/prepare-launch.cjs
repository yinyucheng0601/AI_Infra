// Prepare immutable source-derived media for the presentation only.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const out=__dirname,repo='/Users/yin/AI_Infra';
const read=p=>fs.readFileSync(path.join(repo,p),'utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
async function main(){
 const sourceFiles={
  'scale-model.js':'ai-infra-research/prototypes/scale-investigation-trial/model.js',
  'visual-system.js':'ai-infra-research/prototypes/scale-investigation-trial/visual-system.js'
 };
 const manifest=[];
 for(const [name,p] of Object.entries(sourceFiles)){const s=read(p);fs.writeFileSync(path.join(out,'assets',name),s);manifest.push({asset:name,source:p,sha256:hash(s),transform:'unchanged source'});}
 const dataPath='ai-infra-research/patterns/critical-path-swimlane/data.js';
 const ctx={window:{}};vm.runInNewContext(read(dataPath),ctx);
 const step=ctx.window.SWIMLANE_DATA.steps.find(s=>s.id==='D23');
 fs.writeFileSync(path.join(out,'assets','swimlane-d23.json'),JSON.stringify(step));
 manifest.push({asset:'swimlane-d23.json',source:dataPath,sha256:hash(read(dataPath)),transform:'exact D23 step extraction; presentation motion does not encode elapsed time'});
 const layerCtx={window:{},document:{createElementNS:()=>({innerHTML:''}),getElementById:()=>({prepend(){}})}};
 const front=read('layer_stack/layer-front.js');
 const matrix=front.slice(front.indexOf('function matrix('),front.indexOf('\nfunction tensor('));
 vm.runInNewContext(matrix+'\nwindow.LayerFront={glyphs:{matrix,colors:{activation:"#B1EF6B",weight:"#BCA0F3",gradient:"#79D4F2"}}};',layerCtx);
 vm.runInNewContext(read('layer_stack/layer-stack-face.js'),layerCtx);
 fs.mkdirSync(path.join(out,'assets','layer-faces'),{recursive:true});
 const css=read('layer_stack/layer-stack-face.css').replaceAll('#scene','svg');
 for(let l=0;l<49;l++){
  const body=layerCtx.window.LayerStackFace.render({layer:l,mode:'activation',ready:false,detailed:true,anomalySamples:[]});
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 400"><style>'+css+'</style><defs><marker id="stack-face-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="#777" stroke-width="1.3"/></marker></defs><g class="chosen">'+body+'</g></svg>';
  fs.writeFileSync(path.join(out,'assets','layer-faces',`layer-${l}.svg`),svg);
 }
 manifest.push({asset:'layer-faces/layer-0.svg … layer-48.svg',source:['layer_stack/layer-front.js','layer_stack/layer-stack-face.js'],sha256:[hash(front),hash(read('layer_stack/layer-stack-face.js'))],transform:'matrix() and LayerStackFace.render() reused unchanged; scoped source styling; no runtime values asserted'});
 const sampleCtx={window:{}};vm.runInNewContext(read('layer_stack/layer-data.js'),sampleCtx);
 const sample=await sampleCtx.window.LayerAtlasData.layerDataSource.queryTensor({layerCount:49,mode:'activation',scenario:'normal'});
 const d=sample.layers[18],values=Array.from({length:4096},(_,i)=>{const r=Math.floor(i/64),c=i%64;return d.stats[Math.floor(r/4)*16+Math.floor(c/4)].values[r%4*4+c%4];});
 fs.writeFileSync(path.join(out,'assets','layer18-sample.json'),JSON.stringify({layer:18,mode:'activation',rows:64,cols:64,values,rms:d.rms,limit:Math.max(...sample.limits),scope:'existing deterministic prototype sample, normal scenario'}));
 const selectedPath=path.join(out,'assets','layer-faces','layer-18.svg');
 const selected=fs.readFileSync(selectedPath,'utf8');
 const selectedBody=layerCtx.window.LayerStackFace.render({layer:18,mode:'activation',ready:true,rms:d.rms,detailed:true,anomalySamples:[]});
 fs.writeFileSync(selectedPath,selected.slice(0,selected.indexOf('<g class="chosen">'))+'<g class="chosen">'+selectedBody+'</g></svg>');
 manifest.push({asset:'layer18-sample.json',source:'layer_stack/layer-data.js',sha256:hash(read('layer_stack/layer-data.js')),transform:'exact L18 normal activation sample extraction; not measured training data'});
 const renderer={};vm.runInNewContext(read(sourceFiles['visual-system.js']),renderer);
 fs.writeFileSync(path.join(out,'assets','compute-pattern.svg'),renderer.VisualSystem.render('pattern-compute',{expanded:true}).replace('viewBox="0 0 900 350"','viewBox="0 0 900 265"'));
 fs.writeFileSync(path.join(out,'assets','launch-manifest.json'),JSON.stringify(manifest,null,2));
 console.log('Prepared D23, Scale model, 49 original-renderer layer faces, L18 sample. Speaker notes are maintained separately.');
}
main().catch(e=>{console.error(e);process.exit(1)});
