# Validation scope and limitations

The default regression uses synthetic fixtures and exercises the package's
schema and semantic checks. A local copy of the pinned DeepSeek capture can
validate the three-event profile and generate an offline inspector on demand.
Device placement, generic clock alignment and live collection require
separate validation.

The v1.2 rule table validates a small normalized projection. It does not
implement the full 39-kind and 48-relation scope described in the review.
The RMSNorm fixture uses synthetic records and makes no claims about an actual
allocation or device run. Runtime capture imports, source verification and
clock alignment are separate checks.

## v1.4.2 inspection coverage

The inspection result is a native-record handoff. Cross-source semantic extraction and independent adapter admission are outstanding. Python AST output is static. C/C++ and IR paths are lexical. Chrome Trace pairing and flow identity remain unresolved. PyPTO3 DFX is inventoried without interpreting producer semantics. See the capability and real-data reports for the resulting acceptance boundaries.
