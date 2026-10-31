# Compute / Golden integration

Source: compute-golden.js, comparison.js, page.html; build.py generates the standalone and catalog package.
Interaction reference: user-provided rmsnorm-compute-golden-reference.html. Its instructions and numeric/threshold placeholders are not data inputs.

The computation graph maps square/mean to partial-square-sum steps; epsilon/rsqrt to the combined rstd step; both multiplies to normalization; all stores to one complete output Y. Golden is a reference layer of that output, not a second output tensor. Selection fills are neutral; existing resource-role colors remain in execution/data views.

The pre-existing performance model, byte traffic, queue evidence and source-step coordinates are unchanged. The scene receives a fixed vertical offset to make room for the graph. Opening/closing local panels never fits or changes the camera. Y uses a persistent row/column window and element selection across NPU/Golden/error modes. No NPU array, Golden array, tolerance or validation result is provided; every value remains unavailable.

Browser smoke: default X0 and hardware panel; Y panel; select Y[1,1], switch Golden with same selection; Sigma0 panel, source links and hardware Vector association. Build and catalog validation pass. No device numerical validation performed.

## CPU Golden and formal OP correction

GoldenRmsNorm and the host RNG recipe were already in model.json's pinned rms_norm_direct.asc source. generate-golden.py extracts the exact function and regenerates the 4x6 window on the local CPU using that seed, distribution, full-X-then-gamma draw order and epsilon. golden-window.json records compiler and source hashes. No original device tensor array is available in this snapshot. C++ uniform_real_distribution is implementation dependent; these values are local CPU references, not a reconstruction claimed identical to a different host toolchain. FP32 cases only; BF16 is left unavailable. NPU and error layers remain unavailable.

OPs now directly execute the formal library build.cjs opNode/opGlyph renderer and op-icons.js for mean/rsqrt, and VisualSystem.node add/multiply for arithmetic circles. Tensor objects retain GridTensor. Edges are derived from the rendered node bounds. Shared library sources remain unchanged.

Default view: computation visible; buffer lifecycle and hardware hidden. Compute dock pill toggles its layer; fit uses the actual visible SVG bounds and viewport margins. Golden starts off; enabling it opens the output panel directly in Golden mode with numeric cells. OPs use larger formal renderers and typography.

## Inline comparison revision
Golden now expands a same-scene 4x6 index grid under Y. Each cell shows Mock NPU, CPU Golden and signed delta together; clicking an index updates a precise readout. No modal or three-mode switch is used for output comparison. NPU Mock = float32(g * (1 + ((i % 7) - 3) * 0.000012) + ((i % 3) - 1) * 0.000002). This is a deterministic interaction fixture, not device execution or a claimed accuracy result.

Read-only search of /private/tmp/cannbot-sync-evidence/ops/ops-theoretical-performance-estimation found no .bin/.npy/.npz tensor dumps. rms_norm README lines 31-35 describes RESULT summary output and external measured CSV; rms_norm_direct.asc prints maxRel/PASS after comparing in-memory hY. This bounds the claim to the inspected local checkout, not every external artifact.

Address plot crops trailing no-interval area at the last occupied 8 KiB band. Remaining tick labels retain original byte coordinates; cropping is not a deallocation event.

Y expansion now replaces the collapsed output glyph with the expanded numerical tensor; there is no duplicate small Y. Incoming and writeback association edges terminate at the expanded tensor boundaries. Collapsed Y includes a visible click-to-expand hint; expanded Y has a collapse control. Gamma is lowered to clear the multiply label.

## Correctness policy and semantic mapping
Execution events now carry explicit event_id, compute_node_ids, chunk/phase and pinned source_location. goldenMatches uses only compute_node_ids; display-label changes do not change graph matching. Reduction mean maps to partial reduction and combined coefficient steps. Source references are attached when building events.

FP32 defaults to the captured host rule: max(abs(NPU-G)/(abs(G)+1e-6)) < 0.002, with a strict boundary. Custom mode uses inclusive abs(NPU-G) <= atol + rtol*abs(G), accepts finite nonnegative tolerances and stays unjudged until both are supplied. Settings are scoped to case IDs (shape/dtype). Plain maximum relative error uses abs(G) without the source denominator stabilizer, with zero/zero=0 and nonzero/zero=Infinity. Counts and metrics cover only the displayed 24 Mock values, not full tensors. BF16 remains unavailable. Browser checks: source policy 0/24 failures; custom atol=rtol=0 gives 23/24 failures; failed cells receive a muted failure fill. No device correctness claim.
