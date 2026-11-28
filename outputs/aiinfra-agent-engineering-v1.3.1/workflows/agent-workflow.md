# Agent workflow

1. **Intake**: classify task as operator investigation, training observability, inference observability, compiler explanation, or mechanism explanation.
2. **Evidence acquisition**: enumerate supplied files/traces and locked repository sources; record missing inputs.
3. **Semantic normalization**: build an evidence graph with stable logical IDs and distinct physical representation IDs.
4. **Relationship validation**: check direction, type, identity consistency, rank/shard scope and provenance.
5. **Pattern routing**: choose an exact catalog ID based on the task. Run `scripts/register_design_assets.py --asset <id>` with the checkout and output path described in the README. Treat legacy routing table outputs as search hints only. Check the selected entry, source hashes, dependency gaps and browser evidence before binding assets.
6. **Glyph binding**: map semantic object to approved item/variant/SVG/renderer; unresolved types stay textual.
7. **Presentation planning**: overview → inspector → evidence → drilldown → agent action; keep graph topology and time sequence distinct.
8. **Generation**: create offline HTML/SVG/JS or requested target; keep data, view and interaction model separate.
9. **Regression**: validate schemas, IDs, edges, source lock, glyph/pattern binding, offline assets and fixture invariants.
10. **Delivery**: include artifact, manifest, provenance, known gaps and machine-readable regression report.

For the 1.1 scoped execution example, use the existing investigation route.
Project the pinned capture with `adapters/deepseek_capture.py`. Run
`scripts/validate_graph.py` before passing the evidence graph to presentation.
Stop on invalid records or source mismatch. Show legal evidence gaps as unknown.
The evidence graph supplies identity and facts; the presentation stage chooses
the view and navigation.

For a 1.2 relation graph, run `scripts/validate_graph.py --json <graph>` after
normalization and before Pattern routing. Reject invalid graphs and pass the
per-edge result forward. Candidate, ambiguous and insufficient-evidence rows
remain pending. The `build_example.py --graph ... --out ...` path applies the
same gate before writing an offline view.

For a pinned Compact FP16 Unpack task, use `scripts/adapt_unpack.py` with the
kernel and configuration file in the evidence stage. Give the validated
bindings and gap ranges to the existing Unpack workbench. Preserve the
configuration and source digest in every investigation handoff. For any new
configuration, keep the source-derived binding and review result separate.
