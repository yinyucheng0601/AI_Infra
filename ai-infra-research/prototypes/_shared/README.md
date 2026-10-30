# Prototype UI consistency

`demo_ui.py` is called by each demo build and embeds `demo-ui.css` / `demo-ui.js` into the delivered HTML. No runtime dependency on this directory is introduced. Existing case-specific tutorials retain their content; missing tutorials are provided per case.

The shared layer normalizes the top-right SVG actions, provides one delegated hover/focus tooltip for static and dynamic controls, and supplies tutorial code-copy icons with success/failure feedback. Business actions and source/model logic remain in their original pages. Existing canvas tooltip text is relayed so precise reads are retained.

Rebuild each demo using its `build.py`, then run `ai-infra-research/scripts/build.py` to synchronize collected patterns and Skill packages. `consistency-review.json` records checked final entry pages and verification limits. Template HTML and tutorial fragments are build inputs, not additional standalone demos.
