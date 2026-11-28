"""Lossless envelope for legacy graphs without upgrading evidence claims."""
from copy import deepcopy


def wrap(validated_graph):
    return {"contract_version": "1.0", "adapter_id": "legacy-graph-envelope",
            "adapter_version": "1", "legacy_graph": deepcopy(validated_graph),
            "extraction_status": "legacy-preserved",
            "conversion_gaps": ["Legacy evidence and locators retain their original representation"]}


def unwrap(result):
    if result.get("adapter_id") != "legacy-graph-envelope":
        raise ValueError("Expected a legacy graph envelope")
    return deepcopy(result["legacy_graph"])
