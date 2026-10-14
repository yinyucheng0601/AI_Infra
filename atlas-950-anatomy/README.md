# Atlas 950 Anatomy

Open `index.html` for a full-window automatic 46-second looping animation: cabinet array, selected cabinet, drawer extraction, exploded NPU and cold plates, then continuous reverse assembly. A compact bottom player supports pause/resume, reset, four step selections and timeline scrubbing. Selecting a step or resetting pauses playback. Reduced-motion preference starts paused. Neutral grayscale faces and soft ground/contact shadows preserve mechanical depth.

Build: `node build.mjs`. Requires the installed Anatomy kit at the path imported by build.mjs. Generated HTML is standalone. `index-dark.html` provides the dark variant.

See DESIGN.md for source attribution and specification boundaries; ANATOMY-LICENSE.txt for kit licensing. Earlier checks JSON and shots document the previous interactive UI, not this animation revision.

Current verification: player-checks.json exercises all four steps, pause/resume and reset at 1440 × 1000; console clean. Final screenshots: shots/player-exploded.png and shots/player-rack.png.
