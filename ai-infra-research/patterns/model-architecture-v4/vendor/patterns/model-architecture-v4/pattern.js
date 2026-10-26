(function (global) {
  'use strict';
  const box = n => ({left:n.x-n.width/2,right:n.x+n.width/2,top:n.y-n.height/2,bottom:n.y+n.height/2});
  function arrange(graph, ids, fit) {
    const nodes = new Map(graph.nodes.map(n=>[n.id,n]));
    const clusters = new Map(graph.clusters.map(n=>[n.id,n]));
    for (const id of ids) {
      if (!clusters.has(id)) continue;
      const children = graph.nodes.filter(n=>n.parent===id);
      const flow = children.filter(n=>n.entityKind!=='LogicalState');
      const state = children.filter(n=>n.entityKind==='LogicalState');
      flow.forEach((n,i)=>Object.assign(n,{x:0,y:i*120,width:320,height:64}));
      state.forEach((n,i)=>Object.assign(n,{x:432,y:i*240,width:320,height:64}));
      // Persistent compressor state is adjacent to the compressor; the cache
      // sits next to the score that reads it, outside the activation chain.
      if (id==='csa_lightning_indexer') {
        const cache=nodes.get('csa_indexer_logical_cache'), scratch=nodes.get('csa_indexer_compressor_state');
        if (scratch) scratch.y=0;
        if (cache) cache.y=240;
      }
      fit(id);
    }
    function size(id) { const n=nodes.get(id); return n?{width:n.width,height:n.height}:clusters.get(id); }
    function move(id,cx,top) {
      const n=nodes.get(id), c=clusters.get(id);
      if(n) { n.x=cx;n.y=top+n.height/2;return; }
      const dx=cx-(c.x+c.width/2),dy=top-c.y;
      graph.nodes.filter(n=>n.parent===id).forEach(n=>{n.x+=dx;n.y+=dy;});
      c.x+=dx;c.y+=dy;
    }
    const [q,recent,compressed,indexer,attention,out]=ids;
    move(q,920,0);
    const row=size(q).height+72;
    move(indexer,920,row);
    move(recent,920-size(indexer).width/2-96-size(recent).width/2,row);
    move(compressed,920+size(indexer).width/2+96+size(compressed).width/2,row);
    const next=row+Math.max(...[recent,indexer,compressed].map(id=>size(id).height))+72;
    move(attention,920,next);
    move(out,920,next+size(attention).height+64);
  }

  // Orthogonal visibility-grid router. Each edge owns its ports and segments;
  // obstacles are actual node bounds plus clearance, not container rectangles.
  function route(graph, alignedPorts = true) {
    const nodes=new Map(graph.nodes.map(n=>[n.id,n]));
    const edges=graph.edges.filter(e=>e.id.startsWith('official/')&&nodes.has(e.source)&&nodes.has(e.target));
    const all=graph.nodes.filter(n=>n.role!=='residual-annotation');
    const groups=new Map(), requests=[];
    for(const e of edges) {
      const a=nodes.get(e.source),b=nodes.get(e.target);
      const horizontal=Math.abs(a.x-b.x)>100 && (a.parent===b.parent || Math.abs(a.y-b.y)<80);
      const sa=horizontal?(b.x>a.x?'right':'left'):(b.y>a.y?'bottom':'top');
      const ta=horizontal?(b.x>a.x?'left':'right'):(b.y>a.y?'top':'bottom');
      const r={e,a,b,sa,ta};requests.push(r);
      for(const [n,side,key] of [[a,sa,'start'],[b,ta,'end']]) {
        const id=n.id+':'+side;
        if(!groups.has(id))groups.set(id,[]);
        groups.get(id).push({r,n,side,key,other:key==='start'?b:a});
      }
    }
    const normal={left:[-1,0],right:[1,0],top:[0,-1],bottom:[0,1]};
    for(const entries of groups.values()) {
      entries.sort((a,b)=>(a.side==='top'||a.side==='bottom'?a.other.x-b.other.x:a.other.y-b.other.y)||a.r.e.id.localeCompare(b.r.e.id));
      const aligned=entries.filter(v=>v.n.parent===v.other.parent && (v.side==='top'||v.side==='bottom'?v.n.x===v.other.x:v.n.y===v.other.y));
      const offsets=new Map();
      aligned.forEach((v,i)=>offsets.set(v,(i-(aligned.length-1)/2)*18));
      entries.filter(v=>!offsets.has(v)).forEach((v,i)=>offsets.set(v,(i%2?1:-1)*(Math.floor(i/2)+1)*18));
      entries.forEach((v,i)=>{
        const horizontal=v.side==='left'||v.side==='right';
        const limit=(horizontal?v.n.height:v.n.width)/2-8;
        const offset=alignedPorts && aligned.length ? Math.max(-limit,Math.min(limit,offsets.get(v))) : (i-(entries.length-1)/2)*Math.min(18,(horizontal?v.n.height-20:v.n.width-40)/entries.length);
        const d=normal[v.side];
        const p={x:v.n.x+d[0]*v.n.width/2+(horizontal?0:offset),y:v.n.y+d[1]*v.n.height/2+(horizontal?offset:0)};
        v.r[v.key]=p;v.r[v.key+'Outer']={x:p.x+d[0]*24,y:p.y+d[1]*24};
      });
    }
    let xs=[],ys=[];
    for(const n of all) {const b=box(n);xs.push(b.left-24,b.right+24);ys.push(b.top-24,b.bottom+24);}
    for(const r of requests) for(const p of [r.startOuter,r.endOuter]){xs.push(p.x);ys.push(p.y);}
    xs.push(Math.min(...xs)-64,Math.max(...xs)+64);ys.push(Math.min(...ys)-64,Math.max(...ys)+64);
    xs=[...new Set(xs)].sort((a,b)=>a-b);ys=[...new Set(ys)].sort((a,b)=>a-b);
    const nx=xs.length,ny=ys.length,blocked=new Uint8Array(nx*ny),used=new Set();
    const obstacles=all.map(n=>box(n));
    for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)if(obstacles.some(b=>xs[x]>b.left-10&&xs[x]<b.right+10&&ys[y]>b.top-10&&ys[y]<b.bottom+10))blocked[y*nx+x]=1;
    const segment=(a,b)=>a<b?a+':'+b:b+':'+a;
    function search(start,end) {
      const startId=ys.indexOf(start.y)*nx+xs.indexOf(start.x),endId=ys.indexOf(end.y)*nx+xs.indexOf(end.x);
      const heap=[],dist=new Map(),prev=new Map();
      const push=v=>{heap.push(v);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=v.f)break;heap[i]=heap[p];i=p;}heap[i]=v;};
      const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;};
      const heuristic=id=>Math.abs(xs[id%nx]-end.x)+Math.abs(ys[Math.floor(id/nx)]-end.y);
      push({id:startId,dir:0,g:0,f:heuristic(startId)});dist.set(startId*3,0);
      while(heap.length) {
        const cur=pop(),key=cur.id*3+cur.dir;if(cur.g!==dist.get(key))continue;
        if(cur.id===endId){const ids=[];let k=key;while(k!==undefined){ids.push(Math.floor(k/3));k=prev.get(k);}return ids.reverse();}
        const x=cur.id%nx,y=Math.floor(cur.id/nx);
        for(const [xx,yy,dir] of [[x-1,y,1],[x+1,y,1],[x,y-1,2],[x,y+1,2]]) {
          if(xx<0||xx>=nx||yy<0||yy>=ny)continue;
          const id=yy*nx+xx;if(blocked[id]||used.has(segment(cur.id,id)))continue;
          // Grid coordinates include every inflated obstacle boundary.
          const mx=(xs[x]+xs[xx])/2,my=(ys[y]+ys[yy])/2;
          if(obstacles.some(b=>mx>b.left-10&&mx<b.right+10&&my>b.top-10&&my<b.bottom+10))continue;
          const g=cur.g+Math.abs(xs[x]-xs[xx])+Math.abs(ys[y]-ys[yy])+(cur.dir&&cur.dir!==dir?56:0);
          const k=id*3+dir;if(g>=(dist.get(k)??Infinity))continue;
          dist.set(k,g);prev.set(k,key);push({id,dir,g,f:g+heuristic(id)});
        }
      }
      return null;
    }
    // Short local dependencies first; long external dependencies use free lanes.
    requests.sort((a,b)=>(a.a.parent===a.b.parent?0:1)-(b.a.parent===b.b.parent?0:1)||
      (Math.abs(a.a.x-a.b.x)+Math.abs(a.a.y-a.b.y))-(Math.abs(b.a.x-b.b.x)+Math.abs(b.a.y-b.b.y)));
    const failures=[];
    for(const r of requests) {
      const path=search(r.startOuter,r.endOuter);
      if(!path){failures.push(r.e.id);continue;}
      path.slice(1).forEach((id,i)=>used.add(segment(path[i],id)));
      const pts=[r.start,...path.map(id=>({x:xs[id%nx],y:ys[Math.floor(id/nx)]})),r.end];
      const clean=pts.filter((p,i)=>!i||p.x!==pts[i-1].x||p.y!==pts[i-1].y);
      const turns=clean.filter((p,i)=>i===0||i===clean.length-1||!((clean[i-1].x===p.x&&p.x===clean[i+1].x)||(clean[i-1].y===p.y&&p.y===clean[i+1].y)));
      Object.assign(r.e,{sourcePoint:r.start,targetPoint:r.end,waypoints:turns.slice(1,-1)});
    }
    if (failures.length && alignedPorts) return route(graph,false);
    graph.metadata={...graph.metadata,routingFailures:failures};
  }
  global.PtoV4ReportLayout={arrange,route};
})(typeof window!=='undefined'?window:globalThis);

