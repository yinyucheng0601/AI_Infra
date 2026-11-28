import argparse
import html
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def render_relation_graph(graph, results):
    def label(ref):
        return html.escape(f"{ref['scope']} / {ref['id']}")

    by_id = {edge["id"]: edge for edge in graph["edges"]}
    evidence = {item["id"]: item for item in graph["evidence"]}
    rows = []
    for result in results:
        edge = by_id[result["id"]]
        sources = ", ".join(f"{evidence[key]['source']} · {evidence[key]['locator']}"
                            for key in edge["evidence_ids"])
        rows.append(
            f'<tr><td>{label(edge["from"])}</td><td>{html.escape(edge["relation"])}</td>'
            f'<td>{label(edge["to"])}</td><td>{result["result"]}</td>'
            f'<td>{html.escape(result["reason"])}</td><td>{html.escape(sources)}</td></tr>'
        )
    return (
        '<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>Relation validation</title>'
        '<style>body{font:16px system-ui;background:#f8f8f8;margin:2rem}'
        'table{border-collapse:collapse}th,td{padding:.65rem;text-align:left;vertical-align:top}'
        'tbody tr:nth-child(odd){background:white}</style>'
        '<h1>Relation validation</h1><table><thead><tr><th>Source object</th>'
        '<th>Relation</th><th>Target object</th><th>Result</th><th>Reason</th><th>Evidence</th>'
        '</tr></thead><tbody>' + ''.join(rows) + '</tbody></table></html>\n'
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--graph", type=Path, help="A 1.2 scoped relation graph")
    parser.add_argument("--out", type=Path, help="Output HTML for the validated relation graph")
    args = parser.parse_args()
    if not args.graph:
        if args.out:
            parser.error("--out requires --graph")
        build_legacy_example()
        return
    if not args.out:
        parser.error("--graph requires --out")
    from validate_graph import validate
    try:
        graph = json.loads(args.graph.read_text())
        if not isinstance(graph, dict) or graph.get("schema_version") != "1.2":
            raise ValueError("--graph requires schema_version 1.2")
        results = validate(graph)
    except (ValueError, OSError) as exc:
        parser.exit(1, f"Invalid graph: {exc}\n")
    args.out.write_text(render_relation_graph(graph, results), encoding="utf-8")
    print(args.out)


def build_legacy_example():
    plan=json.loads((ROOT/"examples/visualization-plan.json").read_text())
    rows="".join(f"<tr><td>{html.escape(x['object_type'])}</td><td>{html.escape(x['glyph_id'])}</td><td>{html.escape(x['reason'])}</td></tr>" for x in plan["glyph_bindings"])
    page=f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI Infra Semantic Inspector</title><style>body{{font:15px system-ui;background:#f6f7f8;color:#20252b;margin:32px}}main{{max-width:1000px;margin:auto}}section{{background:white;border-radius:12px;padding:20px;margin:16px 0}}table{{width:100%;border-collapse:collapse}}td,th{{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left}}.node{{display:inline-block;padding:12px 16px;background:#e8eef6;border-radius:8px;margin:8px}}small{{color:#5f6b76}}</style><main><h1>Cross-layer semantic inspector</h1><p>Task: {html.escape(plan["task_type"])}</p><section><h2>Logical → compiler → memory</h2><div class="node">Tensor X</div> → <div class="node">Operator</div> → <div class="node">IR Value</div> → <div class="node">Allocation</div><p><small>Edges are illustrative fixture relationships; evidence levels remain in evidence-graph.json.</small></p></section><section><h2>Glyph bindings</h2><table><tr><th>Object</th><th>Approved glyph candidate</th><th>Reason</th></tr>{rows}</table></section><section><h2>Validation contract</h2><p>Unknown object types remain unresolved. Physical address, live residency and source-to-instruction correlation require direct evidence.</p></section></main></html>'''
    out=ROOT/"examples/artifact/index.html"; out.parent.mkdir(parents=True,exist_ok=True); out.write_text(page,encoding="utf-8")
    print(out)


if __name__ == "__main__":
    main()
