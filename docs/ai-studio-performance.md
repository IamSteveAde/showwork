# AI Studio performance changes — 26 October 2026

The supplied live logs show roughly 80–100 seconds of planning, multiple writing waves of 25–45 seconds per call, and up to 60–76 seconds of review. These are historical observations, not a benchmark of this change.

Implemented:
- Planner emits one developed concept per slot with audience need, format and pillar. Redundant topic/key-message/angle fields were removed from this internal intermediate response. Final post fields are unchanged.
- Writer uses a rolling bounded pool: a newly available slot starts the next batch immediately rather than waiting for the slowest call in a fixed wave. Three posts per call remain unchanged. AI Studio defaults to three concurrent calls; OPENAI_CONTENT_WRITING_CONCURRENCY can set 1–4, validated before planning. The legacy shared writer default remains two.
- Quality review returns sparse changes to affected fields, not six potentially complete replacement briefs. Unchanged objective, audience, caption and other fields remain intact. Existing complete replacement objects remain accepted for compatibility. Malformed edits preserve original drafts with internal review warnings.
- Model, reasoning effort, full extracted document text and approval safeguards are unchanged. No extra model stage or automatic paid retry was introduced. In-flight calls drain on writing failure and later batches are not started. Scheduling identity/order validation remains mandatory.
- CONTENT_AI_TIMING logs overall elapsed time, concept count, batch count and configured concurrency without content or credentials.

50 focused tests and TypeScript passed. Tests cover rolling scheduling under an intentionally slow sibling, bounded concurrency, stable order, no paid-call replay, sparse-review preservation, all required fields, full-document inclusion and persistence recovery. No additional live paid batch, deployment, migration or VPS change was made. Actual latency improvement is unmeasured. Higher concurrency may encounter project rate limits; reduce the setting if necessary rather than automatically replaying paid work. Full-document processing still consumes time proportional to context and output size; this is not a promise of five-second full-calendar generation.
