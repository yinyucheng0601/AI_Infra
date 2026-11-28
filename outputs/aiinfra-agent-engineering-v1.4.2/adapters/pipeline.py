"""Read-only inspection of Python AST, Chrome Trace and structured records."""
import ast
import json
from math import isfinite
import re
from pathlib import Path

from adapters.contract import identity, member

DESCRIPTORS = {
    "python-ast": {"version": "1", "format": "Python", "scope": "static syntax"},
    "chrome-trace": {"version": "1", "format": "Chrome Trace", "scope": "event records"},
    "ir-text": {"version": "1", "format": "PTO/MLIR text", "scope": "line inventory"},
    "cpp-text": {"version": "1", "format": "C/C++", "scope": "line inventory"},
    "json": {"version": "1", "format": "JSON", "scope": "structural inventory"},
    "jsonl": {"version": "1", "format": "JSONL", "scope": "structural inventory"},
}


def json_records(value):
    if isinstance(value, list):
        return [(f"/{i}", item) for i, item in enumerate(value)]
    return [("", value)]


def inspect(root, inputs):
    root = root.resolve()
    files = set()
    for source in inputs:
        path = source if source.is_absolute() else root / source
        path = path.resolve()
        if not path.is_relative_to(root):
            raise ValueError(f"Input outside root: {source}")
        files.update(candidate for candidate in (path.rglob("*") if path.is_dir() else [path])
                     if not candidate.is_symlink() and (not path.is_dir() or candidate.is_file())
                     and not any(part.startswith(".") for part in candidate.relative_to(root).parts))
    result = {"contract_version": "1.0", "adapter_id": "builtin-inspector", "adapter_version": "1",
              "sources": [], "objects": [], "relations": [], "evidence": [], "unresolved": [],
              "diagnostics": [], "native_records": [], "adapters": DESCRIPTORS}
    for path in sorted(files):
        relative = path.relative_to(root).as_posix()
        try:
            if path.stat().st_size > 64 * 1024 * 1024:
                raise ValueError("Input exceeds 64 MiB inspection limit")
            raw = path.read_bytes()
            source = member(relative, raw)
            result["sources"].append(source)
            text = raw.decode("utf-8")
            adapter, records, gaps = parse(path, text)
            source["adapter"] = adapter
            result["unresolved"].extend({"source": relative, **gap} for gap in gaps)
            for locator, kind, payload in records:
                scope = {"path": relative, "snapshot": source["sha256"]}
                ident = identity(kind, "record", adapter, locator, scope)
                evidence_id = "evidence:" + ident
                result["native_records"].append({"id": ident, "value": payload})
                result["objects"].append({"ref": {"scope": relative, "id": ident}, "kind": kind,
                                          "evidence_ids": [evidence_id], "identity_scope": scope})
                result["evidence"].append({"id": evidence_id, "source": relative,
                                           "sha256": source["sha256"], "locator": locator,
                                           "level": "observed"})
        except (ValueError, OSError, SyntaxError) as error:
            result["diagnostics"].append({"source": relative, "status": "failed", "message": str(error)})
    incomplete = bool(result["diagnostics"] or result["unresolved"])
    result["extraction_status"] = ("partial" if result["objects"] else
                                   "failed" if result["diagnostics"] else "unsupported") if incomplete else "complete"
    result["coverage"] = {key: len(result[key]) for key in (
        "sources", "objects", "relations", "evidence", "unresolved", "diagnostics")}
    return result


def parse(path, text):
    head = text.lstrip()
    if head.startswith(("{", "[")) or path.suffix in (".json", ".jsonl"):
        if path.suffix == ".jsonl":
            records, gaps = [], []
            for i, line in enumerate(text.splitlines(), 1):
                if not line.strip():
                    continue
                try:
                    records.append(({"line": i}, "native_record", json.loads(line)))
                except ValueError:
                    gaps.append({"line": i, "reason": "Invalid JSONL record"})
            return "jsonl", records, gaps
        value = json.loads(text)
        if isinstance(value, dict) and isinstance(value.get("traceEvents"), list):
            return trace_records(value)
        if isinstance(value, dict) and {"chip_swimlane_level", "aicore_tasks", "metadata"} <= value.keys():
            return "json", [({"pointer": ""}, "native_record", value)], [
                {"reason": "PyPTO3 DFX candidate; producer semantics not validated"}]
        return "json", [({"pointer": pointer}, "native_record", item)
                        for pointer, item in json_records(value)], []
    if path.suffix == ".py":
        tree = ast.parse(text)
        kinds = {ast.FunctionDef: "function", ast.AsyncFunctionDef: "function",
                 ast.Call: "call_expression", ast.For: "loop", ast.While: "loop",
                 ast.arg: "parameter"}
        records = []
        for node in ast.walk(tree):
            kind = kinds.get(type(node))
            if kind:
                locator = {"line": node.lineno, "column": node.col_offset + 1,
                           "end_line": node.end_lineno, "end_column": node.end_col_offset + 1,
                           "column_unit": "utf8-byte"}
                records.append((locator, kind, {"syntax": ast.get_source_segment(text, node)}))
        return "python-ast", records, []
    if path.suffix in {".mlir", ".pto", ".ir"} and re.search(r"\b(?:module|func\.func|func)\b", text):
        return line_inventory("ir-text", text, r"\S", "SSA and operation semantics not resolved")
    if path.suffix in {".c", ".cc", ".cpp", ".cxx", ".h", ".hpp"}:
        return line_inventory("cpp-text", text, r"\b(?:for|while|namespace|struct|class)\b|\w+\s*\(",
                              "Lexical matches only; macros and compiler semantics not resolved")
    return None, [], [{"reason": "Unsupported file content", "suffix": path.suffix,
                       "bytes": len(text.encode("utf-8"))}]


def line_inventory(adapter, text, expression, limitation):
    records = []
    for line, value in enumerate(text.splitlines(), 1):
        match = re.search(expression, value)
        if match:
            records.append(({"line": line, "column": match.start() + 1}, "syntax_line", value))
    return adapter, records, [{"reason": limitation}]


def trace_records(value):
    records, gaps = [], []
    for index, event in enumerate(value["traceEvents"]):
        locator = {"pointer": f"/traceEvents/{index}", "event_index": index}
        if not isinstance(event, dict) or not isinstance(event.get("ph"), str):
            gaps.append({**locator, "reason": "Invalid event"})
            continue
        records.append((locator, "trace_event", event))
        if event["ph"] == "X" and any(
                type(event.get(key)) not in (int, float) or not isfinite(event[key])
                or event[key] < 0 for key in ("ts", "dur")):
            gaps.append({**locator, "reason": "Invalid duration or timestamp"})
        if event["ph"] in {"B", "E", "s", "t", "f"}:
            gaps.append({**locator, "reason": "Pairing and flow identity not resolved"})
    return "chrome-trace", records, gaps
