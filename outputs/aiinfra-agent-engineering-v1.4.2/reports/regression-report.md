# Regression report

- Passed: 4
- Failed: 0
- Upstream PyPTO3-main/data scan: not run (inventory scan is separate)
- Browser visual validation: not run
- Device runtime validation: not run

## package_structure_and_json: passed
```text
PASS package structure/json: 35 required paths; 60 manifest hashes

```

## graph_schema_and_semantics: passed
```text
lowered-value: VALID — Registered endpoints, context and evidence references passed
bufferization: CANDIDATE — Need compiler bufferization output.
storage: INSUFFICIENT_EVIDENCE — Matching source evidence required
placement: AMBIGUOUS — No pinned launch-to-device correlation.
PASS structure and graph semantics: 2 graphs

```

## python_syntax: passed
```text


```

## contract_unit_tests: passed
```text
Relation compatibility: 17 relations × 17 × 17 = 4913 checks
test_approved_mapping_candidate (test_contracts.ContractTests.test_approved_mapping_candidate) ... ok
test_fixture_edges_resolve (test_contracts.ContractTests.test_fixture_edges_resolve) ... ok
test_invalid_layer_does_not_leak (test_contracts.ContractTests.test_invalid_layer_does_not_leak) ... ok
test_rank_collective_participants_exist (test_contracts.ContractTests.test_rank_collective_participants_exist) ... ok
test_trace_normalization_preserves_unknowns (test_contracts.ContractTests.test_trace_normalization_preserves_unknowns) ... ok
test_trace_observed_when_timestamp_present (test_contracts.ContractTests.test_trace_observed_when_timestamp_present) ... ok
test_unknown_mapping_stays_unresolved (test_contracts.ContractTests.test_unknown_mapping_stays_unresolved) ... ok
test_cross_process_interval_cannot_confirm_containment (test_contracts.ScopedTraceTests.test_cross_process_interval_cannot_confirm_containment) ... ok
test_cross_scope_and_revision_rejected (test_contracts.ScopedTraceTests.test_cross_scope_and_revision_rejected) ... ok
test_duplicate_identity_rejected (test_contracts.ScopedTraceTests.test_duplicate_identity_rejected) ... ok
test_invalid_measurements_stay_unknown (test_contracts.ScopedTraceTests.test_invalid_measurements_stay_unknown) ... ok
test_missing_evidence_cannot_confirm (test_contracts.ScopedTraceTests.test_missing_evidence_cannot_confirm) ... ok
test_projected_graph_has_two_confirmed_edges (test_contracts.ScopedTraceTests.test_projected_graph_has_two_confirmed_edges) ... ok
test_raw_records_must_support_the_mapping (test_contracts.ScopedTraceTests.test_raw_records_must_support_the_mapping) ... ok
test_same_name_without_ids_stays_distinct_in_batch (test_contracts.ScopedTraceTests.test_same_name_without_ids_stays_distinct_in_batch) ... ok
test_schema_rejects_incomplete_object_ref (test_contracts.ScopedTraceTests.test_schema_rejects_incomplete_object_ref) ... ok
test_source_rejects_edited_native_evidence (test_contracts.ScopedTraceTests.test_source_rejects_edited_native_evidence) ... ok
test_wrong_direction_rejected (test_contracts.ScopedTraceTests.test_wrong_direction_rejected) ... ok
test_identity_separates_run_and_form (test_inspection.InspectionTests.test_identity_separates_run_and_form) ... ok
test_invalid_trace_and_unpaired_flow_stay_unresolved (test_inspection.InspectionTests.test_invalid_trace_and_unpaired_flow_stay_unresolved) ... ok
test_legacy_fixture_round_trip (test_inspection.InspectionTests.test_legacy_fixture_round_trip) ... ok
test_multi_input_and_physical_locators (test_inspection.InspectionTests.test_multi_input_and_physical_locators) ... ok
test_fetch_and_stylesheet_use_their_respective_browser_bases (test_library_dependencies.LibraryDependencyTests.test_fetch_and_stylesheet_use_their_respective_browser_bases) ... ok
test_all_registered_kind_combinations (test_relation_rules.RelationRulesTests.test_all_registered_kind_combinations) ... ok
test_context_conflicts (test_relation_rules.RelationRulesTests.test_context_conflicts) ... ok
test_distinct_scope_is_not_an_identity_merge (test_relation_rules.RelationRulesTests.test_distinct_scope_is_not_an_identity_merge) ... ok
test_example_builder_blocks_invalid_output (test_relation_rules.RelationRulesTests.test_example_builder_blocks_invalid_output) ... ok
test_incomparable_clock_and_disjoint_intervals (test_relation_rules.RelationRulesTests.test_incomparable_clock_and_disjoint_intervals) ... ok
test_instance_definition_cardinality (test_relation_rules.RelationRulesTests.test_instance_definition_cardinality) ... ok
test_invalid_kind_or_direction_is_rejected_even_for_candidate (test_relation_rules.RelationRulesTests.test_invalid_kind_or_direction_is_rejected_even_for_candidate) ... ok
test_machine_report_fails_for_unregistered_relation (test_relation_rules.RelationRulesTests.test_machine_report_fails_for_unregistered_relation) ... ok
test_missing_context_or_unrelated_evidence (test_relation_rules.RelationRulesTests.test_missing_context_or_unrelated_evidence) ... ok
test_rmsnorm_output_preserves_uncertainty (test_relation_rules.RelationRulesTests.test_rmsnorm_output_preserves_uncertainty) ... ok
test_source_scope_and_build_conflicts (test_relation_rules.RelationRulesTests.test_source_scope_and_build_conflicts) ... ok

----------------------------------------------------------------------
Ran 34 tests in 1.575s

OK
```
