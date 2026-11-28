from __future__ import annotations
from math import isfinite
from typing import Any

def valid_number(value: Any) -> bool:
    return type(value) is int or (type(value) is float and isfinite(value))

def valid_id(value: Any) -> bool:
    return type(value) is int or (isinstance(value, str) and bool(value.strip()))

def normalize_event(event: dict[str, Any], source_ref: str = "input", *, index: int | None = None) -> dict[str, Any]:
    """Normalize a trace-like event without inventing missing fields."""
    name = event.get("name") or event.get("op") or event.get("kernel") or "unknown"
    layer = event.get("layer") or ("instruction" if event.get("instruction") else "operator")
    allowed = {"model","operator","compiler","instruction","memory","hardware","runtime"}
    if layer not in allowed:
        layer = "runtime"
    identity = next(
        (event[key] for key in ("object_id", "id", "event_id") if valid_id(event.get(key))),
        f"unresolved:record:{index}" if index is not None else "unresolved:record",
    )
    observed = (
        valid_number(event.get("timestamp"))
        or (valid_number(event.get("duration")) and event["duration"] >= 0)
        or valid_id(event.get("event_id"))
        or valid_id(event.get("instruction"))
    )
    return {
        "object_id": str(identity), "object_type": event.get("object_type", "execution_event"),
        "layer": layer, "name": str(name),
        "evidence_level": "observed" if observed else "unknown",
        "source_ref": source_ref,
        "metadata": {k:v for k,v in event.items() if k not in {"id","object_id","name","op","kernel","layer","object_type"}}
    }

def normalize_trace(events: list[dict[str, Any]], source_ref: str = "input") -> list[dict[str, Any]]:
    records = [normalize_event(event, source_ref, index=index) for index, event in enumerate(events)]
    ids = [record["object_id"] for record in records]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate event IDs in one trace input")
    return records
