---
name: observability-design-style
description: Organizes overview, inspectors, evidence panels, assumptions and investigation handoffs. It controls information hierarchy and diagnostic workflow, not glyph semantics.
---

# observability-design-style

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
Organizes overview, inspectors, evidence panels, assumptions and investigation handoffs. It controls information hierarchy and diagnostic workflow, not glyph semantics.

## Required output
A concise conclusion, evidence graph, visualization plan, provenance, validation report and explicit unresolved items.
