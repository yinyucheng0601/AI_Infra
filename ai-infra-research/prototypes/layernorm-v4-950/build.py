"""Build the offline investigation from the pinned ops-nn blobs and RMSNorm assets."""
import json
import re
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RMS = HERE.parent / 'rmsnorm-performance-investigation'
PTO = Path('/Users/yin/pto-design-system')
REV = '0a2a8d3377914e6d458043ae7923e18456ec45a2'
BASE = 'norm/layer_norm_v4/'
UT = BASE + 'tests/ut/op_host/test_layer_norm_v4_tiling.cpp'
APT = BASE + 'op_kernel/layer_norm_v4_apt.h'
ENTRY = BASE + 'op_kernel/layer_norm_v4_apt.cpp'
REG = 'common/inc/op_host/tiling_templates_registry.h'
TRANS_HOST = BASE + 'op_host/layer_norm_v4_regbase_transpose_tiling.cpp'
PERF_HOST = BASE + 'op_host/layer_norm_v4_regbase_two_pass_perf_tiling.cpp'
TRANS = BASE + 'op_kernel/arch35/layer_norm_v4_regbase_transpose.h'
PERF = BASE + 'op_kernel/arch35/layer_norm_v4_two_pass_perf.h'
UB, CORES, VECTOR, BLOCK, F32 = 253952, 56, 256, 32, 4

def div(a, b):
    return (a + b - 1) // b

def align(a, b):
    return div(a, b) * b

def ref(file, line, end, label=None):
    return dict(file=file, line=line, end=end, **({'label': label} if label else {}))

