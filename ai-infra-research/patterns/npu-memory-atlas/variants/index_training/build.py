"""Create the independent training host from approved existing UI sources.
No source page is changed. Layout/semantic adapters remain separately authored.
"""
from pathlib import Path
import hashlib, json, re, subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
V = HERE.parent
sources = []
def read(path):
    p = ROOT / path
    data = p.read_text()
    revision = None
    if path == 'layer_stack/inference-layer-stack.html':
        # The workspace's default-model edits are unrelated to these components.
        # Pin the published source if the two consumed excerpts are identical.
        revision = subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
        committed = subprocess.check_output(['git','show',revision+':'+path],cwd=ROOT,text=True)
        def excerpts(text):
            return (text[text.index('<div class="view-dial"'):text.index('<section id="identity"')],
                    text[text.index('function setRankPrimary(value,animate=true){'):text.index("get('rank-return').onclick=",text.index('function setRankPrimary(value,animate=true){'))])
        if excerpts(committed) == excerpts(data):
            data = committed
        else:
            revision = None
    source = {'path':path,'sha256':hashlib.sha256(data.encode()).hexdigest()}
    if revision: source['revision']=revision
    sources.append(source)
    return data
def change(s, old, new):
    assert old in s, old[:120]
    return s.replace(old, new)

html = read('ai-infra-research/patterns/npu-memory-atlas/variants/index_comm.html')
legacy_glass=[m.group(0) for m in re.finditer(r'<script>([\s\S]*?)</script>',html) if 'function syncGlass()' in m.group(1) and 'function createLiquidGlass(' in m.group(1)]
assert len(legacy_glass)==1
html=html.replace(legacy_glass[0],'')
# Strip the copied host's obsolete material skins, retaining its geometry,
# typography, layout and interaction rules. v2 owns glass appearance.
def clean_host_material(match):
    css=match.group(1)
    css=re.sub(r'/\* Readability tuning:[\s\S]*?(?=#config-status:empty)', '', css)
    css=re.sub(r'@supports not [^{]+\{\s*\.bar,\.rank-settings>button,\.rank-settings-panel,\.shard-inspector,#tensor-list\{[^}]*\}\s*\}', '', css)
    surfaces={'.bar','.rank-settings>button','.rank-settings-panel','.shard-inspector','#tensor-list'}
    def clean_rule(rule):
        selectors,body=rule.groups()
        bare=re.sub(r'/\*[\s\S]*?\*/','',selectors).strip()
        if not all(s.strip() in surfaces for s in bare.split(',')):
            return rule.group(0)
        body=re.sub(r'(?:^|;)\s*(?:background|background-color|border|border-color|box-shadow|backdrop-filter|-webkit-backdrop-filter)\s*:[^;]+(?=;|$)', '', body)
        return selectors+'{'+body+'}' if body.strip(' ;\n') else ''
    css=re.sub(r'([^{}]+)\{([^{}]*)\}',clean_rule,css)
    css=css.replace(';--ui-blur:blur(24px)','').replace('/* Shared glass chrome, distinct from the strong scene geometry. */','/* Shared control geometry and typography; material comes from v2. */')
    return '<style>'+css+'</style>'
html=re.sub(r'<style>([\s\S]*?)</style>',clean_host_material,html)
for name in ('liquid-glass.js','liquid-glass.css','LICENSE'):
 (HERE/('liquid-glass-LICENSE' if name=='LICENSE' else name)).write_text(read('ai-infra-research/patterns/liquid-glass-controls/'+name))
