# Shared hardware visualization

- CPU, NPU, DPU, NIC and switches use the approved sources in `ai-infra-research/patterns/training-graph/deployment-pattern/`. Read `HARDWARE-SYSTEM.md` there before hardware integration.
- Reuse `hardware-system.js` for board hierarchy and `lingqu-physical.css` for selection, rather than copying only device SVGs or using old `hw-icons.js`. The old symbols are Before/reference assets.
- Inference embeds are generated with `rtk node layer_stack/scripts/sync-hardware-glyphs.cjs`; run its `--check` mode after source or consumer changes. Do not edit generated bundles or embeds directly.
- Keep host model data and selection callbacks independent of shared hardware geometry. Reuse 5% white selected surfaces and theme-specific approved SVGs.
- Prefix shell commands with `rtk`.
