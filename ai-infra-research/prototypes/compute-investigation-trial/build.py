"""Build offline tools from pinned, read-only checkouts. Does not run upstream code."""
import argparse,hashlib,json,pathlib,subprocess
parser=argparse.ArgumentParser()
parser.add_argument("--refresh-evidence",action="store_true")
args=parser.parse_args()
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
glyph=BASE/'reports/llm-compute/diagram-legend-library/visual-system.js'
glass=BASE/'methods/design-spatial-systems-ui/assets/liquid-glass-controls'
for key in ['unpack','expand']:
 template=(ROOT/'spatial.html').read_text()
 template=template.replace('/*__GLASS_CSS__*/','/*\n'+(glass/'LICENSE').read_text()+'\n*/\n'+(glass/'liquid-glass.css').read_text()).replace('/*__GLASS_JS__*/',(glass/'liquid-glass.js').read_text())
 html=template.replace('/*__GLYPHS__*/',glyph.read_text()).replace('/*__MODEL__*/',(ROOT/'model.js').read_text()).replace('/*__DATA__*/','const DATA='+json.dumps(data,ensure_ascii=False).replace('</','<\\/')+';').replace('__INITIAL__',key)
 (ROOT/f'{key}.html').write_text(html)
(ROOT/'index.html').write_text((ROOT/'unpack.html').read_text())
print('Built Unpack / Expand and index.')
