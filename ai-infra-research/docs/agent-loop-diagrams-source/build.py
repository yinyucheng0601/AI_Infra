from pathlib import Path
import json, hashlib
p = Path(__file__).parent
data = json.loads((p / 'content.json').read_text())
glyphs = json.loads((p / 'glyphs.json').read_text())
manifest = json.loads((p / 'glyph-provenance.json').read_text())
template = '''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>AI Agent Loop：从推理服务到目标托管</title><style>__CSS__</style></head><body>
<header><div class="eyebrow">AI AGENT LOOP / 从推理服务到目标托管</div><div class="heading"><h1 id="title"></h1><div class="count" id="count"></div></div><p id="question"></p></header>
<main><div class="workspace"><section class="visual" aria-label="交互机制图"><div id="steps" aria-label="本页分步"></div><div class="stage" id="stage"><svg id="diagram" viewBox="0 0 1100 650" role="group" aria-label="当前机制图"><g id="scene"></g></svg></div><div class="tools"><span id="scale">100%</span><button data-tip="缩小图形" id="zoomOut" aria-label="缩小">−</button><button data-tip="恢复默认适应画布" id="fit">Fit</button><button data-tip="放大后可拖动查看" id="zoomIn" aria-label="放大">＋</button><button data-tip="图元、术语与本页来源" id="infoButton" aria-expanded="false" aria-controls="infoPanel" aria-label="图元、术语与来源">i</button></div></section>
<aside><span class="label" id="kind"></span><h2 id="conclusion"></h2><div id="goalField" hidden><label for="goalInput">开发目标</label><input id="goalInput" value="实现项目内搜索，并检查可用性" data-tip="修改目标会同步本页委托内容；不启动真实任务"></div><div id="explanation"></div><section id="selection"><span class="label">选择图中对象 / INSPECT</span><h3 id="objectTitle"></h3><p id="objectText"></p></section></aside></div></main>
<footer><div class="reading"><button id="previous" aria-label="上一步" data-tip="上一子状态；到边界后进入上一章">←</button><nav id="chapterNav" aria-label="唯一章节导航"></nav><button id="next" aria-label="下一步" data-tip="下一子状态；到边界后进入下一章">→</button><span id="position"></span></div></footer>
<section class="popover" id="infoPanel" hidden aria-label="图元、术语与来源"><div class="pophead"><button data-info="legend" data-tip="查看实际使用的正式图元">图元</button><button data-info="terms" data-tip="查看本页专业术语">术语</button><button data-info="sources" data-tip="查看结论来源及适用边界">来源</button><button id="closeInfo" aria-label="关闭说明" data-tip="关闭说明，或按 Escape">×</button></div><div id="infoBody"></div></section><div id="tooltip" class="tooltip" role="tooltip" hidden></div>
<script id="asset-provenance" type="application/json">__PROVENANCE__</script><script>const REPORT=__DATA__; const GLYPHS=__GLYPHS__;
__JS__
</script></body></html>'''
for key, value in [('CSS',(p/'report.css').read_text()),('DATA',json.dumps(data,ensure_ascii=False)),('GLYPHS',json.dumps(glyphs,ensure_ascii=False)),('PROVENANCE',json.dumps(manifest,ensure_ascii=False)),('JS',(p/'report.js').read_text())]:
    template = template.replace('__'+key+'__', value)
out=p.parent/'agent-loop-diagrams.html'
out.write_text(template)
print(f'{out}: {out.stat().st_size} bytes; {len(glyphs)} embedded approved glyphs')
