# Example artifact

Run `python3 scripts/build_example.py` to regenerate `artifact/index.html`.
The diagram is a visual composition of the deterministic fixture and is not a claim about a live device trace. Check `visualization-plan.json` and the evidence graph for mapping and provenance.

## DeepSeek V4 trace path

Supply a local copy of the pinned capture:

```sh
python3 scripts/build_trace_example.py --trace /path/to/full-trace.json
python3 scripts/validate_graph.py --trace /path/to/full-trace.json examples/trace-evidence-graph.json
```

Then open the locally generated `artifact/deepseek-trace.html`. The builder
checks the source hash and extracts raw event indexes 1110, 1112 and 1269.
Host runner windows measure host-side intervals. Device activity and placement
require further evidence.
