/* Presentation adapter: canonical hierarchy/edges come exclusively from JSON. */
(function(global){
'use strict';
const H=64,W=360,GAP=64,PAD=40,HEAD=64;
function index(data){const map=new Map(),parents=new Map();function visit(n,p){map.set(n.id,n);parents.set(n.id,p);n.children.forEach(c=>visit(c,n.id));}data.roots.forEach(n=>visit(n,null));return {map,parents};}
function defaults(data,layer,level){const {map}=index(data),p=`v41/layer/${layer}`,open=new Set(['v41/vision','v41/backbone','view/encoder','view/decoder',p,p+'/attention',p+'/ffn']);if(level!=='l0'){open.add(p+'/attn');open.add(p+'/moe');}if(level==='l2'){function visit(n){if(n.children.length)open.add(n.id);n.children.forEach(visit);}visit(map.get(p));}return open;}
function project(data,state){
 const {map,parents}=index(data),graph={nodes:[],clusters:[],edges:[],metadata:{}},visible=new Map(),representative=new Map(),boxes=new Map();
 const descendants=(n,rep)=>{representative.set(n.id,rep);n.children.forEach(c=>descendants(c,rep));};
 const promoted=new Set();
 const label=n=>/^v41\/layer\/\d+$/.test(n.id)?`${Number(n.id.split('/').pop())<20?'Causal Encoder':'Decoder'} Layer · L${n.id.split('/').pop()}`:n.id.endsWith('/attn')?`Attention · ${n.attrs.compress_ratio?'CSA2 · r'+n.attrs.compress_ratio+' · '+(n.attrs.kv_source?'Full':n.attrs.index_source?'Reindex':'Reuse'):'SWA'}`:n.displayLabel || (n.repeatCount?`${n.label} · ×${n.repeatCount}`:n.label);
 function leaf(n,parent){const parameter=n.stateType==='parameter',value=['state','input','output'].includes(n.kind);const external=data.edges.find(e=>e.target===n.id&&e.crossLayer&&e.semanticEdgeType==='state');const sourceLayer=external?.source.match(/v41\/layer\/(\d+)/)?.[1];const raw=sourceLayer!==undefined?label(n).replace(/^Read /,`来自 L${sourceLayer} · `):label(n);const origin=raw.match(/^来自 (L\d+) · (.*)$/);const tensorName=origin?origin[2]:raw;const tensorDetail=[origin?'来自 '+origin[1]:'',n.attrs.shape||''].filter(Boolean).join(' · ');const shown=raw+(value&&n.attrs.shape?' · '+n.attrs.shape:'');const lineLength=Math.max(tensorName.length,tensorDetail.length);const w=/HC Post.*Residual Merge/.test(shown)?H:parameter?Math.max(200,lineLength*8.1+40):Math.max(W,Math.min(600,(value?lineLength:shown.length)*8.1+(value?64:120)));const v={...n,label:shown,tensorName,tensorDetail,parent,x:0,y:32,width:w,height:H,hideTypeLabel:true,kind:parameter?'parameter':value?'tensor':n.kind,colorKey:value?'io:state':'sem:linear',collapsed:n.children.length>0,selectable:true};graph.nodes.push(v);visible.set(n.id,v);descendants(n,n.id);boxes.set(n.id,{width:w,height:H,flowX:w/2});return boxes.get(n.id);}
 function shift(id,dx,dy){const v=visible.get(id);v.x+=dx;v.y+=dy;if(graph.clusters.includes(v)){for(const c of [...v.nodes,...v.children])shift(c,dx,dy);}}
 function build(n,parent){if(!n.children.length||!state.open.has(n.id))return leaf(n,parent);
  let children=n.children.filter(c=>!promoted.has(c.id)),rows=n.layout?.rows;
  if(n.id==='v41/backbone'){
   children=[map.get(`v41/layer/${state.layer}`)];rows=children.map(c=>[c.id]);
   n={...n,label:state.layer<20?'Causal Encoder':'Decoder'};
  }
  const built=children.map(c=>[c,build(c,n.id)]);const valid=new Set(children.map(c=>c.id));rows=(rows||children.map(c=>[c.id])).map(row=>row.filter(id=>valid.has(id))).filter(r=>r.length);
  const covered=new Set(rows.flat());children.filter(c=>!covered.has(c.id)).forEach(c=>rows.push([c.id]));
  const rowGap=n.id==='v41/backbone'?180:GAP;
  const rowWidths=rows.map(row=>row.reduce((sum,id)=>sum+boxes.get(id).width,0)+(row.length-1)*rowGap);
  const branch=/\/(attn|moe)$/.test(n.id);
  const left=Math.max(...rows.map(row=>boxes.get(row[0]).flowX));
  const right=Math.max(...rows.map((row,i)=>rowWidths[i]-boxes.get(row[0]).flowX));
  const width=branch?Math.max(440,...rowWidths)+2*PAD:Math.max(440,left+right)+2*PAD;
  const flowX=branch?width/2:PAD+left;let y=HEAD;
  for(let i=0;i<rows.length;i++){const row=rows[i];let x=branch?(width-rowWidths[i])/2:flowX-boxes.get(row[0]).flowX;const height=Math.max(...row.map(id=>boxes.get(id).height));for(const id of row){const b=boxes.get(id),v=visible.get(id);shift(id,x+(graph.nodes.includes(v)?b.width/2:0),y);x+=b.width+rowGap;}y+=height+GAP;}
  const c={...n,label:label(n),parent,x:0,y:0,width,height:y-GAP+PAD,nodes:children.filter(n=>graph.nodes.includes(visible.get(n.id))).map(n=>n.id),children:children.filter(n=>graph.clusters.includes(visible.get(n.id))).map(n=>n.id),collapsible:true,colorKey:'sem:linear',repeat:false};graph.clusters.push(c);visible.set(n.id,c);boxes.set(n.id,{width,height:c.height,flowX});return boxes.get(n.id);
 }
 const root=data.roots[0];
 root.children.forEach(n=>build(n,null));
 const place=(id,cx,top)=>{const b=boxes.get(id),v=visible.get(id);shift(id,cx-(graph.clusters.includes(v)?b.flowX:0),top);};
 const backbone=boxes.get('v41/backbone'),vision=boxes.get('v41/vision');
 const axis=vision.width+240+backbone.flowX,visionAxis=vision.flowX+80;
 place('v41/images',visionAxis,80);place('v41/vision',visionAxis,80+H+GAP);
 place('v41/tokens',axis,80);place('v41/embed',axis,80+H+GAP);
 place('v41/embed_weight',axis+W/2+GAP+boxes.get('v41/embed_weight').width/2,80+H+GAP);
 place('v41/hash',axis+W/2+GAP+boxes.get('v41/hash').width/2,80);
 place('v41/merge',axis,80+2*(H+GAP));place('v41/expand',axis,80+3*(H+GAP));
 place('v41/identity',axis+W/2+GAP+boxes.get('v41/identity').width/2,80+3*(H+GAP));
 let y=80+4*(H+GAP);place('v41/backbone',axis,y);y+=backbone.height+GAP;
 for(const id of ['v41/collapse','v41/norm','v41/head','v41/logits','v41/sample','v41/output']){place(id,axis,y);if(id==='v41/head')place('v41/head_weight',axis+W/2+GAP+boxes.get('v41/head_weight').width/2,y);y+=boxes.get(id).height+GAP;}
 const side=axis+backbone.width-backbone.flowX+160+boxes.get('v41/dspark').flowX;
 place('v41/main_hidden',side,80+4*(H+GAP));place('v41/dspark',side,80+5*(H+GAP));
 // Unselected layers have no visual representative. Resolve only their incoming
 // values as source-labelled references beside the selected layer.
 const references=new Map();
 for(const e of data.edges){if(representative.has(e.source)||!e.source.startsWith('v41/layer/')||!representative.has(e.target))continue;const src=map.get(e.source);if(!src)continue;const lid=e.source.match(/^v41\/layer\/(\d+)/)?.[1];const target=representative.get(e.target);if(!target.startsWith(`v41/layer/${state.layer}/`))continue;const id='view/reference/'+e.source;let ref=references.get(id);if(!ref){ref={...src,id,kind:'state',stateType:'input',children:[],displayLabel:`来自 L${lid} · ${src.label}`,attrs:{...src.attrs,source_node:src.id}};leaf(ref,null);references.set(id,ref);}representative.set(e.source,id);}
 let ry=80+4*(H+GAP)+HEAD;
 for(const [id] of references){place(id,visionAxis,Math.max(ry,80+H+GAP+vision.height+GAP));ry=Math.max(ry,80+H+GAP+vision.height+GAP)+H+GAP;}
 const directReferences=new Set(references.keys());
 const groups=new Map();
 for(const [id] of references){const canonical=id.slice('view/reference/'.length);const edge=data.edges.find(e=>e.source===canonical&&representative.get(e.target)?.startsWith(`v41/layer/${state.layer}/`));const target=visible.get(representative.get(edge.target));if(!groups.has(target.id))groups.set(target.id,[]);groups.get(target.id).push(visible.get(id));}
 const layerBox=visible.get(`v41/layer/${state.layer}`);
 let previousBottom=-Infinity;
 for(const [targetId,refs] of [...groups].sort((a,b)=>visible.get(a[0]).y-visible.get(b[0]).y)){
  const target=visible.get(targetId),step=H+24;
  const top=Math.max(target.y-(refs.length-1)*step/2,previousBottom+24+H/2);
  const right=Math.min(target.x-target.width/2-160,(layerBox?.x??target.x)-160);
  refs.forEach((ref,i)=>{ref.x=right-ref.width/2;ref.y=top+i*step;});
  previousBottom=top+(refs.length-1)*step+H/2;
 }
 if(directReferences.size){
  const laneRight=Math.min(...[...directReferences].map(id=>{const n=visible.get(id);return n.x-n.width/2;}))-GAP;
  for(const id of ['v41/vision','v41/images']){const n=visible.get(id);const right=graph.clusters.includes(n)?n.x+n.width:n.x+n.width/2;if(right>laneRight)shift(id,laneRight-right,0);}
 }
 // Expanded containers are not endpoints. Edges resolve through the nearest
 // folded ancestor, retaining the list of canonical edges represented.
 const seen=new Map();for(const e of data.edges){const a=representative.get(e.source),b=representative.get(e.target);if(!a||!b||a===b||!visible.has(a)||!visible.has(b))continue;const key=a+'>'+b;if(seen.has(key)){seen.get(key).canonicalIds.push(e.id);continue;}const edge={...e,id:'official/'+e.id,source:a,target:b,canonicalIds:[e.id],sourceAnchor:'bottom',targetAnchor:'top',curve:'vertical',dashed:e.semanticEdgeType==='parameter'};seen.set(key,edge);graph.edges.push(edge);}
 // Folded external cache producers are represented by labelled input values.
 const incoming=graph.edges.filter(e=>e.source.startsWith('view/range/')&&e.crossLayer&&e.semanticEdgeType==='state'&&visible.get(e.target)?.kind==='tensor');
 for(const e of incoming){const original=data.edges.find(c=>c.id===e.canonicalIds[0]);const layerId=original.source.match(/v41\/layer\/(\d+)/)?.[1];const target=visible.get(e.target);target.attrs={...target.attrs,external_source:original.source};}
 graph.metadata.externalReferences=incoming.map(e=>({source:e.source,target:e.target,canonicalIds:e.canonicalIds}));
 graph.edges=graph.edges.filter(e=>!incoming.includes(e));
 // Parent rectangles must be painted before child rectangles.
 const depth=id=>{let d=0,p=visible.get(id)?.parent;while(p){d++;p=visible.get(p)?.parent;}return d;};graph.clusters.sort((a,b)=>depth(a.id)-depth(b.id));
 const minX=Math.min(...graph.nodes.map(n=>n.x-n.width/2),...graph.clusters.map(c=>c.x))-140;
 graph.nodes.forEach(n=>n.x-=minX);graph.clusters.forEach(n=>n.x-=minX);
 const residuals=graph.edges.filter(e=>e.semanticEdgeType==='residual'&&e.residualScope&&visible.has(e.residualScope));
 const sideInputs=graph.edges.filter(e=>{
  if(!directReferences.has(e.source))return false;
  e.sideInput=true;
  const a=visible.get(e.source),b=visible.get(e.target),lane=(layerBox?.x??b.x-b.width/2)-112;
  const points=[{x:a.x+a.width/2,y:a.y},{x:lane,y:a.y},{x:lane,y:b.y},{x:b.x-b.width/2,y:b.y}];
  return !graph.nodes.some(n=>n.id!==a.id&&n.id!==b.id&&points.slice(1).some((q,i)=>{const p=points[i],l=n.x-n.width/2,r=n.x+n.width/2,t=n.y-n.height/2,bt=n.y+n.height/2;return p.x===q.x?p.x>l&&p.x<r&&Math.min(p.y,q.y)<bt&&Math.max(p.y,q.y)>t:p.y>t&&p.y<bt&&Math.min(p.x,q.x)<r&&Math.max(p.x,q.x)>l;}));
 });
 const normal=graph.edges.filter(e=>!residuals.includes(e)&&!sideInputs.includes(e));const all=graph.edges;graph.edges=normal;
 global.PtoArchitectureRouting.route(graph);graph.edges=all;
 for(const e of sideInputs){const a=visible.get(e.source),b=visible.get(e.target);e.sourceAnchor='right';e.targetAnchor='left';e.curve='horizontal';e.sourcePoint={x:a.x+a.width/2,y:a.y};e.targetPoint={x:b.x-b.width/2,y:b.y};const lane=(layerBox?.x??b.x-b.width/2)-112;e.waypoints=a.y===b.y?[]:[{x:lane,y:a.y},{x:lane,y:b.y}];}
 for(const e of residuals){const a=visible.get(e.source),b=visible.get(e.target);const scope=visible.get(e.residualScope),layer=visible.get(`v41/layer/${state.layer}`);const left=Math.min(scope.x,layer?.x??scope.x)-72;const start={x:a.x-a.width/2,y:a.y},end={x:b.x-b.width/2,y:b.y};e.sourcePoint=start;e.targetPoint=end;e.waypoints=[{x:left,y:start.y},{x:left,y:end.y}];e.residualLabel={x:left-18,y:(start.y+end.y)/2};}
 graph.width=Math.max(...graph.nodes.map(n=>n.x+n.width/2),...graph.clusters.map(c=>c.x+c.width))+120;graph.height=Math.max(...graph.nodes.map(n=>n.y+n.height/2),...graph.clusters.map(c=>c.y+c.height))+100;graph.metadata.layer=state.layer;
 return graph;
}
global.PtoV41Adapter={index,defaults,project};
})(typeof window!=='undefined'?window:globalThis);
