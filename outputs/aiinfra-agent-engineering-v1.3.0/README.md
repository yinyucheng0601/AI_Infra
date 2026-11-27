# AI Infra Agent Engineering

A source-locked semantic and visual engineering package for Codex/Claude Code-style agents.

## Quick start
```bash
python3 -m pip install -r requirements.txt
python3 scripts/validate_package.py
python3 scripts/run_regression.py
python3 scripts/build_example.py
```

## Package layout
- `config/`: immutable source and fixture lock
- `skills/`: six callable agent skills with explicit routing boundaries
- `specs/`: cross-layer identity and evidence contract
- `schemas/`: JSON schemas for evidence, mappings and visualization plans
- `adapters/`: normalization for PyPTO/Ascend-like traces and pattern catalog records
- `workflows/`: end-to-end task routing and output contract
- `examples/`: sample request and generated visual output
- `tests/fixtures/`: deterministic regression fixtures
- `scripts/`: validators, fixture scanner, regression runner and example builder
- `reports/`: regression outputs

## Evidence levels
`observed` = directly present in source/trace; `derived` = deterministic calculation from observed inputs; `assumed` = explicit scenario assumption; `unknown` = not available. Never upgrade evidence level silently.

## Runtime source scan
The package supports scanning a local `PyPTO3-main/data` tree:
```bash
python3 scripts/scan_pypto_data.py /path/to/PyPTO3-main/data --out reports/pypto-data-scan.json
```
No upstream runtime data is bundled or claimed as scanned unless supplied at execution time.

## v1.1.0 · Scoped execution profile

The legacy example and schema remain available. Single-event legacy normalization
uses an unresolved placeholder when no source identity is supplied; use batch
normalization to distinguish anonymous records within an input.

Generate a local inspector with
`python3 scripts/build_trace_example.py --trace /path/to/full-trace.json`.
The builder verifies the original SHA256, extracts the indexed events, and
writes the inspector and graph under `examples/`. Capture inputs and generated
outputs are kept local. See [Example commands](examples/README.md) and the
[semantic contract](specs/cross-layer-identity-contract.md).

## v1.2.0 · Relation validation

Use the same validator on a scoped relation graph before selecting a Pattern
or generating a view:

```sh
python3 scripts/validate_graph.py --json tests/fixtures/rmsnorm-relation-graph.json
python3 scripts/build_example.py --graph tests/fixtures/rmsnorm-relation-graph.json --out /tmp/relation-check.html
```

The single [rule table](specs/relation-rules.json) records allowed ordered pairs
and required context. It covers 14 relation kinds and 14 object kinds for this
initial projection. The supplied v1.1.0 package has no 39-kind or 48-relation
registry to migrate. The 1.0 legacy and 1.1 pinned-capture formats retain their
existing behavior. See the [contract](specs/cross-layer-identity-contract.md)
for the result semantics and evidence limits.

## v1.3.0 · Unpack source adapter

Project configurations from the pinned Compact FP16 Unpack kernel and validate
case, Task, source-step and candidate bindings before handing them to a view:

```sh
python3 scripts/adapt_unpack.py --kernel /path/to/unpack.cpp --configs examples/unpack-configs.json
```

The kernel must match the reference revision and full-file SHA256 declared in
the adapter. The configuration format is rank 2, axis 1, FP16, with rows
1–4096 and columns 2–15. The result includes scoped references, validated
edges and explicit tail gaps. The AI_Infra checkout's existing Unpack builder
consumes this output when given `--unpack-configs` and `--unpack-out`. These
are source-derived relationships. Device timings and new review results
require separate evidence.