html = change(html, '<title>128 Rank · 显存与排布</title>', '<title>训练可视化 整合新版</title>')
html = change(html, 'index_comm/ep-model.js?v=06689a880884', 'index_training/ep-model.js')
html = change(html, 'index_comm/rank-workbench.js?v=b167254d1f46', 'index_training/rank-workbench.js')
html=change(html,"document.querySelector('nav[aria-label=\"视图操作\"]').getBoundingClientRect().top","document.getElementById('ep-playback').getBoundingClientRect().top")
html = change(html, '</head>', '<link rel="stylesheet" href="index_training/composition.css"><link rel="stylesheet" href="index_training/liquid-glass.css"></head>')
html = change(html, '<script src="index_training/rank-workbench.js">', '<script src="../../../patterns/training-graph/expert-glyph.js"></script><script src="../../../patterns/training-graph/graph-layout.js"></script><script src="index_training/model.js"></script><script src="index_training/training-clock.js"></script><script src="index_training/full-graph-source.js"></script><script src="index_training/full-graph-adapter.js"></script><script src="index_training/graph-renderer-source.js"></script><script src="index_training/stack-face-source.js"></script><script src="index_training/stack-geometry-source.js"></script><script src="index_training/stack-rails.js"></script><script src="index_training/rank-workbench.js">')
html = change(html, '</body>', '<script src="index_training/reference-ui.js"></script><script src="index_training/composition.js"></script><script src="index_training/liquid-glass.js"></script><script src="index_training/glass-adapter.js"></script></body>')
# The host already uses lanes (CP folded into DP); EP keeps CP fixed.
html = change(html, 'r.pp,r.edp,r.tp,layer,', 'r.pp,r.cp,r.edp,r.tp,layer,')
html = change(html, 'pp:r.pp,edp:r.edp,tp:r.tp,layer:', 'pp:r.pp,edp:Math.floor(r.dpIndex/EP),tp:r.tp,layer:')
html = change(html, 'etp:ETP,layers:L,', 'etp:ETP,cp:atlasConfig.cp,cpIndex:r.cp,dataDP:RankAtlasModel.dpReplica(atlasConfig),layers:L,')
html = change(html, 'RankAtlasModel.moeLayer(id,atlasConfig);', 'RankAtlasModel.moeLayer(id,atlasConfig,window.TrainingComposition?.layer??null);')

ep=read('ai-infra-research/patterns/npu-memory-atlas/variants/index_comm/ep-model.js')
ep=change(ep, "function coordinates(id,c=baseline){return {id,tp:id%c.tp,dp:Math.floor(id/c.tp)%c.dp,pp:Math.floor(id/(c.tp*c.dp)),ep:Math.floor(id/c.tp)%c.dp%c.ep,edp:Math.floor((Math.floor(id/c.tp)%c.dp)/c.ep)};}", "function coordinates(id,c=baseline){const lane=Math.floor(id/c.tp)%c.dp, d=c.dataDP||c.dp/(c.cp||1),dpIndex=lane%d;return {id,tp:id%c.tp,dp:lane,dpIndex,cp:Math.floor(lane/d),pp:Math.floor(id/(c.tp*c.dp)),ep:dpIndex%c.ep,edp:Math.floor(dpIndex/c.ep)};}")
ep=change(ep, '(pp*c.dp+edp*c.ep+e)*c.tp+tp', '(pp*c.dp+(c.cpIndex||0)*(c.dataDP||c.dp/(c.cp||1))+edp*c.ep+e)*c.tp+tp')
(HERE/'ep-model.js').write_text(ep)

