(function (global) {
  'use strict';
  const box = n => ({left:n.x-n.width/2,right:n.x+n.width/2,top:n.y-n.height/2,bottom:n.y+n.height/2});
  // Orthogonal visibility-grid router. Each edge owns its ports and segments;
  // obstacles are actual node bounds plus clearance, not container rectangles.
  function route(graph, alignedPorts = true, attempt = 0) {
    const nodes=new Map(graph.nodes.map(n=>[n.id,n]));
    const edges=graph.edges.filter(e=>e.id.startsWith('official/')&&nodes.has(e.source)&&nodes.has(e.target));
    const all=graph.nodes.filter(n=>n.role!=='residual-annotation');
    const groups=new Map(), requests=[];
    for(const e of edges) {
      const a=nodes.get(e.source),b=nodes.get(e.target);
      const horizontal=e.sideInput || Math.abs(a.x-b.x)>100 && (Math.abs(a.y-b.y)<1 || e.semanticEdgeType==='parameter');
      const sa=horizontal?(b.x>a.x?'right':'left'):'bottom';
      const ta=horizontal?(b.x>a.x?'left':'right'):'top';
      const r={e,a,b,sa,ta};requests.push(r);
      for(const [n,side,key] of [[a,sa,'start'],[b,ta,'end']]) {
        const id=n.id+':'+side;
        if(!groups.has(id))groups.set(id,[]);
        groups.get(id).push({r,n,side,key,other:key==='start'?b:a});
      }
    }
    const normal={left:[-1,0],right:[1,0],top:[0,-1],bottom:[0,1]};
    for(const entries of groups.values()) {
      entries.forEach(v=>{
        const horizontal=v.side==='left'||v.side==='right';
        const offset=0;
        const d=normal[v.side];
        const p={x:v.n.x+d[0]*v.n.width/2+(horizontal?0:offset),y:v.n.y+d[1]*v.n.height/2+(horizontal?offset:0)};
        v.r[v.key]=p;v.r[v.key+'Outer']={x:p.x+d[0]*24,y:p.y+d[1]*24};
      });
    }
    let xs=[],ys=[];
    for(const n of all) {const b=box(n);xs.push(b.left-8,b.left-12,b.left-32,b.left-48,b.left-16,b.left-24,b.left-40,b.right+8,b.right+12,b.right+32,b.right+48,b.right+16,b.right+24,b.right+40);ys.push(b.top-8,b.top-12,b.top-32,b.top-48,b.top-16,b.top-24,b.top-40,b.bottom+8,b.bottom+12,b.bottom+32,b.bottom+48,b.bottom+16,b.bottom+24,b.bottom+40);}
    for(const r of requests) for(const p of [r.startOuter,r.endOuter]){xs.push(p.x);ys.push(p.y);}
    xs.push(Math.min(...xs)-64,Math.max(...xs)+64);ys.push(Math.min(...ys)-64,Math.max(...ys)+64);
    xs=[...new Set(xs)].sort((a,b)=>a-b);ys=[...new Set(ys)].sort((a,b)=>a-b);
    const nx=xs.length,ny=ys.length,blocked=new Uint8Array(nx*ny),used=new Map();
    const obstacles=all.map(n=>box(n));
    for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)if(obstacles.some(b=>xs[x]>b.left-10&&xs[x]<b.right+10&&ys[y]>b.top-10&&ys[y]<b.bottom+10))blocked[y*nx+x]=1;
    const segment=(a,b)=>a<b?a+':'+b:b+':'+a;
    function search(start,end,request) {
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
          const id=yy*nx+xx;if(blocked[id]||(used.get(segment(cur.id,id))||[]).some(owner=>owner.e.source!==request.e.source&&owner.e.target!==request.e.target))continue;
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
    if(attempt) requests.sort((a,b)=> ((Number(a.e.id.replace(/\D/g,''))* (attempt*7919+104729))%100003)-((Number(b.e.id.replace(/\D/g,''))*(attempt*7919+104729))%100003));
    const failures=[];
    for(const r of requests) {
      const a=r.start,b=r.end;
      const straight=(a.x===b.x||a.y===b.y)&&!all.some(n=>{
        if(n.id===r.a.id||n.id===r.b.id)return false;const q=box(n);
        return a.x===b.x?a.x>q.left-10&&a.x<q.right+10&&Math.min(a.y,b.y)<q.bottom+10&&Math.max(a.y,b.y)>q.top-10:a.y>q.top-10&&a.y<q.bottom+10&&Math.min(a.x,b.x)<q.right+10&&Math.max(a.x,b.x)>q.left-10;
      });
      if(straight){Object.assign(r.e,{sourcePoint:a,targetPoint:b,waypoints:[]});continue;}
      const path=search(r.startOuter,r.endOuter,r);
      if(!path){failures.push(r.e.id);continue;}
      path.slice(1).forEach((id,i)=>used.set(segment(path[i],id),[...(used.get(segment(path[i],id))||[]),r]));
      const pts=[r.start,...path.map(id=>({x:xs[id%nx],y:ys[Math.floor(id/nx)]})),r.end];
      const clean=pts.filter((p,i)=>!i||p.x!==pts[i-1].x||p.y!==pts[i-1].y);
      const turns=clean.filter((p,i)=>i===0||i===clean.length-1||!((clean[i-1].x===p.x&&p.x===clean[i+1].x)||(clean[i-1].y===p.y&&p.y===clean[i+1].y)));
      Object.assign(r.e,{sourcePoint:r.start,targetPoint:r.end,waypoints:turns.slice(1,-1)});
    }
    if (failures.length && alignedPorts) return route(graph,false,attempt);
    if (failures.length && attempt < 8) return route(graph,false,attempt+1);
    graph.metadata={...graph.metadata,routingFailures:failures};
  }
  global.PtoArchitectureRouting={route};
})(typeof window!=='undefined'?window:globalThis);

