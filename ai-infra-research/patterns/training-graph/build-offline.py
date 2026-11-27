from pathlib import Path
import json
import subprocess
p = Path(__file__).parent
# Reject stale consumer bundles before producing another offline snapshot.
for ancestor in p.resolve().parents:
    guard = ancestor / "layer_stack/scripts/sync-hardware-glyphs.cjs"
    if guard.exists():
        subprocess.run(["rtk", "node", str(guard), "--check"], check=True)
        break
art = (p / "expert-icon.svg").read_text()
inner = art[art.index('>') + 1:art.rindex('</svg>')].strip()
glyph = p / "expert-glyph.js"
glyph.write_text('\n'.join('const EXPERT_ARTWORK=' + json.dumps(inner) + ';' if line.startswith('const EXPERT_ARTWORK=') else line for line in glyph.read_text().splitlines()) + '\n')
h = (p / "index.html").read_text()
for name in ["design-tokens.css", "liquid-glass.css", "layer-stack-progress.css", "demo.css", "deployment-step.css", "deployment-pattern/view-dial.css", "deployment-pattern/lingqu-physical.css", "observation/view.css", "deployment-pattern/trace/timeline.css", "deployment-pattern/trace/tooltip.css", "observation/trace-view.css"]:
    h = h.replace('<link rel="stylesheet" href="' + name + '">', '<style>' + (p / name).read_text() + '</style>')
for name in ["canonical.js", "content.js", "graph-model.js", "graph-layout.js", "graph-renderer.js", "expert-glyph.js", "training-graph.js", "secondary.js", "rank-pattern/planner.js", "rank-pattern/memory-geometry.js", "rank-model.js", "rank-view.js", "deployment-model.js", "deployment-pattern/ep-copper.js", "deployment-step.js", "deployment-pattern/atlas-controls.js", "deployment-pattern/hw-icons.js", "deployment-views.js", "deployment-pattern/lingqu-physical.js", "deployment-pattern/hw-glyphs-v2.js", "deployment-pattern/approved-icons.js", "deployment-pattern/hardware-system.js", "deployment-physical.js", "observation/model.js", "observation/view.js", "deployment-pattern/trace/task.js", "deployment-pattern/trace/timeline.js", "observation/configured-trace-mock.js", "observation/trace-view.js", "demo.js", "liquid-glass.js"]:
    h = h.replace('<script src="' + name + '"></script>', '<script>' + (p / name).read_text() + '</script>')
(p / "training-demo.html").write_text(h)
