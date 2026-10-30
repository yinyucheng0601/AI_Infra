"""Build offline tools from pinned, read-only checkouts. Does not run upstream code."""
import argparse,hashlib,json,pathlib,subprocess
parser=argparse.ArgumentParser()
parser.add_argument("--refresh-evidence",action="store_true")
args=parser.parse_args()
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_shared'))
from demo_ui import enhance
ROOT=pathlib.Path(__file__).resolve().parent
BASE=ROOT.parents[1]
SOURCES={
 'unpack':('heiheiha798/Ascend-Kernels-S8','/private/tmp/compute-trial-unpack', [('host','op/Unpack/op_host/unpack.cpp',25,86),('schedule','op/Unpack/op_kernel/unpack.cpp',95,162),('copy','op/Unpack/op_kernel/unpack.cpp',271,312),('matrix','op/Unpack/op_kernel/unpack.cpp',317,392)]),
 'expand':('wybxw/Ascend_ops_Base_S6','/private/tmp/compute-trial-expand',[('host','Expand/op_host/expand.cpp',14,64),('stages','Expand/op_kernel/expand.cpp',96,151),('copy','Expand/op_kernel/expand.cpp',206,265),('copy-request','Expand/op_kernel/expand.cpp',144,263)]),
}
if args.refresh_evidence or not (ROOT/'evidence.json').exists():
 data={'sources':{}}
 for key,(repo,directory,entries) in SOURCES.items():
  p=pathlib.Path(directory); rev=subprocess.check_output(['git','-C',str(p),'rev-parse','HEAD'],text=True).strip()
  evidence=[]
  for name,file,start,end in entries:
   raw=(p/file).read_text(); lines=raw.splitlines()
   evidence.append(dict(id=name,file=file,start=start,end=end,text='\n'.join(f'{i+1:4}  {line}' for i,line in enumerate(lines) if start<=i+1<=end),url=f'https://github.com/{repo}/blob/{rev}/{file}#L{start}-L{end}',sha256=hashlib.sha256(raw.encode()).hexdigest()))
  data['sources'][key]=dict(repo=repo,revision=rev,evidence=evidence)
 glyph=BASE/'reports/llm-compute/diagram-legend-library/visual-system.js'
 data['glyphs']={'source':str(glyph.relative_to(BASE)),'sha256':hashlib.sha256(glyph.read_bytes()).hexdigest(),'variants':['data/collapsed','node/task','edge/mapping'],'matrix':'domain-generated exact element grid; not an abstract Tensor glyph'}
 (ROOT/'evidence.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
else:
 data=json.loads((ROOT/'evidence.json').read_text())
sync=json.loads((ROOT/'unpack-sync.json').read_text())
assert sync['revision']==data['sources']['unpack']['revision']
assert all(e['sha256']==sync['sourceSha256'] for e in data['sources']['unpack']['evidence'] if '/op_kernel/' in e['file'])
assert hashlib.sha256(sync['source'].encode()).hexdigest()==sync['sourceSha256']
data['unpackSync']=sync
op_library=BASE/'reports/llm-compute/diagram-legend-library'
op_lines=(op_library/'build.cjs').read_text().splitlines()
op_adapter=(op_library/'op-icons.js').read_text()+'\n'+ '\n'.join(next(line for line in op_lines if line.startswith('const '+name+'=')) for name in ['opGlyph','opNode'])+'\n'
sync['glyphs']={'opRendererSha256':hashlib.sha256((op_library/'build.cjs').read_bytes()).hexdigest(),'iconsSha256':hashlib.sha256((op_library/'op-icons.js').read_bytes()).hexdigest(),'mapping':{'TransDataTo5HD':'OP / transpose','Gather':'OP / indexed lookup icon (embedding path reused; label remains Gather)' ,'DataCopyPad':'instruction / source API action','Set / Wait':'instruction / source API action'}}
lines=sync['source'].splitlines()
def sync_excerpt(ident,start,end):
 return dict(id=ident,file='op/Unpack/op_kernel/unpack.cpp',start=start,end=end,text='\n'.join(f'{i+1:4}  {v}' for i,v in enumerate(lines) if start<=i+1<=end),url=sync['origin']+f'#L{start}-L{end}',sha256=sync['sourceSha256'])
entries=[('sync-dispatch',630,670),('sync-L366',346,391),('sync-L430',412,433),('sync-L554',518,591)]
for route,steps in {'compact':{'copy-in':(395,409),'ready':(204,225),'compute':(412,425),'visible':(227,246),'copy-out':(423,433),'fallback':(490,513)},'packed':{'copy-in':(539,555),'ready':(550,555),'compute':(557,575),'visible':(574,577),'copy-out':(578,591),'fallback':(518,537)}}.items():
 for key,(start,end) in steps.items():entries.append(('sync-step-'+route+'-'+key,start,end))
data['sources']['unpack']['evidence']=[e for e in data['sources']['unpack']['evidence'] if not e['id'].startswith('sync-')]+[sync_excerpt(*e) for e in entries]
glyph=BASE/'reports/llm-compute/diagram-legend-library/visual-system.js'
glass=BASE/'methods/design-spatial-systems-ui/assets/liquid-glass-controls'
for key in ['unpack','expand']:
 template=(ROOT/'spatial.html').read_text().replace('/*__SYNC_MODEL__*/',(ROOT/'sync-model.js').read_text()).replace('/*__OP_RENDERER__*/',op_adapter)
 tutorial=(ROOT/'tutorial.html').read_text()
 topic='拆分索引、输出布局与任务核分配' if key=='unpack' else '广播索引、阶段缓冲与对齐请求范围'
 tutorial=tutorial.replace('遇到难以用文字核对的索引与布局关系时，让 agent 生成调查视图，再带着选择回到源码。','围绕'+topic+'建立可点选的证据链，减少索引换算与源码定位的往返。').replace('[算子仓库 / 算子 / 用例]',SOURCES[key][0]+' / '+key.title()+' / 当前配置')
 if key=='unpack':
  tutorial=tutorial.replace('<h3>2 · 点选后，带证据继续调查</h3>', '<h3>2 · 点选后，带证据继续调查</h3><p>右上角核查入口保留全部同步候选。点选候选可跳到已绑定的 shape 与 Task，并展开同步路径；点选步骤查看源码。没有可达预设的候选直接查看源码，不虚构配置关联。</p>')
  tutorial=tutorial.replace('<h3>实现流程与 Skill 分工</h3>', (ROOT/'sync-tutorial.html').read_text()+'<h3>实现流程与 Skill 分工</h3>')
  tutorial=tutorial.replace('当前更适合验证已有假设；这是固定案例 HTML，尚无通用工具调用入口，也不能替代设备运行或 profiling。', '现在既可核对索引假设，也可从静态扫描候选发起同步调查；页面展示已保存的扫描结果，不能替代设备运行或 profiling。')
 template=template.replace('/*__TUTORIAL_HTML__*/',tutorial).replace('/*__TUTORIAL_CSS__*/',(ROOT/'tutorial.css').read_text())
 template=template.replace('/*__GLASS_CSS__*/','/*\n'+(glass/'LICENSE').read_text()+'\n*/\n'+(glass/'liquid-glass.css').read_text()).replace('/*__GLASS_JS__*/',(glass/'liquid-glass.js').read_text())
 html=template.replace('/*__GLYPHS__*/',glyph.read_text()).replace('/*__MODEL__*/',(ROOT/'model.js').read_text()).replace('/*__DATA__*/','const DATA='+json.dumps(data,ensure_ascii=False).replace('</','<\\/')+';').replace('__INITIAL__',key)
 html=enhance(html,'compute')
 (ROOT/f'{key}.html').write_text(html)
(ROOT/'index.html').write_text((ROOT/'unpack.html').read_text())
print('Built Unpack / Expand and index.')