wb=read('ai-infra-research/patterns/npu-memory-atlas/variants/index_comm/rank-workbench.js')
wb=change(wb, "return '<div class=\"cg-context\">R'", "return '<div class=\"cg-context\">R'") # retained compact identity
wb=change(wb, "+'</div><div class=\"cg-viewport\">'+graph.html+'</div>'+expertMarkup(search);", "+'</div><div class=\"cg-viewport\">'+graph.html+'</div>';")
wb=change(wb, "selected:state.graphComm});", "selected:state.graphComm,config:atlasConfig,rank:selectedRank});")
wb=change(wb, "if(/^e\\s*\\d+$/i.test(search))return expertMarkup(search);", "if(/^e\\s*\\d+$/i.test(search)){window.TrainingGraphState.searchExpert=Number(search.replace(/\\D/g,''));search='';}else window.TrainingGraphState.searchExpert=null;")
wb=change(wb, "'激活 · 绿 / 参数 · 紫 / 梯度 · 青。选择 tensor 定位内存区域，选择通信节点查看关联 Rank。'", "''")
wb=change(wb, "<span>STRUCTURE / COMMUNICATION</span>", "")
wb=change(wb, "selectedRank=Math.floor(l/(L/PP))*TP*DP+selectedRank%(TP*DP);", "selectedRank=Math.floor(l/(L/PP))*TP*DP+selectedRank%(TP*DP);")
bridge="""
 window.TrainingWorkbench={
  get state(){return state;},get camera(){return {...graphCamera};},get relation(){return graphRelation?{...graphRelation,members:[...graphRelation.members]}:null;},
  setLayer(layer){const span=L/PP;selectedRank=Math.floor(layer/span)*TP*DP+selectedRank%(TP*DP);relationRank=selectedRank;state.layer=layer;state.inspect=false;state.op=null;state.expert=null;state.graphComm=null;clearGraphSelection();rebuildQuery();render();},
  refreshGraph(){graphContext='';rebuildQuery();render();},
  closeGraph(){toggleGraphDrawer(false);graphButton.focus();},
  setGraph(open){toggleGraphDrawer(open);},
  selectGraphNode,clearGraphSelection,focusMoe:focusTrainingMoe,setGraphWidth:resizeDrawer,
  hideDetails(){state.inspect=false;shardInfoOpen=false;render();},
  graphFit(){graphCamera.zoom=1;graphCamera.x=0;graphCamera.y=0;applyGraphCamera();}
 };
"""
wb=change(wb, ' window.RankWorkbench={', (HERE/'graph-focus.js').read_text()+'\n'+bridge+' window.RankWorkbench={')
wb=change(wb,"query.style.width=drawerWidth+'px';","query.style.width=drawerWidth+'px';document.documentElement.style.setProperty('--training-graph-edge',(query.getBoundingClientRect().right+12)+'px');")
wb=change(wb,'graphNotes=graph.notes;',"graphNotes=graph.notes;const linked=graphNotes[state.graphComm]?.communication;graphRelation=linked?.enabled?linked:null;")
wb=change(wb,'relationRank=selectedRank;\n   rebuildQuery();render();return;',"relationRank=selectedRank;playing=false;scope='all';\n   rebuildQuery();render();if(graphRelation)window.dispatchEvent(new CustomEvent('training:communication-selected',{detail:{key,members:[...graphRelation.members]}}));return;")
wb=change(wb, "}else {graphRelation=null;state.graphComm=null;graphContext='';}", "}else {graphRelation=null;graphContext='';}")
wb=change(wb, "const key=JSON.stringify([selectedRank,state.layer,state.graphComm,atlasConfig]);", "const key=JSON.stringify([selectedRank,state.layer,state.graphComm,atlasConfig,Math.min(atlasConfig.ga-1,Math.floor(simTime/3500)),RankAtlasModel.memory(selectedRank,atlasConfig,simTime).active]);")
wb=wb.replace("note.communication.members.map(id=>'R'+id).join('、')", "note.communication.members.slice(0,8).map(id=>'R'+id).join('、')+(note.communication.members.length>8?' 等 '+note.communication.members.length+' Rank':'')")
wb=wb.replace("note.communication.expertMembers.map(id=>'R'+id).join('、')", "note.communication.expertMembers.slice(0,8).map(id=>'R'+id).join('、')+(note.communication.expertMembers.length>8?' 等 '+note.communication.expertMembers.length+' Rank':'')")
wb=change(wb, "const width=1330/graphCamera.zoom,height=width*box.height/box.width;", "const layout=svg.dataset.layoutKey+':'+(innerWidth<600?'narrow':'wide');if(svg.dataset.layoutKey!==undefined&&graphCamera.layout!==layout){graphCamera.layout=layout;graphCamera.zoom=innerWidth<600&&!graphCamera.overview?(Number(svg.dataset.width)>1330?8:3.4):Math.min(1,1330*box.height/box.width/Number(svg.dataset.height));graphCamera.x=innerWidth<600&&!graphCamera.overview?(1330-1330/graphCamera.zoom)/2:0;graphCamera.y=0;}const width=1330/graphCamera.zoom,height=width*box.height/box.width;")
wb=change(wb, "graphFit(){graphCamera.zoom=1;graphCamera.x=0;graphCamera.y=0;applyGraphCamera();}", "graphFit(){cancelGraphFocus();graphCamera.layout=null;graphCamera.overview=true;graphCamera.zoom=1;graphCamera.x=0;graphCamera.y=0;applyGraphCamera();},resizeGraph(){graphCamera.layout=null;graphCamera.overview=false;applyGraphCamera();}")
wb=change(wb,"svg.setAttribute('viewBox',`${graphCamera.x} ${graphCamera.y} ${width} ${height}`);", "const searchKey=svg.dataset.searchKey||'';if(searchKey&&graphCamera.searchKey!==searchKey){graphCamera.searchKey=searchKey;graphCamera.zoom=6;graphCamera.x=Number(svg.dataset.focusX)-graphWidth()/graphCamera.zoom/2;graphCamera.y=Number(svg.dataset.focusY)-60;applyGraphCamera();return;}graphCamera.searchKey=searchKey;svg.setAttribute('viewBox',`${graphCamera.x} ${graphCamera.y} ${width} ${height}`);")
wb=change(wb, "const graphHost=$('operator-path');", """const graphHost=$('operator-path');
 graphHost.addEventListener('focusin',e=>{
  const node=e.target.closest('.cg-hit'),surface=graphSurface();if(!node||!surface)return;
  const box=node.getBoundingClientRect(),view=surface.getBoundingClientRect();
  if(box.left>=view.left&&box.right<=view.right&&box.top>=view.top&&box.bottom<=view.bottom)return;
  const scale=(1330/graphCamera.zoom)/view.width;
  graphCamera.x+=(box.left+box.width/2-view.left-view.width/2)*scale;
  graphCamera.y+=(box.top+box.height/2-view.top-view.height/2)*scale;applyGraphCamera();
 });""")
