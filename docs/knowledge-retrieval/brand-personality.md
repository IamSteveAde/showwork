# Workspace Brand Personality

Brand Personality appears above the existing Business Knowledge documents on every workspace's Knowledge page. Five single-choice radio groups use the requested options. Other reveals a 1–200 character custom-answer field. Save is explicit; answers reload and remain editable for users with knowledge.manage. Users with knowledge.view can read but cannot write.

## Storage and isolation

No new table, column, environment variable or migration. The existing CalendarBusinessDocument store contains one reserved structured source per workspace, with ID brand-personality:<calendarId>, zero file/storage bytes, no uploaded asset and a validated version 1 JSON payload. Existing source fingerprints change with personality updates, invalidating stale summaries/research and queued generation source hashes consistently with other knowledge changes. Saving initiates no model call.

GET/PUT /api/calendars/[id]/business-documents/brand-personality authenticate the creator and check knowledge.view/knowledge.manage respectively. Reads include source ID and calendarId; upserts use the existing compound id_calendarId unique key. The client cannot redirect writes with a body workspace ID. Generic document cards hide this reserved source.

Personality sources are excluded from factual document checks in native/canonical generation and factual clarification/retrieval. Personality alone does not count as business product knowledge. No profile means no new persona/style instructions.

## AI integration

getBusinessKnowledgeContext reads the current workspace profile, renders labelled style preferences before factual evidence and keeps metadata out of factual passages. Content planning, writing, review, creative development, customer reply suggestions and automatic reply paths already use this shared context.

Application-level content and reply instructions conditionally interpret the five dimensions holistically through perspective, situations, word choice and emotional effect, rather than repeating labels. Existing reply tone remains available. Facts, customer intent, privacy, complaint sensitivity and handoff rules take priority. Custom answers remain untrusted preference data. The style block is placed early so the short-reply context limit retains it.

## Changed files

- lib/knowledge/brandPersonality.ts: shared questions, validation, serialization and contextual framing.
- app/api/calendars/[id]/business-documents/brand-personality/route.ts: scoped read/update API.
- components/calendars/BrandPersonalityCard.tsx: responsive radio form, custom inputs and save/load/error states.
- app/dashboard/calendars/[id]/page.tsx: Knowledge section and factual-document readiness.
- components/calendars/BusinessKnowledgeCard.tsx: reserved-source filtering.
- lib/knowledge/context.ts: shared personality context.
- lib/knowledge/clarification.ts: exclude preferences from factual clarification.
- lib/calendarAiGeneration.ts and lib/publishing/applicationActions.ts: require actual business documents.
- lib/openai.ts: conditional style guidance, without model or provider changes.
- tests/brand-personality.test.cjs and this document.

## Verification and release

Tests use isolated in-memory knowledge records and mocked AI responses: save/reload/update/custom answers; independent workspace profiles; permission checks before reads/writes; read-only access; invalid-save preservation; no-profile compatibility; factual separation; content-planning and sensitive customer-reply instructions; five radio groups and conditional custom inputs.

Broader regressions cover Knowledge, clarification, hybrid retrieval, customer-care/handoff rules, creative generation/persistence, internal review and publishing eligibility. TypeScript and diff checks pass. Browser/mobile interaction acceptance and live AI voice quality were not tested.

No production writes, migration, deployment, paid AI test or VPS change occurred. Production's separate AI worker requires the matching shared knowledge/context code in its release.
