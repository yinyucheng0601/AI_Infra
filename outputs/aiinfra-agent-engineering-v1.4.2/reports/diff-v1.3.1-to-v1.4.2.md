# Change inventory

| Paths | Change |
| --- | --- |
| `adapters/{contract,pipeline,legacy_bridge}.py`, `schemas/adapter-result.schema.json` | Added native-record contract, inspectors and reversible graph envelope. |
| `scripts/inspect_source.py`, `tests/test_inspection.py` | Added CLI, locator, scope, malformed input and legacy compatibility checks. |
| `scripts/build_package.py`, `VERSION`, `manifest.json` | Updated version and deterministic archive generation. The existing generated design scanner is carried forward verbatim. |
| `README.md`, `AGENTS.md`, `workflows/agent-workflow.md`, `skills/ai-infra-investigation/SKILL.md`, `CHANGELOG.md`, reports | Documented the new local entry and evidence boundaries. |
| Original graph contracts, rule table, validators, source adapters, locks, browser harness, fixtures and five other Skills | Preserved byte-for-byte. |
| Removed paths | None. |
