from pathlib import Path
import hashlib, json, sys
ROOT=Path(__file__).resolve().parents[1]
required=["AGENTS.md","README.md","VERSION","config/repository-lock.json","config/fixture-lock.json","specs/cross-layer-identity-contract.md","schemas/evidence-graph.schema.json","schemas/visualization-plan.schema.json","workflows/agent-workflow.md","workflows/output-contract.md"]
required += [f"skills/{x}/SKILL.md" for x in ["ai-infra-investigation","llm-compute-diagrams","ai-infra-glyphs","observability-design-style","design-spatial-systems-ui","operator-mapping-investigation"]]
required += [f"tests/fixtures/{x}.json" for x in ["tensor-cross-layer","pytorch-pypto-operator","rank-sharding-collective","glyph-pattern-routing"]]
required += ["requirements.txt", "schemas/scoped-execution-graph.schema.json",
             "adapters/deepseek_capture.py", "scripts/build_trace_example.py",
             "schemas/relation-graph.schema.json", "specs/relation-rules.json",
              "tests/fixtures/rmsnorm-relation-graph.json", "tests/test_relation_rules.py",
             "adapters/unpack_source.py", "scripts/adapt_unpack.py", "examples/unpack-configs.json"]
required += ["adapters/library_dependencies.py", "scripts/register_design_assets.py",
             "tests/design_assets_browser.cjs", "tests/test_library_dependencies.py"]
missing = [path for path in required if not (ROOT / path).is_file()]
manifest = json.loads((ROOT / "manifest.json").read_text())
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