def case(transpose):
    a, r = (65536 if transpose else 28672), 16
    rows = div(a, CORES)
    vl = VECTOR // F32
    r_align = align(r, BLOCK // F32)
    assert (r <= 16 and rows > 8 * vl) == transpose
    host_file, kernel, key = (TRANS_HOST, TRANS, 800) if transpose else (PERF_HOST, PERF, 500)
    events, life, capacity = [], [], {}

    def event(short, label, lane, line, end, note):
        events.append(dict(id=f'{key}-step-{len(events)+1}', short=short, label=label,
                           lane=lane, ref=ref(kernel,line,end), note=note))

    def tensor(buffer, name, role, size, start, end, line, last, note):
        life.append(dict(id=f'{key}-ub-{len(life)+1}', buffer=buffer, name=name, role=role,
                         bytes=size, start=start-1, end=end, ref=ref(kernel,line,last), note=note))

    if transpose:
        param = 2 * r_align * F32
        per_row = (2*r + 3*r_align + 4)*F32
        tile = min(min((UB-param)//per_row, 16*255)//vl*vl, align(rows,vl))
        tail = rows - tile
        assert 0 < tail < tile
        x, y, stat = tile*r*F32, tile*r_align*F32, tile*F32
        capacity.update(paramsQueue_=param,xQueue_=2*x,tempBuf_=y,
                        meanQueue_=2*stat,rstdQueue_=2*stat,yQueue_=2*y)
        event('γ β → UB','搬入 γ / β',0,98,109,'参数按 paramAlign 分段，整个核的两块共用。')
        event('X₀ → RA','NDDMA 搬入 X₀',0,112,131,f'从 GM 的 AR 排布搬成 UB 的 RA，目标 R 方向 stride 为 {tile}。')
        event('μ / rstd','RA 归约 X₀',1,158,174,'先归约均值，再把 X₀ 原位更新为 X₀−μ，对中心化平方归约并计算 rstd。tempBuf_ 用于归约输入及临时存储。')
        event('预取 X₁','NDDMA 预取 X₁',0,79,86,f'X₀ 仍在第一个队列槽，X₁ 搬入另一槽。尾块有 {tail} 行。')
        event('仿射 Y₀','归一化与仿射',1,141,155,'使用 γ / β 将归一化结果写入 tempBuf_，归还 X₀ 队列槽。')
        event('RA → AR','将 Y₀ 转回 AR',1,429,442,'R=16，packOutput 关闭。TransposeOutput 将结果写到 yQueue_。')
        event('Y₀ → GM','写回 Y₀',2,443,450,'写回有效行与 R=16 列，归还 Y₀ 队列槽。')
        event('μ / rstd → GM','写回 μ / rstd',2,453,462,'写回两组 FP32 统计量并归还队列槽。')
        tensor('paramsQueue_','γ / β','weight',param,1,8,100,109,'一槽，跨两个 tile 复用。当前窗口结束后仍保留，直到 Process 尾部归还。')
        tensor('xQueue_','X₀ → X₀−μ','activation',x,2,5,199,213,'首块搬入后按 RA 排布，归约时原位保存中心化值，供 Normalize 复用。ComputeOutput 在 L153 归还队列槽。')
        tensor('xQueue_','X₁ · 预取','activation',tail*r*F32,4,8,79,86,'第 4 步开始与 X₀ 共存。为避免同轨重叠，画面另设预取轨。')
        life[-1]['band'] = 1
        tensor('tempBuf_','归约工作区','aggregate',y,3,3,158,174,'归约使用该预留区，区间记录程序调用。')
        tensor('tempBuf_','Y₀ · RA','activation',y,5,6,141,155,'tempBuf_ 复用为 RA 输出，CopyOutY 读取以转置。')
        tensor('meanQueue_','μ₀','aggregate',stat,3,8,133,139,'按首块行数存放 FP32 mean，CopyOutMeanRstd 归还槽。')
        tensor('rstdQueue_','rstd₀','aggregate',stat,3,8,133,139,'按首块行数存放 FP32 rstd，CopyOutMeanRstd 归还槽。')
        tensor('yQueue_','Y₀ · AR','activation',y,6,7,429,450,'RA→AR 后写回 GM，该槽随后归还。')
        detail = f'ceil(A/56)={rows} > 8×64=512，且 R=16。Transpose 优先级 125，生成 800+0。tileA={tile}，核 0 尾块 {tail} 行，packOutput=0。'
        scope = f'核 0 · 首块 {tile} 行 · 含尾块 {tail} 行预取'
        ut_range, dispatch, allocation = (2073,2081),(152,155),(50,57)
        host_range = (33,42)
        tiling_range = (53,86)
    else:
        budget = UB - vl * F32 * 4
        weight = 2*F32 + 2*F32 + 2*F32 + F32
        tile = budget // (r_align * weight)
        while tile*r_align*weight > budget - 4*align(tile,BLOCK//F32):
            tile -= 1
        assert rows <= tile
        x = tile*r_align*F32
        stat = align(tile,BLOCK//F32)*F32
        capacity.update(gammaBetaQueue_=2*r_align*F32,xQueue_=2*x,tmpBuf=x+4*VECTOR,
                        meanQueue_=2*stat,rstdQueue_=2*stat,yQueue_=2*x)
        event('γ β → UB','搬入 γ / β',0,96,116,'γ / β 存在同一队列槽，参数在 Process 末尾归还。')
        event('X → UB','搬入 X',0,118,133,f'按 AR 搬入 {rows} 行。R=rAlign=16，统计与输出均使用这次搬运。')
        event('μ / Var','计算均值、中心化与方差',1,189,228,'rAlign=16 ≤ 64，使用 CalculateMeanVarRLessThanVL。中心化 X 写到 tmpBuf。')
        event('μ → GM','写回均值 μ',2,158,160,'Caculate 内写回均值并归还 meanQueue_ 槽。')
        event('Var → rstd','方差原位转为 rstd',1,161,164,'ComputeRstdNewtonRaphson 在 rstdOutUbAddr 上原位更新。')
        event('rstd → GM','写回 rstd',2,617,626,'写回后 rstd 在源码中仍供归一化读取，稍后由 Caculate 归还槽。')
        event('仿射 Y','复用中心化 X 并仿射',1,167,187,'从 tmpBuf 重用 X−μ，与 rstd、γ / β 生成 Y，随后归还 X 和 rstd 的槽。')
        event('Y → GM','写回 Y',2,628,637,'将有效行写回 GM，归还 yQueue_ 槽。')
        used = rows*r_align*F32
        tensor('gammaBetaQueue_','γ / β','weight',2*r*F32,1,8,96,116,'参数直到 Process L92 归还。')
        tensor('xQueue_','X · AR','activation',used,2,7,118,133,'统计阶段读取，Caculate L184 归还该队列槽。')
        tensor('tmpBuf','X−μ','aggregate',used,3,7,219,226,'保存中心化矩阵，归一化阶段读同一 tmpBuf。区间结束时 UB 预留仍存在。')
        tensor('meanQueue_','μ','aggregate',rows*F32,3,4,158,160,'均值写回后立即归还该槽。')
        tensor('rstdQueue_','Var → rstd','aggregate',rows*F32,3,7,161,165,'同址从方差变成 rstd，直到归一化结束才归还槽。')
        tensor('yQueue_','Y · AR','activation',used,7,8,628,637,'归一化写入 Y，CopyOutY 写回并归还槽。')
        detail = f'ceil(A/56)={rows}=8×64，未满足 Transpose 的严格大于条件。Perf 优先级 150，rAlign=16，单行可放入 UB，FP32/FP32 对应 500。aUbFactor={tile}，核 0 实际 {rows} 行。'
        scope = f'核 0 · {rows} 行 · 1 个 UB tile'
        ut_range, dispatch, allocation = (2083,2090),(135,138),(56,71)
        host_range = (64,91)
        tiling_range = (116,146)

    assert sum(capacity.values()) <= UB
    for item in life:
        assert 0 <= item['start'] < item['end'] <= len(events)
        assert 0 < item['bytes'] <= capacity[item['buffer']]
    total = sum(capacity.values())
    return dict(shape=f'{a} × {r}', key=key, route='Transpose' if transpose else 'Two-Pass Perf',
                scope=f'{scope} · UB 预留 {total:,} B', host=detail, events=events, life=life, capacity=capacity,
                allocation=ref(kernel,*allocation), audit=[
                    ref(UT,2019,2055,'Host 单测平台与数据类型'),
                    ref(BASE+'op_host/layer_norm_v4_tiling_base.cpp',118,131,'Host 按 UB block 对齐 R'),
                    ref(UT,*ut_range,f'Host 单测断言 key {key}'),
                    ref(REG,424,439,'Host 注册表按优先级试用模板'),
                    ref(TRANS_HOST,22,42,'Transpose 的严格阈值与 key'),
                    ref(TRANS_HOST,101,103,'Transpose 注册优先级 125'),
                    ref(host_file,*host_range,'当前模板的 IsCapable 与 key'),
                    ref(host_file,*tiling_range,'Host tile 和核分片推导'),
                    ref(host_file,101 if transpose else 168,103 if transpose else 170,'当前模板注册'),
                    ref(APT,40,47,'Kernel key 常量'),
                    ref(ENTRY,18,23,'Kernel C 入口'),
                    ref(APT,*dispatch,'Key 对应 Kernel 实现'),
                    ref(kernel,*allocation,'Kernel InitBuffer 预留'),
                ])

def main(repo):
    cases = [case(True),case(False)]
    refs = [ref for c in cases for ref in [c['allocation'],*c['audit'],
            *(e['ref'] for e in c['events']),*(l['ref'] for l in c['life'])]]
    sources = {f: subprocess.check_output(['rtk','proxy','git','-C',repo,'show',f'{REV}:{f}']).decode()
               for f in sorted({r['file'] for r in refs})}
    for r in refs:
        assert 1 <= r['line'] <= r['end'] <= len(sources[r['file']].splitlines()), r
    assert 'EXPECT_EQ(result.key, 800U)' in sources[UT]
    assert 'EXPECT_EQ(result.key, 500U)' in sources[UT]
    rms_lines = (RMS/'page.html').read_text().splitlines()
    comparison = (RMS/'comparison.js').read_text().splitlines()
    viewport = [next(l for l in rms_lines if l.startswith('function '+name+'('))
                for name in ('transform','fit','zoomAt','showTip')]
    viewport.append(next(l for l in rms_lines if l.startswith('let drag')).split(";$('canvas').onclick")[0]+';')
    viewport = '\n'.join(viewport).replace("top=82,bottom=100","top=108,bottom=90")
    viewport += """
function positionMemoryButton(){}
$('canvas').addEventListener('wheel', e => {
    e.preventDefault();
    zoomAt(Math.exp(-e.deltaY*.0015),e.clientX,e.clientY);
}, {passive:false});
$('canvas').onpointercancel = () => { drag=null; moved=false; $('canvas').classList.remove('dragging'); };
$('plus').onclick=()=>zoomAt(1.2);
$('minus').onclick=()=>zoomAt(1/1.2);
$('fit').onclick=fit;
draw();
fit();
"""
    tensors = (ROOT/'reports/llm-compute/training-parallel-communication-v1.html').read_text().splitlines()
    grid = '\n'.join(next(l for l in tensors if l.startswith('function '+name+'('))
                     for name in ('dataTiles','tensorNode'))
    grid_style = """const B='#B1EF6B', hit=(key,body)=>body;
const txt=(x,y,t,cls,anchor,color)=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}" fill="${color}">${esc(t)}</text>`;"""
    grid = "const GridTensor=(()=>{" + grid_style + grid + ";return {render:tensorNode};})();"
    pattern = '\n'.join([(PTO/'patterns/swimlane-task/pattern.js').read_text(),
                          (RMS/'memory-inspector-adapter.js').read_text(),
                          (RMS/'buffer-lifetime-plot.js').read_text(),
                          next(l for l in comparison if l.startswith('function headerTip(')), grid,
                          'const eventBarCache=new Map();',
                          next(l for l in comparison if l.startswith('function taskImage('))
                          .replace('(lane===1?hardwareColors.compute:hardwareColors.transfer)', "'#ffffff'")])
    hardware = ('aic-core-object', 'aiv-core-object', 'memory-architecture')
    hardware_css = '\n'.join((PTO/'patterns'/name/'pattern.css').read_text() for name in hardware)
    hardware_js = '\n'.join((PTO/'patterns'/name/'pattern.js').read_text() for name in hardware)
    rms_page = '\n'.join(rms_lines)
    top_actions = rms_page.split('<div class="top-actions">',1)[1].split('<main ',1)[0].strip()
    top_actions = '<div class="top-actions">' + top_actions
    tips = {'audit':'核查 Host tiling 与 Kernel','inspect':'检查当前步骤的 Tensor / UB',
            'source':'查看当前 Kernel 步骤源码','info':'查看调查说明'}
    for name, tip in tips.items():
        top_actions = re.sub('id="'+name+'"([^>]+)aria-label="[^"]+"',
                             lambda match: f'id="{name}"{match[1]}aria-label="{tip}" data-tip="{tip}"',
                             top_actions)
    action_css = []
    for line in rms_page.split('</style>',1)[0].splitlines():
        if line.lstrip().startswith('@media'):
            continue
        for rule in re.findall(r'[^{}]+\{[^{}]*\}',line.split('@media',1)[0]):
            selector = rule.split('{',1)[0].strip()
            if selector.startswith('.top-actions') or selector.startswith('#auditBadge'):
                action_css.append(rule)
    copy_icon = re.search(r'<button id="promptCopy"[^>]*>(<svg.*?</svg>)</button>',rms_page).group(1)
    module_style = []
    for line in rms_page.split('</style>',1)[0].splitlines():
        if line.lstrip().startswith('@media'):
            continue
        for rule in re.findall(r'[^{}]+\{[^{}]*\}',line.split('@media',1)[0]):
            selector = rule.split('{',1)[0].strip()
            if 'reuse-split' in selector:
                continue
            if selector == '.scene .resource-label' or re.search(r'#(?:architectureHost|hardwarePanel|hardwareMiniViewport|hardwareReadout|memoryReuseButton|chipView)\b',selector):
                module_style.append(rule)
    button_markup = []
    for name in ('memoryReuseButton','chipView'):
        markup = re.search(fr'<button id="{name}"[^>]*>.*?</button>',rms_page).group()
        if 'aria-pressed' not in markup:
            markup = markup.replace('<button ', '<button aria-pressed="false" ',1)
        button_markup.append(markup)
    hardware_panel = re.search(r'<aside id="hardwarePanel".*?</aside>',rms_page).group()
    hardware_panel = hardware_panel.replace('aria-label="关闭硬件映射"', 'aria-label="关闭硬件映射" data-tip="关闭硬件映射"')
    shared_hardware = next(l for l in rms_lines if l.startswith('const architecture='))+'\n'
    shared_hardware += rms_page[rms_page.index('function hardware(selector)'):rms_page.index('function render(){prepareExecution')]
    shared_hardware = '\n'.join(line for line in shared_hardware.splitlines()
                                 if "if(state.object==='hardware'" not in line)
    shared_hardware = shared_hardware.replace('executionModel().events[executionStep]', 'activeEvent()').replace('executionStep+1','step+1')
    shared_hardware = shared_hardware.replace('{ub:ub,vector:vec,vf:simd,scale:simd}[state.object]', '(lifeId?ub:null)')
    glass = ROOT/'methods/design-spatial-systems-ui/assets/liquid-glass-controls'
    replacements = {'RMS_CSS':next(l for l in rms_lines if l.startswith(':root')),
                    'RMS_TOP_ACTIONS':top_actions, 'RMS_ACTIONS_CSS':'\n'.join(action_css), 'RMS_COPY_ICON':copy_icon, 'HARDWARE_CSS':hardware_css,
                    'RMS_MODULE_CSS':'\n'.join(module_style),
                    'RMS_MODULE_BUTTONS':'\n'.join(button_markup), 'RMS_HARDWARE_PANEL':hardware_panel,
                    'PATTERN_JS':pattern+'\n'+hardware_js, 'APP_JS':shared_hardware+'\n'+(HERE/'app.js').read_text()+'\n'+viewport,
                    'GLASS_CSS':(glass/'liquid-glass.css').read_text(),
                    'GLASS_JS':(glass/'liquid-glass.js').read_text(),
                    'MODEL_JSON':json.dumps(dict(revision=REV,cases=cases,sources=sources),ensure_ascii=False)}
    page = (HERE/'page.html').read_text()
    for marker, content in replacements.items():
        page = page.replace(f'/* {marker} */',content.replace('</script','<\\/script'))
    (HERE/'index.html').write_text(page)
    for c in cases:
        print(c['shape'],c['key'],c['scope'])

if __name__ == '__main__':
    main(sys.argv[1])
