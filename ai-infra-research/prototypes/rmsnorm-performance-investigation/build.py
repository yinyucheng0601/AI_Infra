from pathlib import Path
import hashlib,json
P=Path(__file__).resolve().parent
R=P.parents[1]
glyph=R/'reports/llm-compute/diagram-legend-library/visual-system.js'
DS=Path('/Users/yin/pto-design-system')
tensor=R/'reports/llm-compute/training-parallel-communication-v1.html'
architecture_paths=[
 'tokens/foundation.css','tokens/semantic.css','tokens/components.css',
 'patterns/aic-core-object/pattern.css','patterns/aiv-core-object/pattern.css',
 'patterns/memory-architecture/pattern.css','patterns/memory-reuse-viewer/pattern.css',
 'patterns/aic-core-object/pattern.js','patterns/aiv-core-object/pattern.js',
 'patterns/memory-architecture/pattern.js','patterns/swimlane-task/pattern.js','patterns/memory-reuse-viewer/pattern.js']
architecture_css='\n'.join((DS/p).read_text() for p in architecture_paths if p.endswith('.css'))
architecture_js='\n'.join((DS/p).read_text() for p in architecture_paths if p.endswith('.js'))
architecture_js=architecture_js.replace("resident: '#58a6ff'","resident: '#858585'").replace("temp: '#3fb950'","temp: '#858585'").replace("loop: '#f0883e'","loop: '#858585'")
architecture_js=architecture_js.replace('rulerStep(plot, capacity) {','rulerStep(plot, capacity) { if(capacity<1024)return Math.max(1,capacity/4);').replace('const kb = bytes / 1024;', 'if(bytes<1024)return `${Math.round(bytes)} B`; const kb = bytes / 1024;').replace('地址 / Buffer offset ->','单次请求尺寸 →').replace("ctx.fillStyle = color;\n        this.roundRect", "ctx.fillStyle = selected ? (/gamma|gQ/.test(tensor.buffer) ? '#BCA0F3' : /rstd|work/.test(tensor.buffer) ? '#F2C45F' : '#B1EF6B') : color;\n        this.roundRect").replace("? this.cssVar('--reuse-viewer-tensor-selected', '#ffaa3b')", "? 'transparent'")
architecture_js=architecture_js.replace('600 12px ${fontFamily}', '600 14px ${fontFamily}')
architecture_js=architecture_js.replace("ctx.fillStyle = this.cssVar('--reuse-viewer-tensor-label', '#0b0d10');", "ctx.fillStyle = selected ? '#111' : '#FFFFFF';")
architecture_js=architecture_js.replace("ctx.strokeStyle = this.cssVar('--reuse-viewer-peak', '#ff4b7b');\n      ctx.lineWidth = 1.5;\n      ctx.globalAlpha = 0.92;", "ctx.strokeStyle = '#FFFFFF';\n      ctx.lineWidth = 2;\n      ctx.globalAlpha = 1;")
architecture_js=architecture_js.replace("ctx.fillStyle = this.cssVar('--reuse-viewer-peak', '#ff4b7b');", "ctx.fillStyle = '#FFFFFF';")
functions=[next(line for line in tensor.read_text().splitlines() if line.startswith('function '+name+'(')) for name in ['dataTiles','tensorNode']]
tensor_js="const GridTensor=(()=>{const B='#B1EF6B',esc=s=>String(s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));const txt=(x,y,t,cls,anchor,color)=>`<text x=\"${x}\" y=\"${y}\" class=\"${cls}\" text-anchor=\"${anchor}\" style=\"fill:${color==='#858585'?'#DDD':color}\">${esc(t)}</text>`;const hit=(key,body)=>body;"+'\n'.join(functions)+";return {render:tensorNode};})();"
glass=R/'methods/design-spatial-systems-ui/assets/liquid-glass-controls'
s=(P/'page.html').read_text().replace('/* COMPARISON_JS */',(P/'comparison.js').read_text())
s=s.replace('/* ARCHITECTURE_CSS */',architecture_css).replace('/* ARCHITECTURE_JS */',architecture_js)
s=s.replace('/* GRID_TENSOR_JS */',tensor_js)
for marker,path in [('GLYPHS_JS',glyph),('GLASS_CSS',glass/'liquid-glass.css'),('GLASS_JS',glass/'liquid-glass.js')]:
    s=s.replace('/* '+marker+' */',path.read_text().replace('</script','<\\/script'))
s=s.replace('/* MODEL_JSON */',(P/'model.json').read_text().replace('</script','<\\/script'))
(P/'index.html').write_text(s)
(P/'provenance.json').write_text(json.dumps({'default_canvas':{'type':'source-ordered execution swimlanes with linked tensor lifetimes','renderer':'comparison.js','sha256':hashlib.sha256((P/'comparison.js').read_bytes()).hexdigest(),'layout':'Device Perf Lane inline resource-row composition adapted to source-order axis; MTE2/Vector/MTE3 and UB lifetimes share coordinates; hardware mapping opens a linked 950B corner window; bottom-left input/implementation/mapping dock; playback removed; queue request lifetimes use actual Alloc/Free records'},'tensor':{'path':str(tensor.relative_to(R)),'sha256':hashlib.sha256(tensor.read_bytes()).hexdigest(),'variant':'tensorNode + dataTiles / text over role grid; shared source uses equal 5-unit inset with square cells and distributed grid gaps','role_colors':{'source':str(glyph.relative_to(R)),'sha256':hashlib.sha256(glyph.read_bytes()).hexdigest(),'mapping':'VisualSystem.tokens.role: activation X/Y, weight gamma, aggregate partials/rstd; selection does not recolor tensors'}},'architecture':{'preset':'ascend950b','upstream_status':'shared-standard','assets':{p:hashlib.sha256((DS/p).read_bytes()).hexdigest() for p in architecture_paths},'reuse':'shared 950B architecture mounted in a small draggable/resizable corner window; event selection drives setPathFocus; inactive topology remains neutral'},'selection_override':'Single host --hi (#D4D4D4), fill and dark text; tensor role colors stay independent','queue_overview_adapter':'Five shared Memory Reuse Viewer instances in one horizontal figure with identical source-step axes, per-queue relative-size coordinates and unified toolbar. Local delivery adapter uses neutral kind tones, formats sub-KiB sizes in B and uses fill selection; shared upstream files unchanged.','patterns':[{'path':'/Users/yin/PyPTO3-main/Design/device-perf-lane/index-pipeline-merged.html','sha256':hashlib.sha256(Path('/Users/yin/PyPTO3-main/Design/device-perf-lane/index-pipeline-merged.html').read_bytes()).hexdigest(),'reuse':'reference composition: resource lanes as main stage; in-place expansion, shared axis, selected dependency links; source-order event scale adapted independently'},{'path':'prototypes/logsumexp-case5/page.html','reuse':'viewport state, pointer zoom, pan, fit, overlay and source window mechanisms adapted to RMSNorm'}]},indent=2))
print('Built standalone index.html')
