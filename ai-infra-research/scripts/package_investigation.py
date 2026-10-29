"""Collect formal glyph snapshots and package the investigation workflow. No source library edits."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ("ai-infra-investigation", "operator-mapping-investigation", "ai-infra-glyphs",
          "observability-design-style", "design-spatial-systems-ui", "llm-compute-diagrams")
GLYPH_SOURCES = {
    "legend-library.html": "reports/llm-compute/diagram-legend-library/index.html",
    "inventory.json": "reports/llm-compute/diagram-legend-library/inventory.json",
    "visual-system.js": "reports/llm-compute/diagram-legend-library/visual-system.js",
    "op-icons.js": "reports/llm-compute/diagram-legend-library/op-icons.js",
}

def collect():
    dest = ROOT / "methods/ai-infra-glyphs/assets"
    dest.mkdir(parents=True, exist_ok=True)
    files = []
    for name, source in GLYPH_SOURCES.items():
        raw = (ROOT / source).read_bytes()
        (dest / name).write_bytes(raw)
        files.append({"file": name, "source": source, "sha256": hashlib.sha256(raw).hexdigest()})
    library = json.loads(re.search(r'<script id="legendData" type="application/json">(.*?)</script>', (dest / "legend-library.html").read_text(), re.S)[1])
    samples = []
    for ident in ("system-value", "system-op"):
        item = next(x for x in library["items"] if x["id"] == ident)
        raw = item["svg"].encode()
        filename = "sample-" + ident + ".svg"
        (dest / filename).write_bytes(raw)
        samples.append({"file": filename, "item": ident, "sha256": hashlib.sha256(raw).hexdigest()})
    examples = {
        "ai-infra-investigation": "csa-swimlane-cover.png",
        "operator-mapping-investigation": "reduction-memory-inspector-cover.png",
        "observability-design-style": "observability-design-style.png",
        "design-spatial-systems-ui": "spatial-systems-ui-style-guide.png",
        "llm-compute-diagrams": "llm-compute-diagrams.png",
    }
    for skill, filename in examples.items():
        target = ROOT / "methods" / skill / "assets"
        target.mkdir(exist_ok=True)
        raw = (ROOT / "web/media" / filename).read_bytes()
        (target / "readme-example.png").write_bytes(raw)
        (target / "readme-example-source.json").write_text(json.dumps({"source": "web/media/" + filename, "sha256": hashlib.sha256(raw).hexdigest()}, indent=2) + "\n")
    (dest / "source-manifest.json").write_text(json.dumps({
        "kind": "generated-distribution-snapshot", "files": files, "samples": samples,
        "refresh": "python3 scripts/package_investigation.py"
    }, ensure_ascii=False, indent=2) + "\n")


def package():
    collect()
    with ZipFile(ROOT / "methods/ai-infra-investigation-workflow.zip", "w", ZIP_DEFLATED) as archive:
        for name in SKILLS:
            folder = ROOT / "methods" / name
            assert (folder / "SKILL.md").is_file(), name
            for file in sorted(folder.rglob("*")):
                rel = file.relative_to(folder)
                if file.is_file() and not any(p.startswith(".") or p == "__pycache__" for p in rel.parts):
                    archive.write(file, Path(name) / rel)
    print("Packaged investigation workflow: six skills, formal glyph snapshot")

if __name__ == "__main__":
    package()
