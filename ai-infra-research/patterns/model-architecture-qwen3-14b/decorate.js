(function(global){
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
      if (rect && /Residual Add/.test(node.label || '')) {
        const x=Number(rect.getAttribute('x')),y=Number(rect.getAttribute('y'));
        const size=Number(rect.getAttribute('height')),cx=x+size/2,cy=y+size/2;
        el.querySelectorAll('text').forEach(t=>t.remove());
        rect.setAttribute('rx',size/2);rect.setAttribute('ry',size/2);
        rect.style.fill='var(--background)';rect.style.stroke='var(--foreground-secondary)';rect.style.strokeWidth='2';
        const title=make('title',{});title.textContent='Residual Add';el.append(title);
        el.append(make('path',{d:`M ${cx-12} ${cy} h 24 M ${cx} ${cy-12} v 24`,fill:'none',stroke:'var(--foreground)','stroke-width':2.5,'stroke-linecap':'round','pointer-events':'none','aria-label':'Residual Add'}));
      }
      if(rect && !isValue && !isParameter && node.role!=='residual-annotation' && !/Residual Add/.test(node.label||'')){
        const icon=global.PtoOpIconFor?.(node.label||'');
        if(icon){
          const x=Number(rect.getAttribute('x')),cy=Number(rect.getAttribute('y'))+Number(rect.getAttribute('height'))/2;
          const badge=make('g',{'pointer-events':'none','aria-hidden':'true'});
          badge.append(make('circle',{cx:x+38,cy,r:22,fill:'var(--background)'}));
          badge.append(make('path',{d:icon.path,transform:`translate(${x+23} ${cy-15}) scale(1.25)`,fill:'none',stroke:'var(--foreground)','stroke-width':1.8,'stroke-linecap':'round','stroke-linejoin':'round'}));
          el.append(badge);
          const label=el.querySelector('.pto-model-graphviz-node-label');
          
          el.dataset.opIcon=icon.id;
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
        if(node.tensorName){
          el.querySelectorAll('text').forEach(text=>text.remove());
          const cx=Number(rect.getAttribute('x'))+width/2,cy=Number(rect.getAttribute('y'))+height/2;
          const text=make('text',{'text-anchor':'middle','dominant-baseline':'middle','pointer-events':'none',fill:isParameter?'var(--v4-report-parameter)':'var(--v4-report-value)'});
          const name=make('tspan',{x:cx,y:node.tensorDetail?cy-10:cy,'font-size':14,'font-weight':500});name.textContent=node.tensorName;text.append(name);
          if(node.tensorDetail){const detail=make('tspan',{x:cx,y:cy+12,'font-size':12,opacity:'.85'});detail.textContent=node.tensorDetail;text.append(detail);}
          el.append(text);
        }

      }
    });
    graph.edges.forEach(edge => {
      const el = host.querySelector(`[data-source="${CSS.escape(edge.source)}"][data-target="${CSS.escape(edge.target)}"]`);
      if (el) {
        el.dataset.reportFlow = edge.semanticEdgeType === 'parameter' ? 'parameter' : 'activation';
        const residual = edge.semanticEdgeType === 'residual' ? {id:edge.id} : null;
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

global.PtoQwenDecorate=decorateReportGraph;
})(window);
