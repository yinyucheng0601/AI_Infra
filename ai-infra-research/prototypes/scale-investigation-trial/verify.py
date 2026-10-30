"""stdlib CPU oracle + original custom_scale executed against a minimal FP32 tensor shim.
No torch, torch_npu, NumPy or custom_ops_lib imported. Not a PyTorch-runtime test.
"""
import ast, json, math, struct, subprocess, hashlib
from pathlib import Path
P=Path(__file__).resolve().parent
f=lambda x:struct.unpack('f',struct.pack('f',x))[0]
def coords(shape):
 import itertools
 return itertools.product(*(range(x) for x in shape))
def offset(c,shape):
 n=0
 for a,b in zip(c,shape):n=n*b+a
 return n
class Tensor:
 def __init__(self,data,shape):self.data=list(data);self.shape=tuple(shape);self.dtype='float32';self.device='cpu'
 def reshape(self,shape):
  assert math.prod(shape)==len(self.data)
  return Tensor(self.data,shape)
 def to(self,**kwargs):return self
 def binary(self,other,op):
  assert len(self.shape)==len(other.shape)
  return Tensor([f(op(self.data[offset(c,self.shape)],other.data[offset(tuple(0 if d==1 else i for i,d in zip(c,other.shape)),other.shape)])) for c in coords(self.shape)],self.shape)
 def __mul__(self,o):return self.binary(o,lambda a,b:a*b)
 def __iadd__(self,o):return self.binary(o,lambda a,b:a+b)
class Torch:pass
Torch.Tensor=Tensor;Torch.float32='float32';Torch.float16='float16';Torch.bfloat16='bfloat16'
tree=ast.parse((P/'sources/test_op.py').read_text());fn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='custom_scale')
ns={'torch':Torch};exec(compile(ast.Module(body=[fn],type_ignores=[]),'fixed-source-custom_scale','exec'),ns)
script="""const M=require('./model.js'); let results=[];for(let c=0;c<M.configs.length;c++){let m=M.create(c);for(const bias of [true,false]){m.bias=bias;for(const changed of [false,true]){if(changed){m.s[m.s.length-1]+=0.25;m.b[m.b.length-1]+=0.5;}results.push({c,bias,changed,config:m.config,x:m.x.slice(),s:m.s.slice(),b:m.b.slice(),values:Array.from({length:120},(_,i)=>M.element(m,i))});}}}console.log(JSON.stringify(results));"""
rows=json.loads(subprocess.check_output(['node','-e',script],cwd=P));count=0
for row in rows:
 c=row['config'];sh=c['shape'];a=c['axis']%3
 expected=ns['custom_scale'](Tensor(row['x'],[2,6,10]),Tensor(row['s'],sh),Tensor(row['b'],sh) if row['bias'] else None,c['axis'],c['axes_num'],c['blob']).data
 # Separate explicit per-mode mathematical oracle, not model flatten expression.
 for i,e in enumerate(row['values']):
  n,r,w=i//60,i//10%6,i%10
  k=r*10+w if row['c'] in [0,2] else r if row['c']==1 else w
  oracle=f(f(row['x'][i]*row['s'][k])+(row['b'][k] if row['bias'] else 0))
  assert e['k']==k and e['y']==oracle==expected[i],(row['c'],i)
  assert e['offsetBytes']['x']==i*4 and e['offsetBytes']['scale']==k*4
  count+=1
# Shape rejection, axis bounds, and bias mismatch execute original validation branches.
rejected=0
for axis,axes,shape,bias_shape in [(1,-1,[6],[6]),(3,1,[10],[10]),(1,3,[6,10],[6,10]),(1,-1,[6,10],[6])]:
 try:ns['custom_scale'](Tensor(range(120),[2,6,10]),Tensor([1]*math.prod(shape),shape),Tensor([0]*math.prod(bias_shape),bias_shape),axis,axes,True)
 except ValueError:rejected+=1
assert rejected==4
# Influence sets and finite differences, scale then bias independently.
probe="""const M=require('./model.js');for(let c=0;c<4;c++){let m=M.create(c),k=m.s.length-1,baseline=Array.from({length:120},(_,i)=>M.element(m,i));m.s[k]+=0.25;for(let i=0;i<120;i++){let e=M.element(m,i),want=e.k===k?Math.fround(e.x*.25):0;if(Math.abs((e.y-baseline[i].y)-want)>1e-6)throw Error('scale influence');}m.s=m.originalS.slice();m.b[k]+=.5;let changed=[];for(let i=0;i<120;i++)if(M.element(m,i).y!==baseline[i].y)changed.push(i);let expected=M.affected(m,k).map(e=>e.i);if(JSON.stringify(changed)!==JSON.stringify(expected))throw Error('bias influence');if(changed.length!==[2,20,2,12][c])throw Error('coverage');let ctx=M.context(m,119,'boundary question');if(ctx.selection.i!==119||ctx.question!=='boundary question')throw Error('handoff');}console.log('influence + handoff PASS');"""
subprocess.run(['node','-e',probe],cwd=P,check=True)
# Known injected wrong broadcast index must be detectable.
assert any(e['k']!=(e['i']%6) for e in rows[0]['values'])
report={'source_sha256':hashlib.sha256((P/'sources/test_op.py').read_bytes()).hexdigest(),'numerical_checks':count,'configs':4,'original_function':'executed via AST extraction with stdlib FP32 Tensor shim','independent_oracle':'explicit nested coordinate interpretation per config','shape_rejections':rejected,'influence_counts':[2,20,2,12],'mutation_detection':'wrong modulo-6 parameter index detected','status':'pass','not_verified':['real PyTorch execution','NPU execution','Host/Kernel','FP16/BF16','random upstream sample reproduction']}
(P/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
