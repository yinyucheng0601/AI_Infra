"""Build the offline trace inspector from a validated graph."""
import argparse
import html
import json
from pathlib import Path

from validate_graph import ROOT, ref_key, validate, validate_source
from adapters.deepseek_capture import project, read_excerpt

EXAMPLE = ROOT / "examples"


def inspector(graph):
    def escape(value):
        return html.escape(str(value), quote=True)

    by_ref = {ref_key(obj["ref"]): obj for obj in graph["objects"]}
    by_evidence = {row["id"]: row for row in graph["evidence"]}
    sections = []
    for obj in graph["objects"]:
        native = by_evidence[obj["evidence_id"]]
        record_id = escape(obj["ref"]["id"])
        relationships = []
        for edge in graph["edges"]:
            if edge["from"] != obj["ref"]:
                continue
            target = by_ref[ref_key(edge["to"])]
            state = {"confirmed": "字段已核对", "unknown": "待核查"}[edge["status"]]
            label = escape(target["kind"])
            if edge["status"] == "confirmed":
                label = f'<a href="#{escape(target["ref"]["id"])}">{label}</a>'
            relationships.append(f'<p>{label} · {state}<br>{escape(edge["reason"])}</p>')
        sections.append(
            f'<section id="{record_id}" tabindex="-1"><h2>{escape(obj["kind"])}</h2>'
            f'<p><code>{record_id}</code> · 原始记录 <code>traceEvents[{native["locator"]["index"]}]</code></p>'
            + "".join(relationships)
            + '<details><summary>查看原始事件</summary><pre>'
            + escape(json.dumps(native["record"], ensure_ascii=False, indent=2))
            + '</pre></details></section>'
        )
    capture = graph["capture"]
    return """<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>DeepSeek V4 · 运行链路核查</title>
<style>
body{margin:0;background:#f8f8f8;color:#202420;font:16px/1.6 system-ui,sans-serif}
main{max-width:780px;margin:auto;padding:32px 20px}
h1,h2{line-height:1.25;margin:0 0 12px}section{background:white;padding:20px 24px;margin:12px 0;border-radius:12px;scroll-margin-top:12px}
section:target{background:#f5efb3}a{color:#234c39}a:focus-visible,summary:focus-visible{outline:none;background:#f5efb3;text-decoration:underline}
summary{cursor:pointer}code,pre{overflow-wrap:anywhere}pre{white-space:pre-wrap;font-size:.85em}
</style><main><h1>DeepSeek V4 · 运行链路核查</h1>
<p>从 Host dispatch 定位调用与 Runner，逐段核对原始 Trace 字段。物理设备归属和芯片内部执行时间未观测。</p>
""" + "".join(sections) + (
        f'<h2>采集来源</h2><p>{escape(capture["source"])}<br>'
        f'SHA256 <code>{escape(capture["sha256"])}</code></p>'
        '<p><a href="../trace-evidence-graph.json">查看证据图 JSON</a> · '
        '<a href="../deepseek-trace-excerpt.json">查看原始事件摘录</a></p></main></html>\n'
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--trace", type=Path, required=True, help="Local copy of the pinned capture")
    parser.add_argument("--out-dir", type=Path, default=EXAMPLE,
                        help="Output directory for the graph, excerpt and artifact")
    args = parser.parse_args()
    try:
        excerpt = read_excerpt(args.trace)
        graph = project(excerpt)
        validate(graph)
        validate_source(graph, excerpt)
    except (ValueError, OSError) as exc:
        parser.exit(1, f"{exc}\n")
    example = args.out_dir
    artifact = example / "artifact" / "deepseek-trace.html"
    artifact.parent.mkdir(parents=True, exist_ok=True)
    (example / "trace-evidence-graph.json").write_text(json.dumps(graph, ensure_ascii=False, indent=2) + "\n")
    artifact.write_text(inspector(graph))
    (example / "deepseek-trace-excerpt.json").write_text(json.dumps(excerpt, ensure_ascii=False, indent=2) + "\n")
    print("Verified original trace SHA256 and event locators")
    print(artifact)


if __name__ == "__main__":
    main()
