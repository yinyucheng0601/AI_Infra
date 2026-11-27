# Output contract
Every deliverable contains:
- `artifact/`: rendered view or code output
- `manifest.json`: source commit, fixtures, pattern/glyph references and generation timestamp
- `evidence-graph.json`: normalized objects and edges
- `validation.json`: test counts, failures, warnings and scope
- `README.md`: how to inspect and rerun
No success claim is permitted for a test that did not execute. Browser visual inspection and device-side runtime validation must be separately marked.

For the scoped execution profile, validate the 1.1 graph before generating a
view. Preserve `{scope, id}` through selection and evidence lookup. Display
unknown relations without inferred targets or timings. Report validation scope
separately for schema, semantic checks, original-capture recheck, browser and
device. Keep evidence indexes and raw fields available in offline deliverables.
