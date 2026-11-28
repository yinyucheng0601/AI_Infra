---
name: ai-infra-investigation
description: Routes complete AI Infra investigations across model, operator, compiler, deployment, communication and runtime evidence. It coordinates evidence acquisition, graph normalization, pattern/glyph selection, generation and regression. It does not invent missing trace data or claim generic framework parsing.
---

# ai-infra-investigation

## Inputs
User question, source files, trace/runtime artifacts, optional hardware topology and output target.

## Procedure
1. Restate the diagnostic question as objects, relationships and required evidence.
2. Read `AGENTS.md`, `config/repository-lock.json` and the relevant contract.
3. Separate observed facts, deterministic derivations, assumptions and unknowns.
4. Use stable IDs for logical objects; create separate IDs for compiler/runtime/memory realizations.
5. Select a task-specific pattern before binding glyphs.
6. Reuse approved glyph IDs/variants. If no exact match exists, render a labeled neutral placeholder and record the unresolved mapping.
7. Generate an inspectable artifact and provenance manifest.
8. Run `python3 scripts/run_regression.py` and report exact executed scope.

## Non-goals
Routes complete AI Infra investigations across model, operator, compiler, deployment, communication and runtime evidence. It coordinates evidence acquisition, graph normalization, pattern/glyph selection, generation and regression. It does not invent missing trace data or claim generic framework parsing.

## Required output
A concise conclusion, evidence graph, visualization plan, provenance, validation report and explicit unresolved items.

For scoped execution graphs, follow the [cross-layer contract](../../specs/cross-layer-identity-contract.md)
and run the package graph validator before presenting confirmed relationships.
Keep unresolved associations visible as evidence gaps.

For a 1.2 relation graph, run `python3 scripts/validate_graph.py --json <graph>`
before translating relations to a Pattern or generating a view. Stop on an
invalid graph. Display only `VALID` results as confirmed relations. Keep
candidate, ambiguous and insufficient-evidence items visible as unresolved when
they matter to the task. A scoped object reference or matching kind does not
supply evidence for a mapping.

For the pinned Compact FP16 Unpack source profile, use `scripts/adapt_unpack.py`
before presentation. Keep the candidate, case, Task and source step scoped to
the current configuration. Expose uncovered tail rows as evidence gaps and
carry their source anchors into the handoff.
