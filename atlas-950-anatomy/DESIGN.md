# NPU supernode anatomy

Source: ../atlas-950-explorer/index.html, ABOUT dialog. This is a separate
artifact; the source explorer is unchanged. Local source claims are retained,
not independently certified or refreshed from the external links.

Concept: choose one cabinet in a scale array, pull its compute drawer along
its rails, then lift the cold plates to expose the NPU packages. The motion
explains containment, mechanical insertion and thermal contact, not traffic,
latency or performance.

The 16-cabinet equivalent is 1024 / 64. It is not a bill of materials or a
documented physical topology. The 32 x 2 drawer arrangement is explicitly
inherited as a layout assumption. 950DT specifications remain separate from
the 1024-card, 256-TB, 1-EFLOPS display configuration.

Parts inventory, before geometry:
- Base: floor bed, four supporting pads, rack plinth, four rack feet (10).
- Structure: two cabinet sides, back, crown, two front posts, two drawer
  rails, drawer floor, two drawer sides, front fascia (12).
- Mechanism: 32 drawer fronts; two pull mounts and pull bar; backplane
  carrier; six blind-mate connector shells; eight contact inlays (50).
- Subject: two NPU substrates, two package caps, eight memory regions,
  two cold plates and eight mounting pads (22).
- Support: CPU substrate and cap, four DIMMs and four sockets, two lower
  equipment chassis, ventilation slots, mounting screws (12+).

Revision: full-viewport, automatic animation with a compact bottom stepper. One world projection and one cabinet template are reused across all 16 cabinets. The top drawer contains the exact detailed assembly from the beginning; no scene swap or substitute geometry. Camera moves from array to cabinet to drawer, which slides 70 world units forward. NPU assemblies and cold plates then separate vertically. Surrounding cabinets and enclosure fade as focus narrows. A 46-second reversible timeline returns to its starting pose without a jump. Reduced motion starts paused. Source and specification boundaries above remain unchanged.

Visual revision: neutral white/gray materials, darker side faces and outlines, blurred projected ground and component contact shadows. Single bottom transport bar controls the same continuous timeline.

Source-alignment correction: buildRackSystems/build() in the original explorer places 32 drawers in two banks, each 8 rows by 2 columns (x = ±.13; bank starts .16 and 1.384). Two Lingqu sidecars are at .99 and 1.26; two power shelves at 1.115 and 1.1623; patch at 2.2. The selected drawer is the lower left drawer of the upper bank (source computeUnits[16]). SVG dimensions follow these relative positions; authored silhouettes are still SVG reconstructions, not the original GLB meshes. The long tray now retains front disks, rear fans/connectors, bilateral memory, two longitudinal NPU packages/cold plates, longitudinal liquid pipes, rear blind-mate couplings and removable front shroud. No hardware layout inferred beyond source. Ground shadow shares the frame bottom elevation, with the former floating decorative plinth removed.


## Five-step assembly flow
Overview keeps simplified double-column drawer banks and network/power bands, with lower contrast than the cabinet outline. The selected rack resolves into full detail before the same drawer slides forward. The exploded state separates components into distinct vertical bands; bilingual callouts use pale horizontal leaders at actual anchor heights. Drive carriers include depth. The airflow shroud is removed. A fifth step focuses on the first existing NPU package, fading other objects rather than substituting a new model. Playback is a reversible 64-second sequence, with selection stops at 0, 8.5, 17, 24, and 32 seconds. Package geometry remains the existing reconstruction, not an independently validated die layout.


Playback revision: a 30-second round trip maps five stop points to 0, 3.5, 7, 11, 15 seconds. Each transition retains quintic ease-in/out, with short endpoint dwell. Exploded components now preserve their original projected horizontal positions and move vertically only; blind-mate couplings share the cold-plate lift.
