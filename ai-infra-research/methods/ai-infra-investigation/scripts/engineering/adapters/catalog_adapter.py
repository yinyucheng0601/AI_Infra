def route_semantic_object(object_type: str, task_type: str) -> dict:
    """Conservative routing table; unknowns remain unresolved instead of guessing."""
    table = {
      "tensor": ("system-value", "data-2", "tensor-lineage"),
      "parameter": ("system-value", "data-4", "training-graph"),
      "gradient": ("system-value", "data-4", "training-graph"),
      "operator": ("system-op", "system-op", "operator-inspector"),
      "kernel": ("system-kernel", "system-kernel", "compiler-pipeline"),
      "instruction": ("system-instruction", "system-instruction", "compiler-pipeline"),
      "rank": ("system-rank", "system-rank", "rank-shard-matrix"),
      "memory": ("system-memref", "system-memref", "memory-lifecycle"),
      "collective": ("relation-data", "relation-data", "communication-topology")
    }
    if object_type not in table:
        return {"status":"unresolved","object_type":object_type,"task_type":task_type,"reason":"No approved mapping in package registry"}
    glyph, variant, pattern = table[object_type]
    return {"status":"candidate","object_type":object_type,"task_type":task_type,"glyph_id":glyph,"variant":variant,"pattern_id":pattern,"requires_source_confirmation":True}
