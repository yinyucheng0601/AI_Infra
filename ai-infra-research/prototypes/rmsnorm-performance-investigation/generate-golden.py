"""Regenerate a CPU reference window; does not execute an NPU kernel."""
from pathlib import Path
import hashlib, json, subprocess, tempfile

P = Path(__file__).resolve().parent
m = json.loads((P / 'model.json').read_text())
source = 'tests/onboard/kernels/rms_norm/rms_norm_direct.asc'
record = m['sources'][source]
t = record['text']
function = t[t.index('void GoldenRmsNorm'):t.index('}  // namespace', t.index('void GoldenRmsNorm'))]
cpp = '''#include <vector>
#include <random>
#include <cmath>
#include <cstdint>
#include <iostream>
#include <iomanip>
''' + function + '''
int main(int argc, char** argv) {
 uint32_t R=std::stoul(argv[1]), H=std::stoul(argv[2]);
 std::mt19937 gen(12345);
 std::uniform_real_distribution<float> dist(-2.0f,2.0f);
 std::vector<float> x(4*H),g(H),y(4*H);
 // Preserve the upstream full-X-then-gamma RNG order; retain only the window rows.
 for(size_t i=0;i<(size_t)R*H;++i){float v=dist(gen);if(i<x.size())x[i]=v;}
 for(auto& v:g)v=dist(gen);
 GoldenRmsNorm(x,g,y,4,H,1e-6f);
 std::cout<<std::setprecision(9)<<"[";
 for(int r=0;r<4;++r)for(int c=0;c<6;++c){if(r||c)std::cout<<",";std::cout<<y[r*H+c];}
 std::cout<<"]";
}
'''
with tempfile.TemporaryDirectory() as d:
    src, exe = Path(d)/'golden.cpp', Path(d)/'golden'
    src.write_text(cpp)
    subprocess.run(['c++','-std=c++17','-O2','-ffp-contract=off',str(src),'-o',str(exe)],check=True)
    cases = {}
    for c in m['cases']:
        if c['dtype'] != 'fp32':
            continue  # The captured host golden operates on FP32 only.
        rows, cols = c['shape']
        cases[c['id']] = json.loads(subprocess.check_output([str(exe),str(rows),str(cols)]))
out = {'kind':'locally regenerated CPU Golden; not captured device output',
       'revision':m['revision'],'source':source,'source_sha256':record['sha256'],
       'function_sha256':hashlib.sha256(function.encode()).hexdigest(),
       'compiler':subprocess.check_output(['c++','--version'],text=True).splitlines()[0],
       'random':'local C++ standard-library mt19937(12345), uniform_real_distribution<float>(-2,2); full X then gamma; distribution implementation may differ across platforms',
       'epsilon':1e-6,'window':{'rows':4,'cols':6},'cases':cases,
       'npu_values':None,'validation_result':None}
(P/'golden-window.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Generated CPU Golden windows:',len(cases),'FP32 cases; no NPU comparison')