# The complete source graph is wider than the former 1330-unit outline.
wb=change(wb,"function graphSurface(){return $('operator-path').querySelector('.cg-viewport > svg');}","function graphSurface(){return $('operator-path').querySelector('.cg-viewport > svg');}function graphWidth(){return Number(graphSurface()?.dataset.width)||1330;}")
wb=wb.replace('1330/graphCamera.zoom','graphWidth()/graphCamera.zoom').replace('1330*box.height','graphWidth()*box.height')
wb=change(wb,"graphCamera.x=innerWidth<600&&!graphCamera.overview?(1330-graphWidth()/graphCamera.zoom)/2:0;graphCamera.y=0;", "const focus=Number(svg.dataset.focusX)||358,left=Number(svg.dataset.left)||0;graphCamera.x=innerWidth<600&&!graphCamera.overview?focus-graphWidth()/graphCamera.zoom/2:left+(graphWidth()-graphWidth()/graphCamera.zoom)/2;graphCamera.y=0;")
wb=change(wb,'function toggleGraphDrawer(open){state.query=open;', 'function toggleGraphDrawer(open){if(!open)cancelGraphFocus();state.query=open;')
wb=change(wb,"graphHost.addEventListener('wheel',e=>{", "graphHost.addEventListener('wheel',e=>{cancelGraphFocus();")
wb=change(wb,"graphHost.addEventListener('pointerdown',e=>{", "graphHost.addEventListener('pointerdown',e=>{cancelGraphFocus();")
# Do not reduce an all-expert diagram to a bucket search result.
wb=change(wb,"window.TrainingGraphState.searchExpert=Number(search.replace(/\\D/g,''));search='';", "window.TrainingGraphState.searchExpert=Number(search.replace(/\\D/g,''));search='';")
wb=change(wb, "return '<div class=\"cg-context\">R'+selectedRank+' · L'+current+' · '+(current<atlasConfig.dense?'Dense':'MoE')+(weight?.layer===current?' · '+esc(weight.label)+' · '+weight.scope:'')+'</div><div class=\"cg-viewport\">'+graph.html+'</div>';", "query.querySelector('.graph-query-head strong').textContent='L'+current+' · R'+selectedRank+' · '+(current<atlasConfig.dense?'Dense 计算图':'专家分布');return '<div class=\"cg-viewport\">'+graph.html+'</div>';")
wb=change(wb,"$('operator-path').innerHTML=graphMarkup(l,search);", "const markup=graphMarkup(l,search),template=document.createElement('template');template.innerHTML=markup;const oldSurface=graphSurface(),newSurface=template.content.querySelector('.training-full-source');if(oldSurface?.classList.contains('training-full-source')&&newSurface){patchGraphElement(oldSurface,newSurface,{unchanged:0,updated:0,reused:0,created:0,removed:0});}else $('operator-path').innerHTML=markup;")
# Main page keeps Token communication in its existing scene. Low-frequency
# spatial navigation remains available in the host menu, but does not fork state.
wb=change(wb, "window.location.href='index_communication.html#'+transfer.toString();", "openTokenCommunication();if(fault){viewMode='Front';epIncidentActive=true;render();}")
wb=change(wb, "['comm-space','空间通信图 ↗','独立页面 · 查看空间通信关系',openCommunication]", "['comm-space','空间通信图','当前画布 · 查看 Rank 通信关系',()=>{openTokenCommunication();}]")
(HERE/'rank-workbench.js').write_text(wb)

