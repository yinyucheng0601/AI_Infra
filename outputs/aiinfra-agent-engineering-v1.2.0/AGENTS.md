# Agent Engineering Contract

This package converts AI Infra engineering questions and runtime evidence into source-grounded, inspectable visual artifacts.

## Hard rules
- Use only the locked source repository and pinned commit in `config/repository-lock.json`.
- `DevKit` and `pto/vendor/pto-design-system` are excluded. Do not import their assets or semantics.
- Do not modify or publish the source repository.
- Domain semantics choose the relationship; glyph library chooses the glyph geometry; patterns choose the interaction composition.
- Never infer runtime measurements from diagrams or fixture examples. Preserve `observed`, `derived`, `assumed`, and `unknown` provenance.
- Preserve stable identity across model/operator/compiler/instruction/memory/hardware views only where evidence supports the mapping.
- Missing evidence must remain an explicit gap, not be filled with fabricated edges.
- Agent output must include a machine-readable manifest and a human-readable explanation.
- Prefer offline-capable HTML/SVG/JS artifacts; network access may be used only for cited source links.
- All generated controls need one tooltip and keyboard focus; no double native/custom tooltip.
- Selection must not use outline/border/box-shadow rings; use filled state and readable text.
- Keep light neutral backgrounds. Do not introduce dark-blue/dark-blue-gray visual systems.
