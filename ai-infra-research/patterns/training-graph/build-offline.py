from pathlib import Path
p = Path(__file__).parent
h = (p / "index.html").read_text()
for name in ["design-tokens.css", "liquid-glass.css", "layer-stack-progress.css", "demo.css"]:
    h = h.replace('<link rel="stylesheet" href="' + name + '">', '<style>' + (p / name).read_text() + '</style>')
for name in ["canonical.js", "content.js", "graph-model.js", "graph-layout.js", "graph-renderer.js", "training-graph.js", "secondary.js", "demo.js", "liquid-glass.js"]:
    h = h.replace('<script src="' + name + '"></script>', '<script>' + (p / name).read_text() + '</script>')
(p / "training-demo.html").write_text(h)
