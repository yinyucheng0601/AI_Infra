"""Collect formal glyph snapshots and package the investigation workflow. No source library edits."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ("ai-infra-investigation", "operator-mapping-investigation", "ai-infra-glyphs",
          "observability-design-style", "design-spatial-systems-ui", "llm-compute-diagrams")
GLYPH_SOURCES = {
    "legend-library.html": "reports/llm-compute/diagram-legend-library/index.html",
    "inventory.json": "reports/llm-compute/diagram-legend-library/inventory.json",
    "visual-system.js": "reports/llm-compute/diagram-legend-library/visual-system.js",
    "op-icons.js": "reports/llm-compute/diagram-legend-library/op-icons.js",
}
CONTRACT_REFS = ("presentation-semantics.md", "task-contract.md", "candidate-review.md")
STANDALONE_CONTRACT_REFS = {
    "observability-design-style": CONTRACT_REFS,
    "design-spatial-systems-ui": CONTRACT_REFS,
    "operator-mapping-investigation": CONTRACT_REFS,
    "llm-compute-diagrams": CONTRACT_REFS,
}
ENGINEERING = Path("scripts/engineering")
LOCAL_ENGINEERING_OUTPUTS = {
    "examples/artifact/deepseek-trace.html",
    "examples/deepseek-trace-excerpt.json",
    "examples/trace-evidence-graph.json",
    "reports/pypto-data-scan.json",
    "reports/regression-report.json",
    "reports/regression-report.md",
}


def standalone_references(skill_root):
    """Give standalone skill zips the shared contracts referenced in workflow mode."""
    for name in STANDALONE_CONTRACT_REFS.get(skill_root.name, ()):
        yield ROOT / "methods/ai-infra-investigation/references" / name, Path(skill_root.name) / "references" / name

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


def distribution_files(folder):
    for file in sorted(folder.rglob("*")):
        rel = file.relative_to(folder)
        if not file.is_file() or any(p.startswith(".") or p == "__pycache__" for p in rel.parts):
            continue
        if rel.is_relative_to(ENGINEERING) and rel.relative_to(ENGINEERING).as_posix() in LOCAL_ENGINEERING_OUTPUTS:
            continue
        yield file


def write_engineering_manifest(folder):
    runtime = folder / ENGINEERING
    files = [
        {"path": file.relative_to(runtime).as_posix(),
         "bytes": file.stat().st_size,
         "sha256": hashlib.sha256(file.read_bytes()).hexdigest()}
        for file in distribution_files(folder)
        if file.is_relative_to(runtime) and file != runtime / "manifest.json"
    ]
    (runtime / "manifest.json").write_text(json.dumps({
        "package": "aiinfra-agent-engineering",
        "version": (runtime / "VERSION").read_text().strip(),
        "source_lock": "config/repository-lock.json",
        "files": files,
    }, indent=2) + "\n")


def add_skill(archive, folder):
    assert (folder / "SKILL.md").is_file(), folder
    for file in distribution_files(folder):
        archive.write(file, Path(folder.name) / file.relative_to(folder))


def package():
    collect()
    methods = ROOT / "methods"
    write_engineering_manifest(methods / "ai-infra-investigation")
    bundle = methods / "ai-infra-investigation-workflow.zip"
    with ZipFile(bundle, "w", ZIP_DEFLATED) as archive:
        for name in SKILLS:
            add_skill(archive, methods / name)
    shutil.copyfile(bundle, methods / "ai-infra-skill-workflow.zip")
    for name in SKILLS:
        folder = methods / name
        with ZipFile(methods / (name + ".zip"), "w", ZIP_DEFLATED) as archive:
            add_skill(archive, folder)
            for source, target in standalone_references(folder):
                archive.write(source, target)
    print("Packaged investigation workflow: six skills, formal glyph snapshot")

if __name__ == "__main__":
    package()
