"""Check shipped entries and inline syntax; not a browser or optical test."""
from pathlib import Path
import re,json,subprocess,hashlib
R=Path(__file__).resolve().parent.parent
FILES=['logsumexp-case5/index.html','compute-investigation-trial/index.html','compute-investigation-trial/unpack.html','compute-investigation-trial/expand.html','unpack-case3/index.html','scale-investigation-trial/index.html','rsfa-performance-trial/index.html']
rows=[]
for file in FILES:
 p=R/file;s=p.read_text()
 assert s.count('id="usageWindow"')==1,p
 assert s.count('<script data-demo-consistency>')==1,p
 assert s.count('<style data-demo-consistency>')==1,p
 assert re.search(r'<body[^>]*data-demo=',s),p
 assert not re.search(r'<[^>]+\stitle=',s),p
 for h in ['1 · 价值','2 · 使用','3 · 扩展','4 · 实现分工']:assert h in s,(p,h)
 for js in re.findall(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',s):
  subprocess.run(['node','-e',"new (require('vm').Script)(require('fs').readFileSync(0,'utf8'))"],input=js,text=True,check=True,capture_output=True)
 rows.append({'page':file,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'tutorial_sections':4,'shared_controls_and_tooltips':True,'inline_script_syntax':'pass'})
report={'scope':'all final prototype entry pages; templates and tutorial fragments are build inputs','pages':rows,'business_exceptions':{'scale':'no automatic Kernel audit; selected object / source / Info','case5':'tail-difference action uses audit icon; source moved from bottom to top','rsfa':'source action opens benchmark records'},'checks':['rebuilt all five demo groups','one tutorial, shared stylesheet and runtime per entry','four tutorial sections','no native HTML title attributes','all inline JavaScript compiles'],'not_verified':['real browser rendering','pointer/focus and clipboard behavior in a real browser','optical quality at desktop and narrow viewport']}
(R/'_shared/consistency-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('PASS:',len(rows),'final entries; tutorial / shared controls / single tooltip owner / script syntax')