# Copy the approved helper implementations verbatim; namespacing is in adapter.
infer=read('layer_stack/inference-layer-stack.html')
swap=infer[infer.index('function setRankPrimary(value,animate=true){'):infer.index("get('rank-return').onclick=",infer.index('function setRankPrimary(value,animate=true){'))]
# The host adapter reuses the algorithm; do not ship an unused second runtime.
if (HERE/'swap-source.js').exists(): (HERE/'swap-source.js').unlink()
read('layer_stack/inference-layer-stack.css')
read('layer_stack/pangu-layer-stack_2.html')
read('ai-infra-research/patterns/training-graph/expert-glyph.js')
read('ai-infra-research/patterns/training-graph/graph-layout.js')
help=read('ai-infra-research/prototypes/logsumexp-case5/page.html')
style='\n'.join(re.findall(r'[^\n]*\.usage-window[^\n]*',help))
(HERE/'help-source.css').write_text(style)
sources.append({'path':'ai-infra-research/patterns/expand-broadcast-inspector/index.html','sha256':hashlib.sha256((ROOT/'ai-infra-research/patterns/expand-broadcast-inspector/index.html').read_bytes()).hexdigest()})
menu=(ROOT/'ai-infra-research/patterns/expand-broadcast-inspector/index.html').read_text()
menu_css=menu[menu.index('.config-trigger{'):menu.index('.audit-toggle{')]
# Remove the source's focus ring, following this checkout's fill-only contract.
menu_css=menu_css.replace('box-shadow:inset 0 0 0 1px #888','background:var(--ui-hover)')
(HERE/'menu-source.css').write_text(menu_css)
import runpy
runpy.run_path(str(HERE/'reference-build.py'),init_globals={'HERE':HERE,'ROOT':ROOT,'read':read})
(HERE/'provenance.json').write_text(json.dumps({'sources':sources,'note':'Source UI reused; independent semantic and layout adapters. No measured training trace.'},ensure_ascii=False,indent=2)+'\n')
version=hashlib.sha256(b''.join(p.read_bytes() for p in sorted(HERE.iterdir()) if p.suffix in ('.js','.css','.py') and not p.name.startswith('verify-') and p.name!='preview.py')).hexdigest()[:12]
html=re.sub(r'((?:src|href)="index_training/[^"?]+)',lambda m:m[1]+'?v='+version,html)
(V/'index_training.html').write_text(html)
print('Built independent training host and source adapters')
