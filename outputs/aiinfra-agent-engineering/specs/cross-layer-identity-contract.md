# Cross-layer identity & evidence contract

## Identity
A logical object has one stable `object_id` independent of its current representation. A physical realization is a separate `representation_id`; a mapping edge connects them and records its evidence.

| Layer | Typical objects | Identity rule |
|---|---|---|
| Model | parameter, activation, residual, loss, gradient | logical semantic identity |
| Operator | input/output tensor, intermediate, reduction result | preserve lineage; operator invocation is distinct |
| Compiler | IR value, layout, tile, pass result | new representation; link via `derived_from` |
| Instruction | instruction instance, task, kernel | execution identity; do not conflate task/kernel/instruction |
| Memory | allocation, buffer, address range, residency | physical storage identity, time-bounded |
| Hardware | core, rank, NPU, collective domain | execution placement identity |

## Required fields
`object_id`, `object_type`, `layer`, `name`, `evidence_level`, `source_ref`. Optional `shape`, `dtype`, `layout`, `rank`, `device`, `time_range`, `physical_address` must be omitted or `unknown` unless measured.

## Relationships
Allowed typed edges: `consumes`, `produces`, `transforms`, `shards_to`, `placed_on`, `stored_in`, `communicates_with`, `derived_from`, `observed_during`, `same_logical_value_as`.
Every edge includes `edge_id`, `from`, `to`, `relation`, `evidence_level`, `source_ref`. A mapping is not proof of causality.

## Evidence semantics
- observed: source or trace explicitly records the fact.
- derived: reproducibly calculated from observed facts and a declared formula.
- assumed: scenario parameter or user-provided hypothesis.
- unknown: unavailable; never substitute a plausible value.

## Scope boundaries
PMU counters can characterize hardware activity but do not, alone, provide complete tensor lifecycle, source-to-instruction semantics, complete physical address read/write lineage, or exact model-parameter-to-event causality. Such claims require compiler/runtime instrumentation and explicit correlation IDs.

## Scoped execution profile (1.1)

This interoperable projection implements the execution subset verified by the
DeepSeek V4 capture. The upstream Task Contract owns scoped reference semantics.
The pinned Critical Path Swimlane provenance owns this capture's extraction
rules. A 1.1 graph records their upstream reference revision alongside its input
trace digest. The existing 1.0 graph format remains available for legacy fixtures
and callers. Legacy IDs are local to their dataset. A legacy edge does not gain
a verified 1.1 identity or evidence record automatically.

- **Identity.** A reference is `{scope, id}`. This profile scopes it to the trace
  SHA256 and uses the raw event index as the source-native record locator. A
  repeated event name cannot stand in for an execution identity. PID and worker
  ID do not establish physical device identity. Definition IDs are outside the
  scope of this execution-only profile.
- **Evidence.** Evidence records preserve the native event and its original
  `traceEvents` index. An object cites its native record. A confirmed edge cites
  both endpoint records and must satisfy the relationship's matching rule.
  Unknown is a valid unresolved outcome. Invalid endpoint, scope, or evidence
  references fail validation.
- **Relations.** `dispatch_corresponds_to_call` goes from `node.dispatch` to
  `chip.run`, based on equal native `run_id` and `dispatch_id`.
  `call_contains_runner` goes from `chip.run` to `chip.run.runner_run`, based on
  matching PID, TID and invocation plus interval containment. Field match
  confirms an observed association, without establishing causes or global
  cardinality. This excerpt demonstrates one path.
- **Time.** Complete events carry microsecond intervals scoped to a process clock
  domain. Compare only intervals in the same domain. Cross-process field joins
  do not imply clock alignment. Runner windows are host observations.
- **Presentation.** Confirmed relations expose target navigation by scoped
  identity. Unknown relations show their missing basis. The inspector exposes
  source events and does not derive new relationships from display position.

The shipped schema checks shape. `scripts/validate_graph.py` checks identity,
typed relationships, evidence, time and source consistency against the original capture supplied with
`--trace`. The builder requires the same input. Additional domains should extend the profile only when a
producer and consumer can verify actual source data.
