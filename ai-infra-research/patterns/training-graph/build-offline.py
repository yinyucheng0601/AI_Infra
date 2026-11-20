from pathlib import Path
import json
p = Path(__file__).parent
art = (p / "expert-icon.svg").read_text()
inner = art[art.index('>') + 1:art.rindex('</svg>')].strip()
glyph = p / "expert-glyph.js"
glyph.write_text('\n'.join('const EXPERT_ARTWORK=' + json.dumps(inner) + ';' if line.startswith('const EXPERT_ARTWORK=') else line for line in glyph.read_text().splitlines()) + '\n')
h = (p / "index.html").read_text()
for name in ["design-tokens.css", "liquid-glass.css", "layer-stack-progress.css", "demo.css"]:
    h = h.replace('<link rel="stylesheet" href="' + name + '">', '<style>' + (p / name).read_text() + '</style>')
for name in ["canonical.js", "content.js", "graph-model.js", "graph-layout.js", "graph-renderer.js", "expert-glyph.js", "training-graph.js", "secondary.js", "rank-pattern/planner.js", "rank-pattern/memory-geometry.js", "rank-model.js", "rank-view.js", "demo.js", "liquid-glass.js"]:
    h = h.replace('<script src="' + name + '"></script>', '<script>' + (p / name).read_text() + '</script>')
(p / "training-demo.html").write_text(h)
