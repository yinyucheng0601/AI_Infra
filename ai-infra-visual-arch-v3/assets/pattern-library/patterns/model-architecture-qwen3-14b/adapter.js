/* Presentation adapter: canonical hierarchy/edges come exclusively from JSON. */
(function(global){
'use strict';
const H=64,W=360,GAP=64,PAD=40,HEAD=64;
function index(data){const map=new Map(),parents=new Map();function visit(n,p){map.set(n.id,n);parents.set(n.id,p);n.children.forEach(c=>visit(c,n.id));}data.roots.forEach(n=>visit(n,null));return {map,parents};}
function defaults(data,layer,level){const {map}=index(data),p=`qwen/layer/${layer}`,open=new Set(['qwen/backbone',p]);if(level!=='l0'){open.add(p+'/attn');open.add(p+'/mlp');}if(level==='l2'){function visit(n){if(n.children.length)open.add(n.id);n.children.forEach(visit);}visit(map.get(p));}return open;}
function project(data,state){
 const {map,parents}=index(data),graph={nodes:[],clusters:[],edges:[],metadata:{}},visible=new Map(),representative=new Map(),boxes=new Map();
 const descendants=(n,rep)=>{representative.set(n.id,rep);n.children.forEach(c=>descendants(c,rep));};
 const promoted=new Set();
 const label=n=>/^qwen\/layer\/\d+$/.test(n.id)?`Decoder Layer · L${state.layer}`:n.displayLabel||n.label;

 function leaf(n,parent){const parameter=n.stateType==='parameter',value=['state','input','output'].includes(n.kind);const external=data.edges.find(e=>e.target===n.id&&e.crossLayer&&e.semanticEdgeType==='state');const sourceLayer=external?.source.match(/qwen\/layer\/(\d+)/)?.[1];const raw=sourceLayer!==undefined?label(n).replace(/^Read /,`来自 L${sourceLayer} · `):label(n);const origin=raw.match(/^来自 (L\d+) · (.*)$/);const tensorName=origin?origin[2]:raw;const tensorDetail=[origin?'来自 '+origin[1]:(n.attrs.origin||''),n.attrs.shape||''].filter(Boolean).join(' · ');const shown=raw+(value&&n.attrs.shape?' · '+n.attrs.shape:'');const lineLength=Math.max(tensorName.length,tensorDetail.length);const w=/Residual Add/.test(shown)?H:parameter?Math.max(200,lineLength*8.1+40):Math.max(W,Math.min(600,(value?lineLength:shown.length)*8.1+(value?64:120)));const v={...n,label:shown,tensorName,tensorDetail,parent,x:0,y:32,width:w,height:H,hideTypeLabel:true,kind:parameter?'parameter':value?'tensor':n.kind,colorKey:value?'io:state':'sem:linear',collapsed:n.children.length>0,selectable:true};graph.nodes.push(v);visible.set(n.id,v);descendants(n,n.id);boxes.set(n.id,{width:w,height:H,flowX:w/2});return boxes.get(n.id);}
 function shift(id,dx,dy){const v=visible.get(id);v.x+=dx;v.y+=dy;if(graph.clusters.includes(v)){for(const c of [...v.nodes,...v.children])shift(c,dx,dy);}}
 function build(n,parent){if(!n.children.length||!state.open.has(n.id))return leaf(n,parent);
  let children=n.children.filter(c=>!promoted.has(c.id)),rows=n.layout?.rows;
  if(n.id==='qwen/backbone'){
   children=[map.get(`qwen/layer/${state.layer}`)];rows=children.map(c=>[c.id]);
   n={...n,label:'Decoder · 当前层 / 40'};
  }
  const built=children.map(c=>[c,build(c,n.id)]);const valid=new Set(children.map(c=>c.id));rows=(rows||children.map(c=>[c.id])).map(row=>row.filter(id=>valid.has(id))).filter(r=>r.length);
  const covered=new Set(rows.flat());children.filter(c=>!covered.has(c.id)).forEach(c=>rows.push([c.id]));
  const rowGap=n.id==='qwen/backbone'?180:GAP;
  const rowWidths=rows.map(row=>row.reduce((sum,id)=>sum+boxes.get(id).width,0)+(row.length-1)*rowGap);
  const branch=false;
  const left=Math.max(...rows.map(row=>boxes.get(row[0]).flowX));
  const right=Math.max(...rows.map((row,i)=>rowWidths[i]-boxes.get(row[0]).flowX));
  const width=branch?Math.max(440,...rowWidths)+2*PAD:Math.max(440,left+right)+2*PAD;
  const flowX=branch?width/2:PAD+left;let y=HEAD;
  for(let i=0;i<rows.length;i++){const row=rows[i];let x=branch?(width-rowWidths[i])/2:flowX-boxes.get(row[0]).flowX;const height=Math.max(...row.map(id=>boxes.get(id).height));for(const id of row){const b=boxes.get(id),v=visible.get(id);shift(id,x+(graph.nodes.includes(v)?b.width/2:0),y);x+=b.width+rowGap;}y+=height+GAP;}
  const c={...n,label:label(n),parent,x:0,y:0,width,height:y-GAP+PAD,nodes:children.filter(n=>graph.nodes.includes(visible.get(n.id))).map(n=>n.id),children:children.filter(n=>graph.clusters.includes(visible.get(n.id))).map(n=>n.id),collapsible:true,colorKey:'sem:linear',repeat:false};graph.clusters.push(c);visible.set(n.id,c);boxes.set(n.id,{width,height:c.height,flowX});return boxes.get(n.id);
 }

 const root=data.roots[state.scope==='pa'?1:state.scope==='runtime'?2:0];
 const place=(id,cx,top)=>{const b=boxes.get(id),v=visible.get(id);shift(id,cx-(graph.clusters.includes(v)?b.flowX:0),top);};
 if(state.scope==='pa'||state.scope==='runtime'){
   const orig=state.open;state.open=new Set([...orig,root.id]);build(root,null);state.open=orig;place(root.id,boxes.get(root.id).flowX+140,60);
 }else{
  root.children.forEach(n=>build(n,null));
  const bb=boxes.get('qwen/backbone'),axis=bb.flowX+180;
  let y=60;for(const id of ['qwen/tokens','qwen/embed','qwen/backbone','qwen/norm','qwen/head','qwen/logits']){place(id,axis,y);if(id==='qwen/embed'||id==='qwen/head')place(id+'_weight',axis+W/2+GAP+boxes.get(id+'_weight').width/2,y);y+=boxes.get(id).height+GAP;}
 }
 const seen=new Map();for(const original of data.edges){let e=original;
  if(state.scope==='layer'){
    if(e.source==='qwen/embed'&&e.target==='qwen/layer/0/x'&&state.layer!==0)continue;
    if(e.source==='qwen/layer/39/z'&&e.target==='qwen/norm'&&state.layer!==39)continue;
  }
  const a=representative.get(e.source),b=representative.get(e.target);if(!a||!b||a===b||!visible.has(a)||!visible.has(b))continue;
  const key=a+'>'+b;if(seen.has(key)){seen.get(key).canonicalIds.push(e.id);continue;}
  const item={...e,id:'official/'+e.id,source:a,target:b,canonicalIds:[e.id],sourceAnchor:'bottom',targetAnchor:'top',curve:'vertical',dashed:e.semanticEdgeType==='parameter'};seen.set(key,item);graph.edges.push(item);
 }
 const depth=id=>{let d=0,p=visible.get(id)?.parent;while(p){d++;p=visible.get(p)?.parent;}return d;};graph.clusters.sort((a,b)=>depth(a.id)-depth(b.id));
 const residual=graph.edges.filter(e=>e.semanticEdgeType==='residual'),all=graph.edges;
 graph.edges=all.filter(e=>!residual.includes(e));global.PtoArchitectureRouting.route(graph);graph.edges=all;
 for(const e of residual){const a=visible.get(e.source),b=visible.get(e.target),c=visible.get(e.residualScope),left=(c?.x??a.x-a.width/2)-64;e.sourceAnchor='left';e.targetAnchor='left';e.sourcePoint={x:a.x-a.width/2,y:a.y};e.targetPoint={x:b.x-b.width/2,y:b.y};e.waypoints=[{x:left,y:a.y},{x:left,y:b.y}];}
 graph.width=Math.max(...graph.nodes.map(n=>n.x+n.width/2),...graph.clusters.map(c=>c.x+c.width))+100;graph.height=Math.max(...graph.nodes.map(n=>n.y+n.height/2),...graph.clusters.map(c=>c.y+c.height))+80;graph.metadata.layer=state.layer;return graph;
}
global.PtoQwenAdapter={index,defaults,project};
})(typeof window!=='undefined'?window:globalThis);
