# Randy: Showwork help assistant

Randy shares the 128 maintained guides used by the Workspace, Project Delivery and Portfolio help centres. The widget is available through the existing global support entry point and the “Ask Randy” buttons on help pages. Tool context follows the page and can be changed explicitly. Answers show numbered steps and supporting guide links. This is help guidance, without account access or actions.

## Activation

The interface and deterministic, labelled guide answers work immediately. AI synthesis is deliberately opt-in:

- `RANDY_AI_ENABLED=true` enables AI answers.
- `OPENAI_API_KEY` is the existing server-only provider key.
- `OPENAI_HELP_MODEL` optionally overrides the default `gpt-4.1-mini`.
- Production requires `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for shared request limits. Without these, Randy returns guide answers rather than making paid calls. Redis credentials stay server-side.

Use the same Redis instance across website instances. The limiter permits 12 AI requests per visitor per ten minutes and 300 shared requests per hour; exceeded limits and limiter failures fall back to guides. Visitor addresses are hashed for limiter keys. Configure the hosting proxy to replace trusted client-IP headers; per-visitor limits do not substitute for the global cap. Development uses a process-local limiter when Redis is absent. No database migration is needed. Deploy the website code through the usual website release process; no VPS worker changes are required for this feature.

## Answer boundaries and privacy

Only relevant public guide passages, the question, and up to six recent conversation turns are sent to the provider. No workspace documents, credentials, private records, or account tools are loaded. Provider requests use `store:false`; provider-side retention still follows the configured service's policy. No application transcript persistence or question logging was added. Chat state is held in the page only and is reset on navigation, product change or New conversation. A reload clears it.

AI answers use the Responses API with a strict JSON schema. The server validates response types, bounds and citations, constructing links only for retrieved guide IDs. Refusals, malformed responses, timeouts, missing configuration and provider errors return labelled source-guide steps instead. Unsupported questions ask for clarification. Generated guidance can still be imperfect; linked documentation is visible for verification.

“Speak to a human” opens the existing Showwork WhatsApp number, 2347018819588, with a generic product-specific draft. It neither automatically sends a message nor forwards the conversation, and does not promise immediate availability. Human requests bypass paid generation.

## Validation and release checks

Automated tests use synthetic inputs and mocked provider responses; no paid generation, deployment, database migration or VPS action was performed. Native dialog focus, keyboard navigation, touch layout and the real WhatsApp launch require manual browser verification. Before enabling paid AI in production, verify provider access, shared Redis configuration and one approved end-to-end AI request, then check source relevance and fallback behavior.

API format reference: https://developers.openai.com/api/docs/guides/structured-outputs
