# Lingqu hardware system v1

The authoritative source is this directory. `hardware-system.js` exports `LingquHardware` with version, `composeBoard`, `board`, and `applyCopper`.

- `hw-glyphs-v2.js`: five approved user SVGs, including independent dark/light assets.
- `approved-icons.js`: `deployment-hw-*` symbol installation; old `hw-*` are reference only.
- `lingqu-physical.js`: board geometry, endpoint locations and parallel link bundles.
- `hardware-system.js`: Host / Compute / Switch / Expansion / Board-to-Board composition and board selection adapter. Training calls `composeBoard`; inference calls `board`.
- `lingqu-physical.css`: selected/dim devices, 5% white selected surface, brighter selected labels and dark/light rules.
- `ep-copper.js`: copper material with center-terminated pads. This represents selected communication relations; it does not establish measured physical paths.

Training loads these source files directly; build-offline.py produces its single HTML. Inference uses the same sources through `layer_stack/scripts/sync-hardware-glyphs.cjs`, which creates JS/CSS bundles, a SHA256 source manifest and embedded offline assets.

Regenerate with `rtk node layer_stack/scripts/sync-hardware-glyphs.cjs`; validate with the same command plus `--check`. A stale source, generated file or inline block fails validation. After any shared source change, regenerate both consumers and run their browser smoke checks.

Consumer adapters supply model placement, focus, metrics and callbacks; they must not silently reinterpret template placement as measured deployment.

The training offline build automatically runs the inference fingerprint check. A stale consumer fails the build instead of silently publishing old hardware. Workspace AGENTS.md directs future hardware work to this contract.