(function attachPtoCsaImplementationPattern(global) {
  'use strict';

  function queryRoot(input) {
    return typeof input === 'string' ? document.querySelector(input) : input;
  }

  const registry = global.PtoCsaMappingRegistry;

  function mappingFor(id) {
    const item = registry?.getNode(id);
    return [item?.mappingType || null, item?.reason || '暂无映射证据'];
  }

  function implementationColor(id, fallback) {
    const scopes = { q_projection: 'csa_query_projection', kv_projection: 'csa_recent_window_kv',
      main_compressor: 'csa_compressed_kv_path', indexer_compressor: 'csa_lightning_indexer',
      lightning_indexer: 'csa_lightning_indexer', exact_topk: 'csa_lightning_indexer',
      sparse_attention: 'csa_sparse_shared_kv_attention', grouped_output_projection: 'csa_grouped_output_projection' };
    if (scopes[id]) return SEMANTIC_COLOR[scopes[id]];
    const sources = registry.relationsFor(id).flatMap(r => r.sourceIds).map(key => registry.getNode(key))
      .filter(item => item?.level === 'L2');
    const colors = [...new Set(sources.map(leafColor))];
    return colors.length === 1 ? colors[0] : fallback;
  }

  function shell() {
    return `<div class="pto-dv4-architecture__workspace">
      <div class="pto-dv4-architecture__viewport" tabindex="0" aria-label="可缩放拖动的 CSA 分布式算子实现图">
        <div class="pto-dv4-architecture__canvas"></div>
        <div class="pto-dv4-architecture__viewport-actions" data-dv4-overlay>
          <button class="pto-dv4-architecture__button" type="button" data-dv4-fit>适配</button>
        </div>
      </div>
    </div>`;
  }

  const SEMANTIC_COLOR = Object.freeze({
    csa_query_projection: 'sem:linear',
    csa_recent_window_kv: 'sem:attention',
    csa_compressed_kv_path: 'sem:attention',
    csa_lightning_indexer: 'sem:gate',
    csa_sparse_shared_kv_attention: 'sem:attention',
    csa_grouped_output_projection: 'sem:linear'
  });

  function leafColor(item) {
    if (item.entityKind !== 'Op') return 'io:state';
    if (/normalization/i.test(item.label)) return 'sem:norm';
    if (/RoPE/i.test(item.label)) return 'sem:rope';
    if (/Top-K|score|positions/i.test(item.label)) return 'sem:gate';
    return SEMANTIC_COLOR[item.parentId] || 'sem:attention';
  }

  function buildCollapsedSemanticGraph() {
    const canonical = registry.canonicalGraph;
    const projection = canonical.l1Projection;
    const frame = { x: 24, y: 100 };
    const nodeAt = point => ({ x: frame.x + point.x, y: frame.y + point.y });
    const nodes = canonical.compoundIds.map(compoundId => {
      const item = registry.getNode(compoundId);
      const presentation = projection.nodes[compoundId];
      return {
        id: item.id,
        label: item.label,
        kind: 'module',
        hideTypeLabel: true,
        colorKey: presentation.colorKey,
        width: presentation.width,
        height: presentation.height,
        ...nodeAt(presentation),
        parent: canonical.scopeId,
        selectable: true,
        collapsed: true,
        sourceRefs: item.sourceRefs
      };
    });
    nodes.push(
      {
        id: canonical.inputId,
        label: 'RMSNorm hidden state',
        kind: 'tensor',
        typeLabel: 'Upstream context',
        colorKey: 'io:input',
        width: 230,
        height: 44,
        ...nodeAt(projection.inputAnchor),
        selectable: false,
        hideTypeLabel: true
      },
      {
        id: canonical.outputId,
        label: 'CSA semantic output',
        kind: 'tensor',
        typeLabel: 'Downstream context',
        colorKey: 'io:output',
        width: 230,
        height: 44,
        ...nodeAt(projection.outputAnchor),
        selectable: false,
        hideTypeLabel: true
      }
    );
    return {
      width: projection.width + frame.x * 2,
      height: frame.y + Math.max(projection.height, projection.outputAnchor.y + 22) + 24,
      title: 'CSA canonical L1 semantics',
      metadata: {
        graphRole: 'canonical_hierarchical_semantics',
        distributedRuntime: false,
        expandedCompoundIds: [],
        projection: 'canonical_l1'
      },
      nodes,
      clusters: [{
        id: canonical.scopeId,
        label: projection.label,
        x: frame.x,
        y: frame.y,
        width: projection.width,
        height: projection.height,
        parent: null,
        nodes: [...canonical.compoundIds],
        children: [],
        colorKey: 'sem:attention',
        selectable: false,
        collapsible: false
      }],
      edges: canonical.summaryEdges.map(edge => ({
        ...edge,
        semanticEdgeTypes: [...new Set(canonical.expandedEdges.filter(e =>
          (registry.compoundFor(e.source)?.id || e.source) === edge.source &&
          (registry.compoundFor(e.target)?.id || e.target) === edge.target
        ).map(e => e.semanticEdgeType))],
        sourceAnchor: 'bottom',
        targetAnchor: 'top',
        curve: 'vertical',
        tensor: edge.label ? { name: edge.label } : undefined
      }))
    };
  }

  function buildSemanticGraph(expandedCompoundIds = new Set()) {
    const canonical = registry.canonicalGraph;
    const projection = canonical.l1Projection;
    const expanded = new Set([...expandedCompoundIds].filter(id => canonical.compoundIds.includes(id)));
    if (expanded.size === 0) return buildCollapsedSemanticGraph();
    const frame = { x: 24, y: 100 };
    const baseHeight = 56;
    const childHeight = 64;
    const childGap = 16;
    const clusterHeader = 58;
    const clusterBottom = 18;
    const expandedHeight = compoundId => {
      if (!expanded.has(compoundId)) return baseHeight;
      const childCount = registry.getNode(compoundId).children.length;
      return clusterHeader + childCount * childHeight + Math.max(0, childCount - 1) * childGap + clusterBottom;
    };
    const expansionDelta = compoundId => expanded.has(compoundId)
      ? Math.max(0, expandedHeight(compoundId) - baseHeight + 20)
      : 0;
    const queryDelta = expansionDelta('csa_query_projection');
    const branchDelta = Math.max(
      expansionDelta('csa_recent_window_kv'),
      expansionDelta('csa_compressed_kv_path')
    );
    const indexerDelta = expansionDelta('csa_lightning_indexer');
    const attentionDelta = expansionDelta('csa_sparse_shared_kv_attention');
    const outputDelta = expansionDelta('csa_grouped_output_projection');
    const yOffsets = {
      csa_query_projection: 0,
      csa_recent_window_kv: queryDelta,
      csa_compressed_kv_path: queryDelta,
      csa_lightning_indexer: queryDelta + branchDelta,
      csa_sparse_shared_kv_attention: queryDelta + branchDelta + indexerDelta,
      csa_grouped_output_projection: queryDelta + branchDelta + indexerDelta + attentionDelta
    };
    const nodeAt = (point, yOffset = 0) => ({ x: frame.x + point.x, y: frame.y + point.y + yOffset });
    const nodes = [];
    const clusters = [];

    canonical.compoundIds.forEach(compoundId => {
      const item = registry.getNode(compoundId);
      const presentation = projection.nodes[compoundId];
      const yOffset = yOffsets[compoundId];
      if (!expanded.has(compoundId)) {
        nodes.push({
          id: item.id, label: item.label, kind: 'module', hideTypeLabel: true,
          colorKey: presentation.colorKey, width: presentation.width, height: presentation.height,
          ...nodeAt(presentation, yOffset), parent: canonical.scopeId, selectable: true, collapsed: true,
          sourceRefs: item.sourceRefs
        });
        return;
      }
      const clusterX = frame.x + presentation.x - presentation.width / 2;
      const clusterY = frame.y + presentation.y + yOffset - baseHeight / 2;
      const clusterHeight = expandedHeight(compoundId);
      clusters.push({
        id: item.id, label: item.label, x: clusterX, y: clusterY,
        width: presentation.width, height: clusterHeight,
        parent: canonical.scopeId, nodes: item.children, children: [], colorKey: presentation.colorKey,
        selectable: true, collapsible: true, sourceRefs: item.sourceRefs
      });
      item.children.forEach((childId, index) => {
        const child = registry.getNode(childId);
        nodes.push({
          id: child.id, label: child.label, kind: child.entityKind === 'Op' ? 'op' : 'tensor', hideTypeLabel: true,
          entityKind: child.entityKind,
          colorKey: leafColor(child), width: presentation.width - 20, height: childHeight,
          x: frame.x + presentation.x,
          y: clusterY + clusterHeader + childHeight / 2 + index * (childHeight + childGap),
          parent: item.id, selectable: true,
          sourceRefs: child.sourceRefs
        });
      });
    });

    const totalDelta = queryDelta + branchDelta + indexerDelta + attentionDelta + outputDelta;
    nodes.push(
      {
        id: canonical.inputId, label: 'RMSNorm hidden state', kind: 'tensor', typeLabel: 'Upstream context',
        colorKey: 'io:input', width: 230, height: 44, ...nodeAt(projection.inputAnchor),
        selectable: false, hideTypeLabel: true
      },
      {
        id: canonical.outputId, label: 'CSA semantic output', kind: 'tensor', typeLabel: 'Downstream context',
        colorKey: 'io:output', width: 230, height: 44, ...nodeAt(projection.outputAnchor, totalDelta),
        selectable: false, hideTypeLabel: true
      }
    );

    const parentFor = id => registry.compoundFor(id)?.id || null;
    const visibleEndpoint = id => {
      const parentId = parentFor(id);
      return parentId && !expanded.has(parentId) ? parentId : id;
    };
    const edgeGroups = new Map();
    canonical.expandedEdges.forEach(edge => {
      const source = visibleEndpoint(edge.source);
      const target = visibleEndpoint(edge.target);
      if (source === target) return;
      const key = `${source}::${target}`;
      const group = edgeGroups.get(key) || { source, target, count: 0, semanticEdgeType: edge.semanticEdgeType, semanticEdgeTypes: [] };
      group.count += 1;
      if (!group.semanticEdgeTypes.includes(edge.semanticEdgeType)) group.semanticEdgeTypes.push(edge.semanticEdgeType);
      edgeGroups.set(key, group);
    });
    const edges = [...edgeGroups.values()].map((edge, index) => ({
      id: `csa_projected_edge_${index}`,
      source: edge.source,
      target: edge.target,
      sourceAnchor: 'bottom',
      targetAnchor: 'top',
      curve: 'vertical',
      semanticEdgeType: edge.semanticEdgeType,
      semanticEdgeTypes: edge.semanticEdgeTypes,
      tensor: edge.count > 1 ? { name: `${edge.count} semantic paths` } : undefined
    }));
    clusters.unshift({
      id: canonical.scopeId, label: projection.label,
      x: frame.x, y: frame.y, width: projection.width, height: projection.height + totalDelta, parent: null,
      nodes: canonical.compoundIds.filter(id => !expanded.has(id)),
      children: canonical.compoundIds.filter(id => expanded.has(id)), colorKey: 'sem:attention',
      selectable: false, collapsible: false
    });
    return {
      width: projection.width + frame.x * 2,
      height: frame.y + Math.max(projection.height + totalDelta, projection.outputAnchor.y + totalDelta + 22) + 24,
      title: 'CSA canonical hierarchical semantics',
      metadata: {
        graphRole: 'canonical_hierarchical_semantics',
        distributedRuntime: false,
        expandedCompoundIds: [...expanded]
      },
      nodes,
      clusters,
      edges
    };
  }

  // One architecture carrier: graft the canonical CSA projection into the
  // existing whole-model hierarchy, then apply its original folding policy.
  // Only geometry is derived here; all CSA dependencies come from the registry.
  function attachTrainingRuntime(graph, runtimeGraph) {
    if (!runtimeGraph?.nodes?.length) return graph;
    const result = structuredClone(graph);
    const loss = result.nodes.find(node => node.id === 'dv4/model/loss');
    if (!loss) return result;
    const frame = { x: 1160, y: Math.max(80, loss.y - 90), width: 620, height: 280 };
    const slots = [
      { x: frame.x + 150, y: frame.y + 72 },
      { x: frame.x + 450, y: frame.y + 72 },
      { x: frame.x + 450, y: frame.y + 192 },
      { x: frame.x + 150, y: frame.y + 192 }
    ];
    const colors = { collective: 'sem:comm', 'gradient-transform': 'sem:gate', optimizer: 'sem:linear', 'parameter-materialization': 'sem:comm' };
    const typeLabels = { collective: 'Collective', 'gradient-transform': 'Gradient transform', optimizer: 'Parameter update', 'parameter-materialization': 'Parameter collective' };
    result.clusters.push({
      id: runtimeGraph.id, label: runtimeGraph.label, kind: 'module', typeLabel: 'Runtime auxiliary', colorKey: 'module:decoder',
      ...frame, parent: '', nodes: runtimeGraph.nodes.map(node => node.id), children: [], structuralRoot: false,
      selectable: true, collapsible: false, origin: 'runtime', dataState: 'simulated'
    });
    runtimeGraph.nodes.forEach((node, index) => {
      const slot = slots[index] || { x: frame.x + frame.width / 2, y: frame.y + 72 + index * 72 };
      result.nodes.push({ ...node, ...slot, parent: runtimeGraph.id, width: 260, height: 56, kind: 'op', typeLabel: typeLabels[node.kind] || 'Runtime activity',
        colorKey: colors[node.kind] || 'sem:linear', selectable: true, origin: 'runtime', dataState: node.fidelity || 'simulated', entityKind: 'RuntimeActivity',
        attrs: { scope: node.scope, sourceCategories: node.sourceCategories.join(', '), parameterGroups: node.parameterGroupIds.length, optimizerStateGroups: node.optimizerStateGroupIds.length } });
    });
    const positions = new Map(result.nodes.map(node => [node.id, node]));
    runtimeGraph.edges.forEach(edge => {
      const source = positions.get(edge.source), target = positions.get(edge.target);
      if (!source || !target) return;
      const horizontal = Math.abs(target.x - source.x) >= Math.abs(target.y - source.y);
      const forward = target.x >= source.x;
      result.edges.push({ ...edge, id: `training/${edge.id}`, colorKey: edge.semanticEdgeType === 'gradient' ? 'sem:gate' : 'sem:comm',
        sourceAnchor: horizontal ? (forward ? 'right' : 'left') : 'bottom', targetAnchor: horizontal ? (forward ? 'left' : 'right') : 'top',
        curve: horizontal ? 'horizontal' : 'vertical', tensor: { name: edge.semanticEdgeType }, provenance: [] });
    });
    result.width = Math.max(result.width, frame.x + frame.width + 30);
    result.height = Math.max(result.height, frame.y + frame.height + 30);
    result.metadata = { ...result.metadata, runtimeAuxiliary: true, runtimeGraphId: runtimeGraph.id };
    return result;
  }

  function buildWholeModelGraph(expandedIds = new Set(), collapsedIds = new Set(), runtimeGraph = null) {
    const pattern = global.PtoDv4ArchitecturePattern;
    const graph = pattern.buildFrontGraph(2);
    // Training Pro consumes the Pro role template only. Never graft Flash decode
    // source/implementation nodes into a different model's training evidence.
    if (new URLSearchParams(global.location.search).get('trainingProfile') === 'pro') {
      graph.title = 'DeepSeek V4 Pro · architecture role template';
      graph.metadata = { ...graph.metadata, modelId: 'deepseek-ai/DeepSeek-V4-Pro', sourceCarrier: 'pro-role-template', kernelMapping: false };
      // The shared builder can itself read the Flash registry. Keep attention at
      // role level and drop those source claims even when L2 is requested.
      [...graph.nodes,...graph.clusters].forEach(n=>{ n.sourceRefs=[]; });
      const head=graph.nodes.find(n=>n.id==='dv4/model/lm_head');
      const output=graph.nodes.find(n=>n.id==='dv4/model/output_tokens');
      output.label='Main Logits'; output.typeLabel='Training tensor';
      graph.nodes.push({...head,id:'dv4/model/mtp',label:'MTP',kind:'module',typeLabel:'Aggregate training block',x:head.x+450,y:head.y,colorKey:'module:decoder',sourceRefs:[]});
      graph.nodes.push({...head,id:'dv4/model/loss',label:'Training Loss',typeLabel:'Main + auxiliary',y:output.y+100,colorKey:'sem:linear',sourceRefs:[]});
      graph.edges.push({id:'pro/hidden-mtp',source:'dv4/model/remaining_decoder_layers',target:'dv4/model/mtp',label:'hidden state'},
        {id:'pro/main-loss',source:output.id,target:'dv4/model/loss',label:'main logits'},
        {id:'pro/mtp-loss',source:'dv4/model/mtp',target:'dv4/model/loss',label:'auxiliary loss'});
      graph.height=Math.max(graph.height,output.y+180);
      const fixedAttention=graph.clusters.filter(n=>/\/(csa|hca)$/.test(n.id)).map(n=>n.id);
      const projected=pattern.projectCollapsedFrontGraph(graph,new Set([...collapsedIds,...fixedAttention]));
      // Abstract attention roles have no Pro implementation children in this demo.
      // Do not offer a nonfunctional '+' that would expose Flash-only internals.
      projected.nodes.filter(n=>fixedAttention.includes(n.id)).forEach(n=>{n.collapsed=false;n.kind='module';});
      return attachTrainingRuntime(projected, runtimeGraph);
    }
    const semantic = buildSemanticGraph(expandedIds);
    const localScope = semantic.clusters[0];
    const originalScope = graph.clusters.find(item => item.id.endsWith('/csa'));
    const originalId = originalScope.id;
    const normId = 'dv4/layer/2/mhc_attn/rmsnorm';
    const outputId = 'dv4/layer/2/mhc_attn/hc_post';
    const scheduleId = 'dv4/layer/2/mhc_attn/hybrid_attention/attention_type';
    const scopeId = 'l1_csa';
    const dx = originalScope.x - localScope.x;
    const dy = originalScope.y - localScope.y;
    const delta = localScope.height - originalScope.height;
    const bottom = originalScope.y + originalScope.height;
    const shiftY = y => y >= bottom ? y + delta : y;
    graph.nodes = graph.nodes.filter(item => item.parent !== originalId && item.id !== scheduleId);
    graph.nodes.forEach(item => { item.y = shiftY(item.y); });
    graph.clusters = graph.clusters.filter(item => item.id !== originalId);
    graph.clusters.forEach(item => {
      const end = shiftY(item.y + item.height);
      item.y = shiftY(item.y);
      item.height = end - item.y;
    });
    graph.edges = graph.edges.filter(edge => !edge.id.startsWith('edge/csa-') && edge.target !== scheduleId);
    graph.edges.forEach(edge => {
      if (edge.source === scheduleId) edge.source = normId;
      if (edge.bundlePath) edge.bundlePath = edge.bundlePath.map(point => ({ ...point, y: shiftY(point.y) }));
      if (Number.isFinite(edge.fanCurveY)) edge.fanCurveY = shiftY(edge.fanCurveY);
    });
    const resolve = id => id === registry.canonicalGraph.inputId ? normId
      : id === registry.canonicalGraph.outputId ? outputId : id;
    semantic.nodes.filter(item => ![registry.canonicalGraph.inputId, registry.canonicalGraph.outputId].includes(item.id)).forEach(item => {
      graph.nodes.push({ ...item, x: item.x + dx, y: item.y + dy,
        parent: item.parent === localScope.id ? scopeId : item.parent });
    });
    semantic.clusters.forEach(item => graph.clusters.push({ ...item,
      id: item.id === localScope.id ? scopeId : item.id,
      x: item.x + dx, y: item.y + dy,
      parent: item.id === localScope.id ? originalScope.parent : scopeId,
      selectable: true, collapsible: true,
      sourceRefs: item.id === localScope.id ? registry.getNode(scopeId).sourceRefs : item.sourceRefs
    }));
    semantic.edges.forEach(edge => graph.edges.push({ ...edge, id: `official/${edge.id}`,
      source: resolve(edge.source), target: resolve(edge.target) }));
    graph.height += delta;
    // Derive containment lists from identity, not from the visual sibling order.
    graph.clusters.forEach(item => {
      item.nodes = graph.nodes.filter(node => node.parent === item.id).map(node => node.id);
      item.children = graph.clusters.filter(child => child.parent === item.id).map(child => child.id);
    });
    graph.metadata = { ...graph.metadata, ...semantic.metadata, sourceCarrier: 'whole_model',
      sourceScopeId: scopeId, nonCsaArtifactStatus: 'unavailable' };
    // This view is Flash layer 2 (ratio=4), not the Pro template's variant gallery.
    const hcaIds = new Set([...graph.nodes, ...graph.clusters].filter(item => item.variant === 'hca' || /\/hca(?:\/|$)/.test(item.id)).map(item => item.id));
    graph.nodes = graph.nodes.filter(item => !hcaIds.has(item.id));
    graph.clusters = graph.clusters.filter(item => !hcaIds.has(item.id));
    graph.edges = graph.edges.filter(edge => !hcaIds.has(edge.source) && !hcaIds.has(edge.target));
    graph.clusters.forEach(item => {
      item.nodes = item.nodes.filter(id => !hcaIds.has(id));
      item.children = item.children.filter(id => !hcaIds.has(id));
      if (item.id.endsWith('/hybrid_attention')) item.label = 'Attention · CSA · ratio 4';
      if (item.id.endsWith('/deepseek_moe')) item.label = 'MoE · 256 experts · 6 active';
      if (item.id.endsWith('/routed_experts')) item.label = 'Routed Experts · 256';
    });
    graph.metadata.modelId = 'deepseek-ai/DeepSeek-V4-Flash';
    const projected = pattern.projectCollapsedFrontGraph(graph, collapsedIds);
    const foldedCsa = projected.nodes.find(item => item.id === scopeId);
    if (foldedCsa) {
      foldedCsa.selectable = true;
      foldedCsa.sourceRefs = registry.getNode(scopeId).sourceRefs;
    }
    return projected;
  }

  function normalizeGraph(payload, level, expandedCompoundIds) {
    if (level === 'l1' || level === 'l2') return buildSemanticGraph(expandedCompoundIds);
    const graph = structuredClone(payload);
    const semanticNodes = new Map();
    const visit = item => {
      if (!item || typeof item !== 'object') return;
      if (item.id) semanticNodes.set(item.id, item);
      (item.children || []).forEach(visit);
    };
    (graph.roots || []).forEach(visit);
    const linkedBoundaryNodes = new Set(['hc_input', 'attention_hc_output']);
    const visibleNodeIds = new Set(
      (graph.nodes || [])
        .filter(node => node.parent === 'csa_operator_group' || linkedBoundaryNodes.has(node.id))
        .map(node => node.id)
    );
    graph.schemaVersion = graph.schemaVersion || 'model_architecture_graph.v1';
    graph.title = graph.title || graph.model?.name || 'CSA Distributed Operator Implementation';
    graph.metadata = {
      ...(graph.metadata || {}),
      graphRole: 'distributed_operator_implementation',
      sourceModelArchitecture: false,
      implementationSource: 'decode_csa.py'
    };
    graph.nodes = (graph.nodes || []).filter(node => visibleNodeIds.has(node.id)).map(node => {
      const semanticNode = semanticNodes.get(node.id) || {};
      const registryNode = registry?.getNode(node.id);
      const mapping = mappingFor(node.id);
      return {
        ...node,
        label: registryNode?.label || node.label,
        entityKind: registryNode?.entityKind || 'Op',
        kind: ['Value', 'LogicalState', 'RuntimeMetadata'].includes(registryNode?.entityKind) ? 'tensor' : node.kind,
        colorKey: ['Value', 'LogicalState', 'RuntimeMetadata'].includes(registryNode?.entityKind) ? 'io:state' : implementationColor(node.id, node.colorKey),
        sourceRefs: registryNode?.sourceRefs || semanticNode.sourceRefs || node.sourceRefs || [],
        attrs: {
          ...(semanticNode.attrs || node.attrs || {}),
          mappingCode: mapping[0],
          mappingReason: mapping[1]
        },
        selectable: true,
        origin: node.origin || 'implementation',
        dataState: node.dataState || 'implementation_only',
        mappingCode: mapping[0],
        mappingReason: mapping[1]
      };
    });
    const extras = [
      { id: 'slot_mapping', label: 'Slot Mapping', kind: 'tensor', typeLabel: 'Runtime Mapping', colorKey: 'io:state', width: 210, height: 48, x: 215, y: 850 },
      { id: 'block_table', label: 'Block Table', kind: 'tensor', typeLabel: 'Runtime Mapping', colorKey: 'io:state', width: 210, height: 48, x: 215, y: 960 },
      { id: 'head_group_redistribution', label: 'Head-group Redistribution', kind: 'op', typeLabel: 'Layout Transform', colorKey: 'sem:attention', width: 270, height: 56, x: 650, y: 1330 }
    ].map(item => {
      const registryNode = registry.getNode(item.id);
      const mapping = mappingFor(item.id);
      return {
        ...item,
        parent: 'decode_csa_implementation_scope',
        selectable: true,
        sourceRefs: registryNode.sourceRefs,
        mappingCode: mapping[0],
        mappingReason: mapping[1]
      };
    });
    graph.nodes.push(...extras);
    const shifted = new Set(['attention_alltoall', 'grouped_output_projection', 'output_reduce_scatter', 'attention_hc_post', 'attention_hc_output']);
    graph.nodes.forEach(item => {
      if (shifted.has(item.id)) item.y += 120;
      const registryNode = registry?.getNode(item.id);
        item.parent = registryNode?.parentScope || 'decode_csa_implementation_scope';
        item.entityKind = registryNode?.entityKind || 'Op';
    });
    const semanticIds = graph.nodes
      .filter(item => registry?.getNode(item.id)?.parentScope === 'csa_model_semantic_scope')
      .map(item => item.id);
    const outerIds = graph.nodes.filter(item => !semanticIds.includes(item.id)).map(item => item.id);
    graph.clusters = [
      {
        id: 'decode_csa_implementation_scope', label: 'decode_csa.py implementation scope · HC Pre → RMSNorm → CSA → HC Post',
        x: 44, y: 44, width: 1398, height: 2030, parent: null,
        nodes: outerIds, children: ['csa_model_semantic_scope'], colorKey: 'module:decoder', selectable: false, collapsible: false
      },
      {
        id: 'csa_model_semantic_scope', label: 'CSA model semantic scope · Q/KV Projection → Grouped Output Projection',
        x: 82, y: 410, width: 1322, height: 1220, parent: 'decode_csa_implementation_scope',
        nodes: semanticIds, children: [], colorKey: 'sem:attention', selectable: false, collapsible: false
      }
    ];
    graph.edges = (graph.edges || []).filter(edge => (
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
      && !(edge.source === 'head_merge' && edge.target === 'attention_alltoall')
    )).map(edge => ({
      ...edge,
      sourceAnchor: 'bottom',
      targetAnchor: 'top',
      curve: 'vertical'
    }));
    graph.edges.push(
      { id: 'e_slot_raw', source: 'slot_mapping', target: 'raw_kv_cache' },
      { id: 'e_slot_cmp', source: 'slot_mapping', target: 'main_compressor' },
      { id: 'e_table_cache', source: 'block_table', target: 'compressed_gather' },
      { id: 'e_table_index', source: 'block_table', target: 'lightning_indexer' },
      { id: 'e_merge_redistribute', source: 'head_merge', target: 'head_group_redistribution' },
      { id: 'e_redistribute_a2a', source: 'head_group_redistribution', target: 'attention_alltoall' }
    );
    graph.edges.forEach(edge => {
      edge.sourceAnchor = 'bottom';
      edge.targetAnchor = 'top';
      edge.curve = 'vertical';
    });
    graph.height = 2120;
    return graph;
  }

  function expandImplementationPrograms(graph, expandedPrograms = new Set()) {
    const programs = registry.implementationPrograms;
    const originals = new Map(graph.nodes.map(item => [item.id, { ...item }]));
    const owned = new Set(Object.values(programs).flatMap(program => program.ownedNodes || []));
    graph.nodes = graph.nodes.filter(item => !owned.has(item.id));
    graph.clusters.forEach(cluster => { cluster.nodes = cluster.nodes.filter(id => !owned.has(id)); });
    // Reserve one band per original row, using the tallest sibling expansion.
    // Expanding a parallel branch must not serialize its sibling programs.
    const bands = new Map();
    Object.entries(programs).forEach(([id, program]) => {
      const parent = originals.get(id);
      if (!parent || !expandedPrograms.has(id)) return;
      bands.set(parent.y, Math.max(bands.get(parent.y) || 0, 60 + program.children.length * 64 - parent.height));
    });
    const shift = y => [...bands].reduce((sum, [row, delta]) => sum + (row < y ? delta : 0), 0);
    graph.nodes.forEach(item => { item.y += shift(item.y); });
    graph.clusters.forEach(cluster => {
      const bottom = cluster.y + cluster.height;
      cluster.height += shift(bottom) - shift(cluster.y);
      cluster.y += shift(cluster.y);
    });
    graph.height += shift(Infinity);
    const additional = Object.values(programs).flatMap(program => program.extraEdges || []);
    additional.forEach(([source, target], index) => graph.edges.push({ id: `program-dependency-${index}`, source, target }));
    const childOwners = new Map(Object.entries(programs).flatMap(([id, program]) => program.children.map(([child]) => [child, id])));
    // Resolve both ends together: an input port is chosen using the canonical
    // producer identity, even if the producer itself has been expanded.
    const endpoints = (id, peer, direction) => {
      const owner = childOwners.get(id);
      if (owner) return [expandedPrograms.has(owner) ? id : owner];
      const program = programs[id];
      if (!program || !expandedPrograms.has(id)) return [id];
      return [].concat(program[direction + 'Ports']?.[peer] || program[direction]);
    };
    graph.edges = graph.edges.flatMap(edge => endpoints(edge.source, edge.target, 'output').flatMap(source =>
      endpoints(edge.target, edge.source, 'input').map(target => ({ ...edge, id: `${edge.id}:${source}:${target}`, source, target }))));
    Object.entries(programs).forEach(([id, program]) => {
      const parent = graph.nodes.find(item => item.id === id);
      if (!parent) return;
      parent.width = id === 'q_projection' ? 310 : 270;
      parent.hideTypeLabel = true;
      parent.collapsed = true;
      if (!expandedPrograms.has(id)) return;
      const top = parent.y - parent.height / 2;
      const height = 60 + program.children.length * 64;
      graph.clusters.forEach(cluster => {
        cluster.nodes = cluster.nodes.filter(key => key !== id);
        if (cluster.id === parent.parent) cluster.children.push(id);
      });
      graph.clusters.push({ id, label: parent.label, x: parent.x - parent.width / 2, y: top,
        width: parent.width, height, nodes: program.children.map(child => child[0]), children: [],
        parent: parent.parent, selectable: true, collapsible: true, colorKey: parent.colorKey });
      graph.nodes = graph.nodes.filter(item => item.id !== id);
      program.children.forEach(([childId], index) => {
        const child = registry.getNode(childId);
        graph.nodes.push({ id: childId, label: child.label, x: parent.x, y: top + 82 + index * 64,
          width: parent.width - 20, height: 44, kind: 'op', hideTypeLabel: true, colorKey: implementationColor(childId, parent.colorKey),
          parent: id, selectable: true, sourceRefs: child.sourceRefs, mappingCode: child.mappingType, mappingReason: child.reason });
      });
      program.edges.forEach(([source, target, semanticEdgeType = 'activation'], index) => {
        const from = graph.nodes.find(item => item.id === source);
        const to = graph.nodes.find(item => item.id === target);
        const bypass = Math.abs(to.y - from.y) > 65;
        const bottom = from.y + from.height / 2;
        const top = to.y - to.height / 2;
        const lane = parent.x - parent.width / 2 + 5;
        graph.edges.push({ id: id + '-internal-' + index, source, target,
          semanticEdgeType, dashed: semanticEdgeType === 'control',
          tensor: { name: semanticEdgeType === 'control' ? 'state commit dependency' : 'value' },
          ...(bypass ? { waypoints: [{ x: from.x, y: bottom + 8 },
            { x: lane, y: bottom + 8 }, { x: lane, y: top - 8 }, { x: to.x, y: top - 8 }] } : {}),
          sourceAnchor: 'bottom', targetAnchor: 'top', curve: 'vertical' });
      });
    });
    const pairs = new Set();
    graph.edges = graph.edges.filter(edge => {
      const key = `${edge.source}>${edge.target}`;
      if (edge.source === edge.target || pairs.has(key)) return false;
      pairs.add(key); return true;
    }).map(edge => ({ ...edge, sourceAnchor: 'bottom', targetAnchor: 'top', curve: 'vertical' }));
    return graph;
  }

  const overviewScopes = ['dv4/layer/2/mhc_attn', 'dv4/layer/2/mhc_ffn'];
  const proDetailScopes = ['dv4/layer/2/mhc_attn/hybrid_attention', 'dv4/layer/2/mhc_ffn/deepseek_moe'];
  const proLevelCollapsed = expanded => new Set(expanded ? [] : proDetailScopes);
  function buildOverviewGraph(expandedIds = new Set(), collapsedIds = new Set(), runtimeGraph = null) {
    const folded = new Set(collapsedIds);
    folded.delete('dv4/layer/2');
    // Keep mHC pre/post, residual mixing and merge visible at every scale.
    overviewScopes.forEach(id => folded.delete(id));
    proDetailScopes.forEach(id => folded.add(id));
    return buildWholeModelGraph(expandedIds, folded, runtimeGraph);
  }

  // Source-backed report presentation. Geometry stays in the shared graph renderer.
  function prepareReportGraph(graph) {
    const file = '../../../Data/DeepSeek-V4-Flash-Official/model.py';
    const refs = (start, end = start) => [{ file, start, end }];
    const sourceLines = { hc_pre: [673,681], hc_post: [683,686], residual_mix_b: [683,685],
      rmsnorm: [688,699], token_embedding: [803,805], previous_decoder_layers: [806,807],
      remaining_decoder_layers: [806,807], final_rmsnorm: [718,735], lm_head: [718,735], input_tokens: [802,803], output_tokens: [808,809] };
    graph.nodes.forEach(node => {
      node.hideTypeLabel = true;
      const leaf = node.id.split('/').pop();
      if (sourceLines[leaf] && !node.sourceRefs?.length) node.sourceRefs = refs(...sourceLines[leaf]);
      if (node.role === 'stream-state') {
        node.label = `${leaf === 'input' ? 'X' : node.label.split(' · ')[0]} · [B,T,4,4096]`;
        node.sourceRefs = refs(688,700);
      }
      if (node.id === 'dv4/layer/2/mhc_attn/hybrid_attention') node.label = 'Attention · CSA';
      if (node.id === 'dv4/layer/2/mhc_ffn/deepseek_moe') node.label = 'MoE · 256 experts · 6 active';
      if (node.id.endsWith('/expert_384')) node.label = 'Expert 255';
      if (node.id.endsWith('/expert_001')) node.label = 'Expert 0';
      if (node.id.endsWith('/expert_002')) node.label = 'Expert 1';
      if (node.id.endsWith('/router')) node.sourceRefs = refs(550,585);
      if (node.id.endsWith('/selection')) node.label = 'Hash Expert IDs ×6';
      if (node.id === 'dv4/model/previous_decoder_layers') node.label = 'Decoder Layers 0–1';
      if (node.id === 'dv4/model/remaining_decoder_layers') node.label = 'Decoder Layers 3–42';
      if (node.role === 'mhc-merge') node.sourceRefs = refs(683,686);
      if (['state','tensor','buffer','input','output'].includes(node.kind)) node.height = 64;
      if (node.id === 'dv4/model/output_tokens') node.label = 'Logits · [B,V]';
      if (node.id === 'dv4/model/input_tokens') node.label = 'Token IDs · [B,T]';
      if (node.sourceRefs?.length) node.selectable = true;
    });
    // The reference model returns logits; token selection belongs to its caller.
    graph.metadata = { ...graph.metadata, presentation: 'report', verifiedSourceScope: 'Flash layer 2; mHC, CSA, MoE configuration and norm parameters' };
    for (const [scope, line] of [['mhc_attn',658], ['mhc_ffn',659]]) {
      const norm = graph.nodes.find(n => n.id === `dv4/layer/2/${scope}/rmsnorm`);
      if (!norm) continue;
      const id = `${norm.id}/weight`;
      const label = `${scope === 'mhc_attn' ? 'attn_norm' : 'ffn_norm'}.weight · [4096]`;
      const measure = document.createElement('canvas').getContext('2d');
      measure.font = '700 16px Inter, "Source Han Sans SC", "PingFang SC", "Noto Sans SC", sans-serif';
      const width = Math.ceil(measure.measureText(label).width + 40);
      const height = graph.nodes.find(n => n.id === 'dv4/layer/2/input_streams')?.height || 64;
      graph.nodes.push({ id, label,
        kind: 'parameter', parent: norm.parent, x: norm.x + 465, y: norm.y,
        width, height, hideTypeLabel: true, selectable: true, sourceRefs: refs(line) });
      graph.edges.push({ id: `${id}/read`, source: id, target: norm.id,
        sourceAnchor: 'left', targetAnchor: 'right', curve: 'horizontal', dashed: true,
        semanticEdgeType: 'parameter', tensor: { name: 'weight', shape: '[4096]' } });
    }
    return graph;
  }

  function layoutReportGraph(graph) {
    const nodes = new Map(graph.nodes.map(node => [node.id, node]));
    const clusters = new Map(graph.clusters.map(cluster => [cluster.id, cluster]));
    const rootId = 'dv4/layer/2', axis = 920, gap = 48;
    // A folded root already has a valid projected layout and no internal nodes.
    if (nodes.has(rootId)) return graph;
    const bounds = node => ({ x: node.x - node.width / 2, y: node.y - node.height / 2, width: node.width, height: node.height });
    const descendants = id => {
      const result = new Set([id]);
      let changed = true;
      while (changed) {
        changed = false;
        [...graph.nodes, ...graph.clusters].forEach(item => {
          if (result.has(item.parent) && !result.has(item.id)) { result.add(item.id); changed = true; }
        });
      }
      return result;
    };
    const fitCluster = id => {
      const cluster = clusters.get(id);
      if (!cluster) return null;
      const childBoxes = graph.nodes.filter(n => n.parent === id && !n.id.endsWith('/residual_mix_b')).map(bounds);
      graph.clusters.filter(c => c.parent === id).forEach(child => { const box = fitCluster(child.id); if (box) childBoxes.push(box); });
      if (!childBoxes.length) return cluster;
      const left = Math.min(...childBoxes.map(b => b.x)), right = Math.max(...childBoxes.map(b => b.x + b.width));
      const top = Math.min(...childBoxes.map(b => b.y)), bottom = Math.max(...childBoxes.map(b => b.y + b.height));
      Object.assign(cluster, { x: left - 36, y: top - 52, width: right - left + 72, height: bottom - top + 84 });
      return cluster;
    };
    const place = (id, top) => {
      const node = nodes.get(id);
      if (!node) return top;
      node.x = axis; node.y = top + node.height / 2;
      return top + node.height;
    };
    const placeModule = (id, top) => {
      if (nodes.has(id)) return place(id, top);
      const box = fitCluster(id);
      if (!box) return top;
      const owned = descendants(id);
      const dx = axis - (box.x + box.width / 2), dy = top - box.y;
      [...graph.nodes, ...graph.clusters].filter(item => owned.has(item.id)).forEach(item => { item.x += dx; item.y += dy; });
      return box.y + box.height;
    };
    const csaIds = ['csa_query_projection', 'csa_recent_window_kv', 'csa_compressed_kv_path',
      'csa_lightning_indexer', 'csa_sparse_shared_kv_attention', 'csa_grouped_output_projection'];
    // Equal-width modules; three independent branches share one row.
    csaIds.forEach(id => { if (nodes.has(id)) Object.assign(nodes.get(id),{width:360,height:64}); });
    const compactCsa = csaIds.every(id => nodes.has(id));
    if (compactCsa) {
      const slots = [[0,0],[-440,160],[440,160],[0,160],[0,320],[0,424]];
      csaIds.forEach((id,i) => Object.assign(nodes.get(id), {x:axis+slots[i][0],y:slots[i][1]}));
    }
    if (!compactCsa && clusters.has('l1_csa')) global.PtoV4ReportLayout.arrange(graph,csaIds,fitCluster);
    let cursor = 32;
    for (const leaf of ['input_tokens', 'token_embedding', 'previous_decoder_layers']) {
      cursor = place(`dv4/model/${leaf}`, cursor) + gap;
    }
    cursor += 32;
    cursor = place(`${rootId}/input_streams`, cursor);
    for (const [scope, inner, input, output] of [
      ['mhc_attn', 'hybrid_attention', 'input_streams', 'attention_output_streams'],
      ['mhc_ffn', 'deepseek_moe', 'attention_output_streams', 'output_streams']
    ]) {
      const scopeId = `${rootId}/${scope}`;
      if (nodes.has(scopeId)) {
        cursor = place(scopeId, cursor + 80) + 72;
        cursor = place(`${rootId}/${output}`, cursor);
        continue;
      }
      cursor += 80;
      cursor = place(`${scopeId}/hc_pre`, cursor) + gap;
      cursor = place(`${scopeId}/rmsnorm`, cursor) + gap;
      cursor = placeModule(`${scopeId}/${inner}`, cursor) + gap;
      cursor = place(`${scopeId}/hc_post`, cursor) + gap;
      cursor = place(`${scopeId}/merge`, cursor);
      fitCluster(scopeId);
      const mix = nodes.get(`${scopeId}/residual_mix_b`);
      const inputNode = nodes.get(`${rootId}/${input}`), merge = nodes.get(`${scopeId}/merge`);
      // A residual transformation is an annotation on its path, not a compute pill.
      // Leave a dedicated outer lane clear of every visible child and parameter.
      const content = graph.nodes.filter(n => descendants(scopeId).has(n.id) && n !== mix && n.kind !== 'parameter');
      const lane = Math.min(...content.map(n => n.x - n.width / 2)) - 72;
      Object.assign(mix, { x: lane, y: (inputNode.y + merge.y) / 2, width: 1, height: 1, role: 'residual-annotation' });
      const norm = nodes.get(`${scopeId}/rmsnorm`), weight = nodes.get(`${scopeId}/rmsnorm/weight`);
      if (weight) { weight.x = norm.x + norm.width / 2 + 64 + weight.width / 2; weight.y = norm.y; }
      cursor += 72;
      cursor = place(`${rootId}/${output}`, cursor);
      fitCluster(scopeId);
    }
    cursor += 80;
    for (const leaf of ['remaining_decoder_layers', 'final_rmsnorm', 'lm_head', 'output_tokens']) {
      cursor = place(`dv4/model/${leaf}`, cursor) + gap;
    }
    fitCluster(rootId);
    const residualLane = clusters.get(rootId).x - 88;
    graph.nodes.filter(n => n.role === 'residual-annotation').forEach(n => { n.x = residualLane; });
    // One connector represents one tensor; the four-stream dimension stays in labels.
    graph.edges.forEach(edge => {
      delete edge.bundlePath; delete edge.bundleDiagonal; delete edge.fanCurveY;
      delete edge.waypoints; delete edge.sourcePoint; delete edge.targetPoint;
      const from = nodes.get(edge.source), to = nodes.get(edge.target);
      if (!from || !to) return;
      if (to.role === 'residual-annotation') {
        edge.sourceAnchor = 'left'; edge.targetAnchor = 'top';
        edge.waypoints = [{ x: to.x, y: from.y }];
      } else if (from.role === 'residual-annotation') {
        edge.sourceAnchor = 'bottom'; edge.targetAnchor = 'left';
        edge.waypoints = [{ x: from.x, y: to.y }];
      } else if (edge.semanticEdgeType !== 'parameter') {
        edge.sourceAnchor = 'bottom'; edge.targetAnchor = 'top';
      }
    });
    // Keep long CSA dependencies out of intervening operator faces.
    const ancestors = node => {
      const ids = [];
      for (let id = node.parent; id; id = clusters.get(id)?.parent) ids.push(id);
      return ids;
    };
    const crosses = (points, node) => {
      const box = bounds(node), pad = 8;
      return points.slice(1).some((point, i) => {
        const prev = points[i];
        if (prev.x === point.x) return point.x > box.x-pad && point.x < box.x+box.width+pad
          && Math.max(prev.y,point.y) > box.y-pad && Math.min(prev.y,point.y) < box.y+box.height+pad;
        return point.y > box.y-pad && point.y < box.y+box.height+pad
          && Math.max(prev.x,point.x) > box.x-pad && Math.min(prev.x,point.x) < box.x+box.width+pad;
      });
    };
    graph.edges.filter(edge => edge.id.startsWith('official/')).forEach(edge => {
      const from = nodes.get(edge.source), to = nodes.get(edge.target);
      if (!from || !to) return;
      const start = { x: from.x, y: from.y+from.height/2 }, end = { x: to.x, y: to.y-to.height/2 };
      const midY = (start.y+end.y)/2;
      const points = [start,{x:start.x,y:midY},{x:end.x,y:midY},end];
      const obstacles = graph.nodes.filter(n => n !== from && n !== to && n.role !== 'residual-annotation');
      if (!obstacles.some(node => crosses(points,node))) return;
      const targetParents = new Set(ancestors(to));
      const common = ancestors(from).find(id => targetParents.has(id));
      const scope = clusters.get(common);
      if (!scope) return;
      const left = to.x < axis || (to.x === axis && from.x < axis);
      const lane = left ? scope.x+16 : scope.x+scope.width-16;
      edge.sourceAnchor = 'bottom'; edge.targetAnchor = left ? 'left' : 'right';
      edge.waypoints = [{x:start.x,y:start.y+16},{x:lane,y:start.y+16},{x:lane,y:to.y}];
    });
    if (compactCsa) {
      const [q,recent,compressed,indexer,attention,out] = csaIds.map(id => nodes.get(id));
      const input = nodes.get(`${rootId}/mhc_attn/rmsnorm`);
      const top = n => ({x:n.x,y:n.y-n.height/2});
      const bottom = n => ({x:n.x,y:n.y+n.height/2});
      const route = (from,to,start,end,via=[]) => {
        const edge = graph.edges.find(e => e.source===from.id && e.target===to.id && e.id.startsWith('official/'));
        if (edge) Object.assign(edge,{sourcePoint:start,targetPoint:end,waypoints:via});
      };
      const busY=q.y-q.height/2-24;
      route(input,q,bottom(input),top(q));
      for (const branch of [recent,compressed]) route(input,branch,
        {x:input.x+(branch===recent?-80:80),y:input.y+input.height/2},top(branch),
        [{x:input.x+(branch===recent?-80:80),y:busY-40},{x:branch.x,y:busY-40}]);
      // Independent hidden-state and Q bypass lanes occupy the gaps between columns.
      const hiddenX=q.x+220, queryX=q.x-220;
      const hiddenStart={x:input.x+24,y:input.y+input.height/2};
      route(input,indexer,hiddenStart,{x:indexer.x+180,y:indexer.y},
        [{x:hiddenStart.x,y:busY-20},{x:hiddenX,y:busY-20},{x:hiddenX,y:indexer.y}]);
      route(q,indexer,bottom(q),top(indexer));
      const queryEnd={x:attention.x-100,y:attention.y-attention.height/2};
      route(q,attention,{x:q.x-180,y:q.y},queryEnd,
        [{x:queryX,y:q.y},{x:queryX,y:queryEnd.y-24},{x:queryEnd.x,y:queryEnd.y-24}]);
      route(recent,attention,bottom(recent),{x:attention.x-180,y:attention.y},[{x:recent.x,y:attention.y}]);
      route(compressed,attention,bottom(compressed),{x:attention.x+180,y:attention.y},[{x:compressed.x,y:attention.y}]);
      route(indexer,attention,bottom(indexer),top(attention));
      route(attention,out,bottom(attention),top(out));
      route(out,nodes.get(`${rootId}/mhc_attn/hc_post`),bottom(out),top(nodes.get(`${rootId}/mhc_attn/hc_post`)));
    }
    if (!compactCsa && clusters.has('l1_csa')) global.PtoV4ReportLayout.route(graph);
    const all = [...graph.nodes.filter(n => n.role !== 'residual-annotation').map(bounds), ...graph.clusters];
    const minX = Math.min(...all.map(b => b.x), ...graph.nodes.filter(n => n.role === 'residual-annotation').map(n => n.x - 28)) - 40;
    const maxX = Math.max(...all.map(b => b.x + b.width));
    graph.nodes.forEach(n => { n.x -= minX; });
    graph.clusters.forEach(c => { c.x -= minX; });
    graph.edges.forEach(e => {
      e.waypoints?.forEach(point => { point.x -= minX; });
      if (e.sourcePoint) e.sourcePoint.x -= minX;
      if (e.targetPoint) e.targetPoint.x -= minX;
    });
    graph.width = maxX - minX + 40;
    graph.height = cursor;
    return graph;
  }

  function decorateReportGraph(host, graph) {
    const svg = host.querySelector('svg');
    if (!svg) return;
    graph.clusters.forEach(cluster => {
      const el = host.querySelector(`[data-cluster-id="${CSS.escape(cluster.id)}"]`);
      if (el) {
        el.dataset.reportFoldable = String(cluster.collapsible !== false);
        let depth = 0, parent = cluster.parent;
        while (parent) { depth++; parent = graph.clusters.find(c => c.id === parent)?.parent; }
        el.dataset.reportDepth = String(depth % 2);
      }
    });
    const ns = 'http://www.w3.org/2000/svg';
    const make = (tag, attrs) => { const el = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v)); return el; };
    graph.nodes.forEach(node => {
      const el = host.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`);
      if (!el) return;
      const isParameter = node.kind === 'parameter';
      const isValue = ['state','tensor','buffer','input','output'].includes(node.kind);
      el.dataset.reportKind = isParameter ? 'parameter' : isValue ? 'value' : 'compute';
      if (node.role === 'residual-annotation') {
        el.dataset.reportKind = 'annotation';
        el.querySelectorAll('rect, text').forEach(child => child.remove());
        const label = make('text', { x: -18, y: 0, transform: 'rotate(-90 -18 0)',
          class: 'v4-report-residual-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
        label.textContent = 'Mix B · 4→4';
        el.appendChild(label);
      }
      const rect = el.querySelector('rect');
      if (rect && !isValue && !isParameter && node.role !== 'residual-annotation' && !node.id.endsWith('/expert_ellipsis')) {
        const icon = global.PtoOpIconFor?.(node.label || '');
        if (icon) {
          const x = Number(rect.getAttribute('x')), y = Number(rect.getAttribute('y'));
          const height = Number(rect.getAttribute('height')), width = Number(rect.getAttribute('width'));
          const cy = y + height / 2, diameter = Math.min(44, height - 16), glyph = diameter * 30 / 44;
          const cx = x + 16 + diameter / 2;
          const badge = make('g', {'pointer-events':'none', 'aria-hidden':'true'});
          badge.append(make('circle', {cx, cy, r:diameter/2, fill:'var(--background)'}));
          badge.append(make('path', {d:icon.path, transform:`translate(${cx-glyph/2} ${cy-glyph/2}) scale(${glyph/24})`, fill:'none', stroke:'var(--foreground)', 'stroke-width':1.8, 'stroke-linecap':'round', 'stroke-linejoin':'round'}));
          el.append(badge);
          el.dataset.opIcon = icon.id;
          const label = el.querySelector('.pto-model-graphviz-node-label');
          if (label) {
            // Keep the label centered on the whole pill, reserving equal room at both ends.
            label.setAttribute('x', x + width / 2);
            const available = width - 2 * (24 + diameter);
            if (label.getComputedTextLength() > available && available > 0) {
              label.setAttribute('textLength', available);
              label.setAttribute('lengthAdjust', 'spacingAndGlyphs');
            }
          }
        }
      }
      if (rect && (isValue || isParameter)) {
        rect.setAttribute('rx','6'); rect.setAttribute('ry','6');
        const grid = make('g', { class: 'v4-report-grid', 'pointer-events': 'none' });
        const inset = 8, cell = 10, channel = 2, pitch = cell + channel;
        const width = Number(rect.getAttribute('width')), height = Number(rect.getAttribute('height'));
        const cols = Math.max(1, Math.floor((width-inset*2+channel)/pitch));
        const rows = Math.max(1, Math.floor((height-inset*2+channel)/pitch));
        const x0 = Number(rect.getAttribute('x'))+(width-(cols*pitch-channel))/2;
        const y0 = Number(rect.getAttribute('y'))+(height-(rows*pitch-channel))/2;
        for (let row=0; row<rows; row++) for (let col=0; col<cols; col++) {
          grid.appendChild(make('rect', { x:x0+col*pitch, y:y0+row*pitch, width:cell, height:cell,
            fill:isParameter ? 'var(--v4-report-parameter)' : 'var(--v4-report-value)', opacity:'.23', stroke:'none' }));
        }
        rect.after(grid);
      }
    });
    graph.edges.forEach(edge => {
      const el = host.querySelector(`[data-source="${CSS.escape(edge.source)}"][data-target="${CSS.escape(edge.target)}"]`);
      if (el) {
        el.dataset.reportFlow = edge.semanticEdgeType === 'parameter' ? 'parameter' : 'activation';
        const residual = graph.nodes.find(n => [edge.source,edge.target].includes(n.id) && n.role === 'residual-annotation');
        el.dataset.reportResidual = String(Boolean(residual));
        if (residual) el.dataset.residualGroup = residual.id;
        if (graph.nodes.find(n => n.id === edge.target)?.role === 'residual-annotation') el.removeAttribute('marker-end');
      }
    });
    const visibleNodes = [...svg.querySelectorAll('.pto-model-graphviz-node[data-node-id]')];
    const visibleEdges = [...svg.querySelectorAll('.pto-model-graphviz-edge[data-source][data-target]')];
    const clearHover = () => svg.querySelectorAll('.is-flow-hover').forEach(el => el.classList.remove('is-flow-hover'));
    const highlight = (nodeId, hoveredEdge) => {
      clearHover();
      const ids = new Set(nodeId ? [nodeId] : []);
      visibleEdges.forEach(edge => {
        if (edge === hoveredEdge || (nodeId && [edge.dataset.source,edge.dataset.target].includes(nodeId))) {
          edge.classList.add('is-flow-hover');
          ids.add(edge.dataset.source); ids.add(edge.dataset.target);
        }
      });
      // Both segments around the Mix B annotation are one visual residual path.
      const residualGroups = new Set(visibleEdges.filter(edge => edge.classList.contains('is-flow-hover') && edge.dataset.residualGroup).map(edge => edge.dataset.residualGroup));
      visibleEdges.forEach(edge => {
        if (!residualGroups.has(edge.dataset.residualGroup)) return;
        edge.classList.add('is-flow-hover');
        ids.add(edge.dataset.source); ids.add(edge.dataset.target);
      });
      visibleNodes.forEach(node => node.classList.toggle('is-flow-hover',ids.has(node.dataset.nodeId)));
    };
    visibleNodes.forEach(node => {
      node.addEventListener('pointerenter', () => highlight(node.dataset.nodeId));
      node.addEventListener('pointerleave', clearHover);
    });
    visibleEdges.forEach(edge => {
      // A wider transparent stroke makes thin connectors easy to point at.
      const hit = make('path', {d:edge.getAttribute('d'),class:'v4-flow-hit',fill:'none',stroke:'transparent',
        'stroke-width':12,'vector-effect':'non-scaling-stroke','pointer-events':'stroke'});
      edge.before(hit);
      for (const target of [hit,edge]) {
        target.addEventListener('pointerenter', () => highlight(null,edge));
        target.addEventListener('pointerleave', clearHover);
      }
    });

  }

  async function render(rootInput, options = {}) {
    const root = queryRoot(rootInput);
    if (!root) return null;
    const requestedLevel = ['l1', 'l2', 'l3'].includes(options.level) ? options.level : 'l3';
    const semanticMode = requestedLevel === 'l1' || requestedLevel === 'l2';
    const wholeModel = semanticMode && options.modelGraph === true;
    const proModel = wholeModel && new URLSearchParams(global.location.search).get('trainingProfile') === 'pro';
    root.classList.add('pto-dv4-architecture', 'pto-model-graphviz-pattern-page');
    root.dataset.sharedPattern = 'model-architecture-v4';
    root.innerHTML = shell(requestedLevel);

    let sourceGraph = options.sourceGraph || {};
    if (!semanticMode && !options.sourceGraph) {
      const response = await fetch(options.sourceGraphUrl || './json-architecture.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Architecture graph unavailable: ${response.status}`);
      sourceGraph = await response.json();
    }
    function notify(message, origin) {
      options.onEvent?.(message);
      if (window.parent !== window) window.parent.postMessage(message, origin);
    }
    const level = requestedLevel;
    root.dataset.mappingLevel = level;
    const viewport = root.querySelector('.pto-dv4-architecture__viewport');
    const canvas = root.querySelector('.pto-dv4-architecture__canvas');
    const semanticStatus = root.querySelector('[data-csa-semantic-status]');
    const autoExpandButton = root.querySelector('[data-csa-auto-expand]');
    const state = {
      theme: options.initialTheme === 'light' ? 'light' : 'dark',
      selectedNodeId: null,
      expandedCompoundIds: new Set(level === 'l2' ? registry.canonicalGraph.compoundIds : []),
      autoExpandOnFocus: false,
      zoom: 1,
      panX: 0,
      panY: 0,
      mappingDiff: false,
      diffCategories: ['expanded', 'state', 'deploy'],
      drag: null,
      lineageIds: [],
      increments: false,
      runtimeGraph: null,
      rootFolded: false,
      collapsedModelIds: proModel ? proLevelCollapsed(level === 'l2') : new Set(),
      expandedPrograms: new Set(registry.defaultExpandedPrograms)
    };
    let graph = normalizeGraph(sourceGraph, level, state.expandedCompoundIds);

    function applyTransform() {
      canvas.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    }

    function fit({ whole = false } = {}) {
      const rect = viewport.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const reserve = 28;
      const focusId = state.selectedNodeId || (state.lineageIds.length === 1 ? state.lineageIds[0] : null);
      const focus = !whole && (graph.clusters.find(item => item.id === focusId) || graph.nodes.find(item => item.id === focusId));
      const isCluster = focus && graph.clusters.includes(focus);
      const bounds = focus ? { x: focus.x - (isCluster ? 0 : focus.width / 2), y: focus.y - (isCluster ? 0 : focus.height / 2), width: focus.width, height: focus.height }
        : { x: 0, y: 0, width: graph.width, height: graph.height };
      const widthFit = (rect.width - reserve * 2) / bounds.width;
      const heightFit = (rect.height - reserve * 2) / bounds.height;
      state.zoom = Math.min(1.1, widthFit, heightFit);
      state.panX = (rect.width - bounds.width * state.zoom) / 2 - bounds.x * state.zoom;
      state.panY = (rect.height - bounds.height * state.zoom) / 2 - bounds.y * state.zoom;
      applyTransform();
    }

    function semanticState() {
      const total = registry.canonicalGraph.compoundIds.length;
      const expandedCount = state.expandedCompoundIds.size;
      return {
        expandedCount,
        total,
        state: expandedCount === 0 ? 'l1' : expandedCount === total ? 'l2' : 'partial',
        label: expandedCount === 0 ? 'L1 · 模型架构' : expandedCount === total ? 'L2 · 完全展开' : 'L2 · 局部展开'
      };
    }

    function syncSemanticState({ notifyParent = true } = {}) {
      if (!semanticMode) return;
      const status = semanticState();
      if (semanticStatus) semanticStatus.textContent = status.label;
      if (autoExpandButton) {
        autoExpandButton.setAttribute('aria-pressed', String(state.autoExpandOnFocus));
        autoExpandButton.classList.toggle('is-active', state.autoExpandOnFocus);
      }
      if (notifyParent) {
        notify({
          type: 'csa-semantic-state',
          rootFolded: state.rootFolded,
          ...status,
          autoExpandOnFocus: state.autoExpandOnFocus
        }, '*');
      }
    }

    function renderScene({ notifyParent = true } = {}) {
      graph = wholeModel ? (state.rootFolded ? buildOverviewGraph : buildWholeModelGraph)(state.expandedCompoundIds, state.collapsedModelIds, state.runtimeGraph)
        : normalizeGraph(sourceGraph, level, state.expandedCompoundIds);
      if (wholeModel && !proModel) graph = layoutReportGraph(prepareReportGraph(graph));
      root.classList.toggle('is-report-architecture', wholeModel && !proModel);
      if (!semanticMode) graph = expandImplementationPrograms(graph, state.expandedPrograms);
      canvas.style.width = `${graph.width}px`;
      canvas.style.height = `${graph.height}px`;
      canvas.innerHTML = '<div class="pto-dv4-architecture__graph is-front"></div>';
      const host = canvas.querySelector('.pto-dv4-architecture__graph');
      const svg = global.PtoModelGraphvizPattern.render(host, graph, {
        width: graph.width,
        height: graph.height,
        ariaLabel: semanticMode ? 'CSA canonical hierarchical semantic graph' : 'DeepSeek V4 Flash CSA distributed operator implementation',
        metricOverlays: false,
        reportOverlays: false,
        performanceHeatmap: { enabled: false },
        colormap: global.PtoModelGraphvizPattern.modelArchitectureColormap(graph, { theme: state.theme }),
        interaction: { panZoom: false, selectable: true, selectableClusters: true },
        selectable: true,
        selectableClusters: true,
        activeNodeId: state.selectedNodeId,
        onSelect(selection) {
          if (!['graph', 'cluster', 'keyboard'].includes(selection.source)) return;
          state.lineageIds = [];
          state.selectedNodeId = selection.nodeId;
          root.classList.remove('has-model-boundary-focus');
          root.classList.toggle('has-csa-selection', Boolean(selection.nodeId));
          syncSelectionColors();
          const node = graph.nodes.find(item => item.id === selection.nodeId)
            || graph.clusters.find(item => item.id === selection.nodeId);
          notify({
            type: 'csa-operator-select',
            nodeId: selection.nodeId,
            label: node?.label || selection.nodeId,
            sourceRefs: node?.sourceRefs || []
          }, '*');
        },
        onToggle({ nodeId, collapsed }) {
          if (wholeModel && state.rootFolded) {
            state.rootFolded = false;
            overviewScopes.forEach(id => state.collapsedModelIds.delete(id));
            proDetailScopes.forEach(id => state.collapsedModelIds.add(id));
          }
          if (wholeModel && !registry.canonicalGraph.compoundIds.includes(nodeId)) {
            const before = graph.nodes.find(item => item.id === nodeId) || graph.clusters.find(item => item.id === nodeId);
            const anchor = before && { x: before.kind === 'module' && graph.nodes.includes(before) ? before.x : before.x + before.width / 2,
              y: graph.nodes.includes(before) ? before.y - before.height / 2 : before.y };
            if (collapsed) state.collapsedModelIds.delete(nodeId);
            else state.collapsedModelIds.add(nodeId);
            renderScene();
            const after = graph.nodes.find(item => item.id === nodeId) || graph.clusters.find(item => item.id === nodeId);
            if (anchor && after) {
              const x = graph.nodes.includes(after) ? after.x : after.x + after.width / 2;
              const y = graph.nodes.includes(after) ? after.y - after.height / 2 : after.y;
              state.panX += (anchor.x - x) * state.zoom;
              state.panY += (anchor.y - y) * state.zoom;
              applyTransform();
            }
            return;
          }
          if (!semanticMode && registry.implementationPrograms[nodeId]) {
            if (collapsed) state.expandedPrograms.add(nodeId);
            else state.expandedPrograms.delete(nodeId);
            renderScene();
            notify({ type: 'csa-operator-select', nodeId }, '*');
            return;
          }
          if (!semanticMode || !registry.canonicalGraph.compoundIds.includes(nodeId)) return;
          if (collapsed) state.expandedCompoundIds.add(nodeId);
          else state.expandedCompoundIds.delete(nodeId);
          renderScene();
          const compound = registry.getNode(nodeId);
          notify({
            type: 'csa-operator-toggle',
            source: 'expansion',
            nodeId,
            label: compound?.label || nodeId,
            sourceRefs: compound?.sourceRefs || []
          }, '*');
        },
        autoFit: false,
        edgeRouting: 'orthogonal',
        edgeMarkerSize: 6,
        edgeCornerRadius: 12,
        initialTransform: { tx: 0, ty: 0, zoom: 1 }
      });
      state.graphController = svg?.ptoModelGraphvizController || null;
      if (wholeModel) global.PtoDv4ArchitecturePattern.decorateFrontGraph(host, graph);
      if (wholeModel && !proModel) decorateReportGraph(host, graph);
      options.onRender?.(host, graph);
      // The shared title defaults to pointer-events:none for pan-only diagrams.
      // Here a selectable scope is an explicit navigation anchor (no visual change).
      host.querySelectorAll('[data-cluster-id][role="button"] > .pto-model-graphviz-cluster-label').forEach(label => {
        label.style.pointerEvents = 'all';
        label.style.cursor = 'pointer';
      });
      // Make the whole visible CSA container a selection target. Child nodes and
      // fold buttons keep their own handlers; clicking blank scope space selects CSA.
      host.querySelectorAll('[data-cluster-id="l1_csa"] > rect:first-child').forEach(rect => {
        rect.style.pointerEvents = 'all';
        rect.style.cursor = 'pointer';
      });
      root.classList.toggle('is-mapping-diff', level === 'l3' && state.mappingDiff);
      graph.nodes.forEach(node => {
        const element = root.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`);
        if (!element) return;
        const item = registry.getNode(node.id);
        element.dataset.entityKind = item?.entityKind || node.entityKind || 'Scope';
        if (node.mappingCode) {
          element.dataset.mappingCode = node.mappingCode.toLowerCase();
          element.setAttribute('aria-description', `${item?.transformTypes?.join(' / ') || node.mappingCode}：${node.mappingReason}`);
        }
        const rect = element.querySelector('rect');
        if (item?.entityKind === 'LogicalState' && rect) {
          rect.setAttribute('stroke-dasharray', '6 5');
          rect.style.stroke = 'var(--foreground-muted)';
        }
      });
      applyLineageFocus();
      syncSelectionColors();
      applyIncrementFocus();
      syncDiffColors();
      applyTransform();
      syncSemanticState({ notifyParent });
    }

    function setTheme(theme) {
      state.theme = theme === 'light' ? 'light' : 'dark';
      document.documentElement.dataset.theme = state.theme;
      renderScene({ notifyParent: false });
    }

    function syncDiffColors() {
      if (level !== 'l3') return;
      const counts = { expanded: 0, state: 0, deploy: 0 };
      root.querySelectorAll('.pto-model-graphviz-node[data-node-id]').forEach(element => {
        const diff = registry.diffFor(element.dataset.nodeId);
        element.dataset.diffCategory = diff.category;
        element.toggleAttribute('data-diff-highlight', state.diffCategories.includes(diff.category));
        if (diff.category in counts) counts[diff.category]++;
      });
      notify({ type: 'csa-diff-counts', counts }, '*');
    }

    function setMappingDiff(enabled, categories = state.diffCategories) {
      state.mappingDiff = level === 'l3' && Boolean(enabled);
      state.diffCategories = Array.isArray(categories) ? categories.filter(value => ['expanded', 'state', 'deploy'].includes(value)) : state.diffCategories;
      root.classList.toggle('is-mapping-diff', state.mappingDiff);
      syncDiffColors();
    }

    function clearSelection({ notifyParent = true } = {}) {
      const hadFocus = Boolean(state.selectedNodeId || state.lineageIds.length || root.classList.contains('has-model-boundary-focus'));
      if (!hadFocus) return;
      state.selectedNodeId = null;
      state.lineageIds = [];
      root.querySelectorAll('[data-lineage-hit]').forEach(element => delete element.dataset.lineageHit);
      state.graphController?.clearSelection();
      root.classList.remove('has-csa-selection', 'has-model-boundary-focus');
      if (notifyParent) {
        notify({ type: 'csa-operator-clear' }, '*');
      }
    }

    function focusModelBoundary() {
      clearSelection({ notifyParent: false });
      root.classList.add('has-model-boundary-focus');
    }

    function setAllCompounds(expanded) {
      if (!semanticMode) return;
      state.rootFolded = false;
      if (proModel) {
        state.collapsedModelIds = proLevelCollapsed(expanded);
        renderScene();
        return;
      }
      if (wholeModel) {
        ['dv4/layer/2', 'dv4/layer/2/mhc_attn', 'dv4/layer/2/mhc_attn/hybrid_attention', 'l1_csa'].forEach(id => state.collapsedModelIds.delete(id));
      }
      state.expandedCompoundIds = new Set(expanded ? registry.canonicalGraph.compoundIds : []);
      const selectedCompound = registry.compoundFor(state.selectedNodeId);
      if (!expanded && selectedCompound) state.selectedNodeId = selectedCompound.id;
      renderScene();
    }

    function focusCompound(compoundId, { autoExpand = state.autoExpandOnFocus } = {}) {
      if (!semanticMode || !registry.canonicalGraph.compoundIds.includes(compoundId)) return;
      state.autoExpandOnFocus = Boolean(autoExpand);
      if (autoExpand) state.expandedCompoundIds.add(compoundId);
      state.selectedNodeId = compoundId;
      renderScene();
      state.graphController?.selectNode(compoundId, { source: 'model' });
    }

    function syncSelectionColors() {
      const keep = new Set(state.lineageIds.length ? state.lineageIds : [state.selectedNodeId].filter(Boolean));
      if (state.lineageIds.length) root.querySelectorAll('.is-model-selected').forEach(el => keep.add(el.dataset.nodeId || el.dataset.clusterId));
      const visit = id => {
        const scope = graph.clusters.find(item => item.id === id);
        [...(scope?.nodes || []), ...(scope?.children || [])].forEach(child => {
          if (!keep.has(child)) { keep.add(child); visit(child); }
        });
      };
      [...keep].forEach(visit);
      root.querySelectorAll('[data-node-id]').forEach(el => {
        el.toggleAttribute('data-selection-keep', keep.has(el.dataset.nodeId));
      });
    }

    function applyLineageFocus() {
      if (!state.lineageIds.length) return;
      state.graphController?.clearSelection();
      const visible = new Map();
      state.lineageIds.forEach(id => {
        const compound = registry.compoundFor(id);
        const programParent = registry.getNode(id)?.parentId;
        let key = semanticMode && compound && !state.expandedCompoundIds.has(compound.id) ? compound.id
          : !semanticMode && registry.implementationPrograms[programParent] && !state.expandedPrograms.has(programParent) ? programParent : id;
        if (wholeModel && ![...graph.nodes, ...graph.clusters].some(item => item.id === key)) {
          key = ['dv4/layer/2', 'dv4/layer/2/mhc_attn', 'dv4/layer/2/mhc_attn/hybrid_attention', 'l1_csa']
            .find(ancestor => graph.nodes.some(node => node.id === ancestor)) || key;
        }
        visible.set(key, (visible.get(key) || 0) + 1);
      });
      root.querySelectorAll('[data-node-id], [data-cluster-id]').forEach(element => {
        const id = element.dataset.nodeId || element.dataset.clusterId;
        element.classList.toggle('is-model-selected', visible.has(id));
        if (visible.has(id)) {
          element.dataset.lineageHit = String(visible.get(id));
          element.setAttribute('aria-description', `命中 ${visible.get(id)} 个源实体；展开可查看，选择不改变另一栏层级。`);
        } else delete element.dataset.lineageHit;
      });
      root.classList.toggle('has-csa-selection', visible.size > 0);
      syncSelectionColors();
    }

    function focusLineage(nodeIds, { autoExpand = false } = {}) {
      state.lineageIds = [...new Set(nodeIds.filter(id => registry.getNode(id) || graph.nodes.some(node => node.id === id) || graph.clusters.some(cluster => cluster.id === id)))];
      state.selectedNodeId = null;
      if (semanticMode && autoExpand && !state.rootFolded) state.lineageIds.forEach(id => {
        const parent = registry.compoundFor(id);
        if (parent) state.expandedCompoundIds.add(parent.id);
        if (wholeModel) ['dv4/layer/2', 'dv4/layer/2/mhc_attn', 'dv4/layer/2/mhc_attn/hybrid_attention', 'l1_csa'].forEach(key => state.collapsedModelIds.delete(key));
      });
      renderScene();
    }

    function applyIncrementFocus() {
      graph.nodes.forEach(node => {
        const item = registry.getNode(node.id);
        const incremental = item?.transformTypes?.some(type => ['MATERIALIZED', 'DEPLOYED', 'SCOPE_INCLUDED'].includes(type));
        const element = root.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`);
        if (element) element.style.opacity = state.increments && !incremental ? '.32' : '';
      });
    }

    function onWheel(event) {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const worldX = (screenX - state.panX) / state.zoom;
      const worldY = (screenY - state.panY) / state.zoom;
      const factor = Math.exp(-event.deltaY * .0012);
      state.zoom = Math.max(.14, Math.min(2.4, state.zoom * factor));
      state.panX = screenX - worldX * state.zoom;
      state.panY = screenY - worldY * state.zoom;
      applyTransform();
    }

    viewport.addEventListener('wheel', onWheel, { passive: false });
    viewport.addEventListener('pointerdown', event => {
      suppressDragClick = false;
      if (
        event.button !== 0
        || event.target.closest('[data-dv4-overlay]')
        || event.target.closest('.pto-model-graphviz-node, button, .pto-model-graphviz-toggle-control')
      ) return;
      state.drag = { x: event.clientX, y: event.clientY, panX: state.panX, panY: state.panY, moved: false };
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('is-dragging');
    }, true);
    viewport.addEventListener('pointermove', event => {
      if (!state.drag) return;
      const deltaX = event.clientX - state.drag.x;
      const deltaY = event.clientY - state.drag.y;
      if (!state.drag.moved && Math.hypot(deltaX, deltaY) < 4) return;
      state.drag.moved = true;
      state.panX = state.drag.panX + deltaX;
      state.panY = state.drag.panY + deltaY;
      applyTransform();
    });
    let suppressDragClick = false;
    viewport.addEventListener('click', event => {
      if (!suppressDragClick) return;
      suppressDragClick = false; event.preventDefault(); event.stopImmediatePropagation();
    }, true);
    const endDrag = event => {
      if (!state.drag) return;
      const shouldClearSelection = event.type === 'pointerup' && !state.drag.moved;
      suppressDragClick = state.drag.moved;
      state.drag = null;
      viewport.classList.remove('is-dragging');
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      if (shouldClearSelection) clearSelection();
    };
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      clearSelection();
    });

    root.querySelector('[data-dv4-fit]').title = '适配所选节点或范围；未选择时适配整图。Shift + 点击适配整图。';
    root.querySelector('[data-dv4-fit]').addEventListener('click', event => fit({ whole: event.shiftKey }));
    root.querySelector('[data-csa-collapse-all]')?.addEventListener('click', () => setAllCompounds(false));
    root.querySelector('[data-csa-expand-all]')?.addEventListener('click', () => setAllCompounds(true));
    autoExpandButton?.addEventListener('click', () => {
      state.autoExpandOnFocus = !state.autoExpandOnFocus;
      syncSemanticState();
    });

    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(viewport);
    document.documentElement.dataset.theme = state.theme;
    renderScene();
    requestAnimationFrame(fit);

    return {
      root,
      get graph() { return graph; },
      refresh() { renderScene({ notifyParent: false }); },
      fit,
      setTheme,
      setMappingDiff,
      clearSelection,
      focusModelBoundary,
      setAllCompounds,
      focusCompound,
      focusLineage,
      setRuntimeGraph(runtimeGraph) {
        state.runtimeGraph = runtimeGraph ? structuredClone(runtimeGraph) : null;
        renderScene({ notifyParent: false });
        fit({ whole: true });
      },
      setIncrements(enabled) { state.increments = Boolean(enabled); applyIncrementFocus(); },
      setAllPrograms(expanded) {
        if (semanticMode) return;
        state.expandedPrograms = new Set(expanded ? registry.defaultExpandedPrograms : []);
        renderScene(); fit({ whole: true });
      },
      setRootFolded(folded) {
        if (state.rootFolded === Boolean(folded)) { syncSemanticState(); return; }
        state.rootFolded = Boolean(folded);
        renderScene(); fit({ whole: true });
      },
      selectNode(nodeId) {
        const selectable = graph.nodes.some(node => node.id === nodeId && node.selectable !== false)
          || graph.clusters.some(cluster => cluster.id === nodeId && cluster.selectable !== false);
        if (!selectable) return;
        state.selectedNodeId = nodeId;
        root.classList.remove('has-model-boundary-focus');
        state.graphController?.selectNode(nodeId, { source: 'source' });
      },
      getState: () => ({
        ...state,
        expandedCompoundIds: [...state.expandedCompoundIds],
        collapsedModelIds: [...state.collapsedModelIds],
        drag: undefined,
        graphController: undefined
      }),
      destroy() {
        resizeObserver.disconnect();
        viewport.removeEventListener('wheel', onWheel);
        root.innerHTML = '';
      }
    };
  }

  global.PtoV4ModelArchitecturePattern = global.PtoCsaImplementationPattern = Object.freeze({ render, buildGraph: normalizeGraph, buildWholeModelGraph, buildOverviewGraph, proLevelCollapsed, expandImplementationPrograms });
})(window);
