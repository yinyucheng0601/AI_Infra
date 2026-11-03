# Computation drawer glyph sources

The drawer uses the approved assets specified by the llm-compute-diagrams skill.
Repository source: `methods/llm-compute-diagrams/assets/approved-glyphs/`.

| Instance | Source |
| --- | --- |
| Local computation | diagram-legend-library ir-op, pypto-compilation-guide/index.html op() (neutral gray) |
| Communication | system-op.svg, communication variant, with requested bidirectional arrow badge |
| Residual addition | system-add.svg, add variant |
| Activation, parameter, gradient tensors | 01.4 data roles (data-4), training-parallel-communication-v1.html tensorNode / dataTiles |

`approved-glyphs.js` embeds the residual and communication base fragments and adapts
the OP and data-role renderer rules so the file:// page works without fetch.
It is not a byte-identical copy of every source. `glyph-provenance.json` records
the current upstream renderer function hashes; `audit-graph.cjs` checks them.
The legacy `sources` array documents the embedded static fragments, including
`data-2` matrix support; the live tensor uses `data-4` renderer rules.
The computation capsule reuses the library op() geometry and function badge,
with neutral gray colors. Communication retains its capsule and dashed outline,
and adds a black circular badge with bidirectional arrows. Labels shift right
to reserve badge space; dimensions and connection anchors remain unchanged.
The approved capsule styles are scoped in rank-workbench.css.
Tensor nodes reuse the data-role renderer's 11px tiles, 3px gaps, 0.22 opacity,
6px corner radius and stroked internal labels. Their height is extended to 62.4
to fit the name and local shape/capacity on two internal lines.

`compute-graph.js` composes these primitives with explicit SVG connections.
The layout follows training-parallel-communication-v1 P18; behavior follows the
atlas configuration. ZeRO is off, so no ZeRO AllGather or ReduceScatter is invented.
The diagram shows one representative layer, not a measured timeline.
Matrix cells are illustrative, not literal tensor dimensions.

Search and layer selection remain inside the initially collapsed locator.
The drawer is excluded from the Liquid Glass registration list.

Local extensions: 62.4 px tensor height; shape and capacity metadata; compact partition indices; at most 16 column or 8 row partitions centered around the selected shard. The full partition count remains in the label and full range in the custom tooltip.
