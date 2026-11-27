"""Validate workflow distribution and local references, not model behavior or browser layout."""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import re
import posixpath
from package_investigation import ROOT, SKILLS, standalone_references


def validate_archive_links(archive):
    files = set(archive.namelist())
    for name in files:
        if not (name.endswith("/SKILL.md") or "/references/" in name and name.endswith(".md")):
            continue
        for target in re.findall(r"\]\(([^)]+)\)", archive.read(name).decode()):
            target = target.split("#")[0]
            if target and "://" not in target:
                assert posixpath.normpath(posixpath.join(posixpath.dirname(name), target)) in files, (name, target)

for name in SKILLS:
    folder = ROOT / "methods" / name
    entry = (folder / "SKILL.md").read_text()
    assert entry.startswith("---\nname: " + name + "\n"), name
    for doc in [folder / "SKILL.md", *sorted((folder / "references").glob("*.md"))]:
        for target in re.findall(r"\]\(([^)]+)\)", doc.read_text()):
            target = target.split("#")[0]
            if target and "://" not in target:
                assert (doc.parent / target).exists(), (doc, target)
    with ZipFile(ROOT / "methods" / (name + ".zip")) as archive:
        validate_archive_links(archive)
        assert name + "/SKILL.md" in archive.namelist(), name
        for file in folder.rglob("*"):
            rel = file.relative_to(folder)
            if file.is_file() and not any(p.startswith(".") or p == "__pycache__" for p in rel.parts):
                assert archive.read(str(Path(name) / rel)) == file.read_bytes(), file
        for source, target in standalone_references(folder):
            assert archive.read(str(target)) == source.read_bytes(), target
with ZipFile(ROOT / "methods/ai-infra-investigation-workflow.zip") as archive:
    validate_archive_links(archive)
    assert {n.split("/")[0] for n in archive.namelist()} == set(SKILLS)
    for name in SKILLS:
        folder = ROOT / "methods" / name
        for file in folder.rglob("*"):
            rel = file.relative_to(folder)
            if file.is_file() and not any(p.startswith(".") or p == "__pycache__" for p in rel.parts):
                assert archive.read(str(Path(name) / rel)) == file.read_bytes(), file
base = ROOT / "methods/ai-infra-glyphs/assets"
for item in json.loads((base / "source-manifest.json").read_text())["files"]:
    raw = (base / item["file"]).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == item["sha256"]
    assert raw == (ROOT / item["source"]).read_bytes(), item["source"]
print("PASS: six Skill references, standalone/bundle byte equality, formal glyph source hashes")
print("Not covered: skill routing in a new agent task, rendered UI, cross-operator mapping")
