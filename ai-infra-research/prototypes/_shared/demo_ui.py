from pathlib import Path
import re
ROOT = Path(__file__).resolve().parent
TOPICS = {
 'unpack-case3': ('Unpack · case3', '核对 INT32 拆分映射、输出地址与任务分配。', '选择输出编号与元素位置；对照输入、Task 和 Core，打开源码检查固定版本依据。', '支持公开 case3，并调整 shape、axis 和 dtype；新增配置须重新执行 CPU 参考与映射覆盖检查。', '固定版本 Unpack 源码与公开 case3'),
 'scale': ('Scale · 参数广播', '核对 scale、bias 如何共享到各批次输出，观察参数变化后的结果。', '点选 X、scale、bias 或 Y；调整参数后应用，检查关联输出与数值；通过源码面板核对参考函数。', '替换输入维度、axis、axes_num 或参数来源时，先适配参考计算与参数索引，再验证全部输出。', '固定版本 Scale 测试文件与 Python 参考函数'),
 'rsfa': ('RSFA · 性能比较', '发现配置退化，比较收益和已观测波动，避免仅凭优化名称选版本。', '选择路径、对照和统计口径，点选记录查看 20 次样本、BM/BN 与原始 JSON；核对退化和范围跨 1 的配置。', '接入另一批测量时保留设备、shape、dtype、计时口径与版本。未对齐的实验不直接合并；仅凭耗时不推断硬件根因。', '固定提交的 ablation_raw_data.json 与来源清单'),
}
def tutorial(kind):
 title,value,use,extend,source=TOPICS[kind]
 return f'''<dialog id="usageWindow" aria-labelledby="usageTitle"><div class="panel-head"><h2 id="usageTitle">教程 · {title}</h2><button id="usageClose" aria-label="关闭教程">×</button></div><div class="usage-body"><h3>1 · 价值</h3><p>{value}</p><h3>2 · 使用</h3><p>{use}</p><h4>调用当前 workflow</h4><div class="prompt-block"><pre>读取 AI_Infra 的 AGENTS.md 和 methods/ai-infra-investigation/SKILL.md。
基于{source}，构建 {title} 交互工具。
先核对来源和计算口径，复用已有 Pattern、正式图元与空间界面。
提供可定位选择、源码依据与可复制的调查上下文，分别验证模型、CPU 与交互。</pre></div><h4>带当前选择继续调查</h4><div class="prompt-block"><pre>请基于下面导出的当前对象和来源证据，核对我的问题。
先检查计算口径及分析前提，给出所需证据和最小验证步骤。
[粘贴当前页面导出的 JSON 或调查上下文]</pre></div><h3>3 · 扩展</h3><p>{extend}</p><h3>4 · 实现分工</h3><p>独立领域模型负责计算与来源；ai-infra-investigation 组织任务；ai-infra-glyphs 提供适用的正式图元；observability-design-style 组织选择与证据；design-spatial-systems-ui 约束画布、控件和面板。按当前问题选择图形；性能比较的点与区间不表示设备事件时间线。</p><p>本页来源、CPU 或测量口径与未验证范围见源码 / 来源面板。按页面实际内容复用能力，不把源码推导或仓库测量当作本机设备复现。</p><p id="usageCopyStatus" role="status" aria-live="polite"></p></div></dialog>'''
def enhance(html,kind):
 if not re.search(r'<head(?:\s|>)',html):
  html=html.replace('<meta','<head><meta',1)
  match=re.search(r'<(?:div|header|main|nav|aside)\b',html)
  html=html[:match.start()]+'</head><body>'+html[match.start():]
  html=html.replace('</html>','</body></html>')
 html=re.sub(r'<body([^>]*)>',lambda m:'<body'+m[1]+' data-demo="'+kind+'">',html,count=1)
 if 'id="usageWindow"' not in html:
  html=html.replace('</body>',tutorial(kind)+'</body>')
  if kind=='unpack-case3':
   html=html.replace('<div id="infoBody"></div>','<div id="infoBody"></div><button id="usageOpen">教程</button>')
  elif kind=='rsfa':
   html=html.replace('<aside id="info"', '<aside id="info"',1).replace('</aside>', '</aside>',1)
   start=html.index('<aside id="info"');end=html.index('</aside>',start)
   html=html[:end]+'<button id="usageOpen">教程</button>'+html[end:]
 # Normalize existing tutorials to four top-level sections, retaining case-specific content.
 html=html.replace('<h3 class="usage-pain-title">可视化解决了什么痛点？</h3>','<h3>1 · 价值</h3>').replace('<h3>1 · 在源码调查中调用</h3>','<h3>2 · 使用</h3>').replace('<h3>2 · 点选后，带证据继续调查</h3>','<h4>带当前选择继续调查</h4>').replace('<h3>3 · 如何拓展到其他场景</h3>','<h3>3 · 扩展</h3>').replace('<h3>实现流程与 Skill 分工</h3>','<h3>4 · 实现分工</h3>')
 html=re.sub(r' title="([^"]*)"',r' data-tip="\1"',html)
 css=(ROOT/'demo-ui.css').read_text();js=(ROOT/'demo-ui.js').read_text()
 return html.replace('</head>','<style data-demo-consistency>'+css+'</style></head>').replace('</body>','<script data-demo-consistency>'+js+'</script></body>')
