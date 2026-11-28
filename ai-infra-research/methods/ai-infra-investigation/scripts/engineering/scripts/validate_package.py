from pathlib import Path
import hashlib, json, sys
ROOT=Path(__file__).resolve().parents[1]
required = [
    "VERSION", "config/repository-lock.json", "config/fixture-lock.json",
    "specs/relation-rules.json", "requirements.txt",
    "schemas/evidence-graph.schema.json", "schemas/visualization-plan.schema.json",
    "schemas/scoped-execution-graph.schema.json", "schemas/relation-graph.schema.json",
    "adapters/library_dependencies.py", "scripts/register_design_assets.py",
    "tests/design_assets_browser.cjs", "tests/test_library_dependencies.py",
    "adapters/catalog_adapter.py", "adapters/deepseek_capture.py",
    "adapters/pypto_trace_adapter.py", "adapters/unpack_source.py",
    "scripts/adapt_unpack.py", "scripts/build_example.py", "scripts/build_trace_example.py",
    "scripts/run_regression.py", "scripts/scan_pypto_data.py", "scripts/validate_graph.py",
    "scripts/validate_package.py", "examples/unpack-configs.json", "examples/request.json",
    "examples/artifact/index.html", "examples/visualization-plan.json",
    "reports/KNOWN-LIMITATIONS.md", "reports/CHANGELOG.md",
    "tests/test_contracts.py", "tests/test_relation_rules.py",
]
required += [f"tests/fixtures/{name}.json" for name in (
    "tensor-cross-layer", "pytorch-pypto-operator", "rank-sharding-collective",
    "glyph-pattern-routing", "rmsnorm-relation-graph",
)]
missing = [path for path in required if not (ROOT / path).is_file()]
manifest = json.loads((ROOT / "manifest.json").read_text())
if manifest.get("package") != "aiinfra-agent-engineering":
    missing.append("manifest-package-mismatch")
if manifest["version"] != (ROOT / "VERSION").read_text().strip():
    missing.append("manifest-version-mismatch")
if manifest["source_lock"] != "config/repository-lock.json":
    missing.append("manifest-source-lock-mismatch")
seen = set()
for entry in manifest["files"]:
    relative = Path(entry["path"])
    if relative.is_absolute() or ".." in relative.parts or relative in seen:
        missing.append(f"invalid-manifest-path:{relative}")
        continue
    seen.add(relative)
    file = ROOT / relative
    if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest() != entry["sha256"]:
        missing.append(f"hash-mismatch:{relative}")
    elif file.stat().st_size != entry.get("bytes"):
        missing.append(f"size-mismatch:{relative}")
    elif file.suffix == ".json":
        try:
            json.loads(file.read_text(encoding="utf-8"))
        except (UnicodeError, ValueError) as exc:
            missing.append(f"invalid-json:{relative}:{exc}")
unlisted = set(map(Path, required)) - seen
if unlisted:
    missing.append(f"required-files-missing-from-manifest:{sorted(map(str, unlisted))}")
if missing:
    print("FAIL", *missing, sep="\n"); sys.exit(1)
print(f"PASS package structure/json: {len(required)} required paths; {len(seen)} manifest hashes")
