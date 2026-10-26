# Business knowledge retrieval: implementation and rollout

Implemented locally, 25 October 2026. **Not deployed or enabled in production.** No VPS or production database changes were made. Content generation is the only newly integrated consumer. Inbox, analytics, research eligibility, publishing and scheduling retain their existing paths.

## Architecture and scope

The existing extractor stores document text; website ingestion captures a bounded selection of pages. Previously, retrieval used overlapping character passages, keyword/synonym scoring, source diversity and a character budget. The old retriever remains available for rollback and for existing consumers.

The new content path is:

1. Build four deterministic queries from instructions and available platform, audience, offer and campaign context. Empty instructions use a general business-content request. No business facts are invented during query expansion.
2. Split extracted sources into nonoverlapping passages with titles, headings, raw character offsets, source IDs, website URLs and table-column context. Stable IDs include source and chunk-version information. Original extracted text remains intact.
3. Queue source indexing asynchronously. Persist embeddings and provenance in PostgreSQL, scoped by workspace and source revision. Generation embeds queries only, never entire documents.
4. Search with BM25 and cosine similarity; fuse ranked lists using reciprocal rank fusion. The main request has higher weight than supporting context queries. Exact quoted phrases receive a lexical boost.
5. Optionally rerank up to 24 candidates with a configured model, scoring actual passage relevance. Timeout or malformed output falls back to fused ranking. Apply a modest same-source penalty and remove identical evidence without discarding contradictory values.
6. Assemble token-bounded source evidence, separately labelled business summary and eligible research. Preserve source-fingerprint and research-age checks. Recheck the source snapshot before returning context. Check the final generation prompt against the configured model window.

Queries are workspace-scoped in SQL, not merely filtered afterward. Composite foreign keys prevent a passage being attached to another workspace's source. Source changes invalidate old revisions immediately; deletion cascades remove indexed data. Concurrent indexers use leases and compare-and-set checks, including when a document changes during an embedding request.

Documents are untrusted evidence. JSON-encoded provenance and explicit instructions prevent source text from being treated as application instructions; model-level prompt injection is not claimed to be completely solved. Logs contain IDs, mode, timing and usage, not document bodies, queries, credentials or provider error bodies.

### Storage decision

This repository uses PostgreSQL/Prisma. A deployed pgvector extension could not be verified without accessing production. The implementation therefore uses PostgreSQL `double precision[]` and bounded exact cosine scoring in the application, avoiding a new service or extension requirement. Up to 5,000 ready vectors are loaded per workspace by default; exceeding that bound explicitly falls back to lexical retrieval. This is a bounded initial deployment, not a validated large-scale vector-search design. At larger volumes, migrate the store adapter to pgvector with workspace-scoped queries and benchmark memory, transfer and index performance before raising limits.

### Index lifecycle

The additive migration queues existing sources without making external API calls. Database triggers queue new/changed sources, clear leases and remove stale passages. Each job embeds at most 32 passages, saves progress, and marks a source ready only after all chunks complete. Model, dimensions or version changes trigger reindexing. Unchanged current revisions reuse embeddings. Failed work backs off and stops after five attempts. A source exceeding 10,000 chunks is explicitly failed rather than silently truncated.

The Knowledge section shows readiness. Partial or unavailable indexing uses current source text for lexical fallback; reports expose degradation. Exact raw extraction fidelity is preserved, but PDF layout already lost during extraction cannot be reconstructed. This change does not add OCR, unrestricted website crawling or guaranteed ingestion of every page.

## Measured evaluation

See [machine-readable results](evaluation.json), [parameter sensitivity](parameter-sweep.json), and `tests/fixtures/knowledge/businesses.cjs`.

This is an 11-query **synthetic development collection**, including five business documents, website evidence, conflicting policy and a malicious source. Ten queries have labelled expected evidence spans; the missing-information case is excluded from aggregate ranking metrics. K=3, fixed precision denominator. Multiple expected facts can occur in one passage. The fixture was used during tuning, so this is not held-out validation or a production accuracy claim.

| Method | Recall@3 | Precision@3 | MRR | nDCG@3 | Mean retrieval time |
| --- | ---: | ---: | ---: | ---: | ---: |
| Existing retriever | 0.725 | 0.567 | 1.000 | 0.829 | 2.8 ms |
| Hybrid, no reranker | 0.767 | 0.600 | 0.700 | 0.715 | 879 ms |
| Hybrid + reranker | 0.808 | 0.600 | 1.000 | 0.856 | 3,093 ms |

Live calls used `text-embedding-3-small` (512 dimensions) and `gpt-4.1-mini` for reranking. All 11 reranker calls completed without fallback in this recorded run. Retrieval latency includes query embeddings/reranking but excludes database transport (benchmark store is an in-memory adapter), indexing and final content generation. One request had elevated latency; timings are not an SLA.

The reranked path improves aggregate recall by 8.3 percentage points and nDCG by 0.027, but audience, campaign and empty-instruction cases still regress against the baseline. Hybrid without reranking is not a universal improvement. The recorded context-relevance score is 0.462 against narrow labelled spans, indicating background material remains. The missing-information case did **not** abstain: retrieval can return background when the requested fact is absent. Generation instructions prohibit inventing missing facts, but this benchmark does not verify generated-answer accuracy or guarantee abstention. These limitations require a workspace canary and human review before broad activation.

RRF K and semantic-weight sensitivity are recorded separately using cached real embeddings. Defaults are K=60, semantic weight=1, supporting query weight=0.15. They balance recall with lexical coverage; no universal optimality is claimed. The final reranker wording and reduced supporting-query weight improved primary-request ranking in this fixture.

### Cost evidence

The recorded comparison used 1,398 query-embedding input tokens across 22 requests (both hybrid variants), plus 29,748 reranker input tokens and 2,334 output tokens across 11 requests. Document vectors were cached: indexing cost in this run was zero new tokens, **not zero lifetime cost**. Initial cache-building token usage was not retained in this report. Failed attempts can incur unreported usage.

Use actual account rates to calculate cost: `embeddingTokens / 1e6 * embeddingInputRate + rerankInputTokens / 1e6 * rerankInputRate + rerankOutputTokens / 1e6 * rerankOutputRate`. No unsupported dollar estimate is presented. Runtime metadata records successful input/output usage. A real workspace cost/latency budget must be validated before enabling broadly.

Zero cross-workspace leakage was observed in fixtures. Actual SQL isolation, deletion and concurrent invalidation were separately tested with isolated PGlite/PostgreSQL, not inferred from the mocked benchmark store.

## Configuration

All settings are server-side. Do not use `NEXT_PUBLIC_` prefixes.

| Variable | Default / purpose |
| --- | --- |
| `KNOWLEDGE_HYBRID_ENABLED` | Off unless `true`; content retrieval gate |
| `KNOWLEDGE_HYBRID_WORKSPACES` | Optional comma-separated workspace IDs; use a canary allowlist initially. Empty means all eligible workspaces |
| `KNOWLEDGE_INDEXING_ENABLED` | Off unless `true`; gates cron/CLI processing |
| `KNOWLEDGE_EMBEDDING_MODEL` | Required for indexing/semantic search; tested with `text-embedding-3-small` |
| `KNOWLEDGE_EMBEDDING_DIMENSIONS` | 512; model must support requested dimensions |
| `KNOWLEDGE_EMBEDDING_VERSION` | `1`; change to force rebuild |
| `KNOWLEDGE_RERANK_ENABLED` | Off unless `true`; tested quality configuration uses `true` |
| `KNOWLEDGE_RERANK_MODEL` | Required when reranking; tested with `gpt-4.1-mini` |
| `KNOWLEDGE_EMBED_TIMEOUT_MS` | 8000, total deadline including bounded retry |
| `KNOWLEDGE_RERANK_TIMEOUT_MS` | 6000, no retry |
| `KNOWLEDGE_CANDIDATES` | 24, range 4–40; use integer |
| `KNOWLEDGE_RRF_K` | 60 |
| `KNOWLEDGE_CONTEXT_QUERY_WEIGHT` | 0.15 |
| `KNOWLEDGE_SEMANTIC_WEIGHT` | 1 |
| `KNOWLEDGE_MIN_COSINE` | 0.25; heuristic, not calibrated confidence |
| `KNOWLEDGE_MAX_VECTORS` | 5000; use integer |
| `KNOWLEDGE_CONTEXT_TOKENS` | 7000 across evidence/summary/research |
| `KNOWLEDGE_GENERATION_CONTEXT_WINDOW` | GPT-4.1 family defaults to 1,047,576; explicitly configure other models |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Existing provider credentials and generation model |
| `CRON_SECRET` | Required bearer secret for index POST endpoint |

Token accounting uses `o200k_base` for generation and `cl100k_base` for embedding inputs; arbitrary model/tokenizer compatibility is not guaranteed. Changing provider/model families needs token-limit validation. Structured reranker JSON output is required. No embedding/reranking model is hardcoded as a production default.

## Developer rollout — not executed

1. Review data handling: indexing sends extracted source passages to the existing OpenAI provider. Enable only authorised workspaces. Keep both feature flags off initially.
2. Review migration against a staging copy and back up production. Deploy the additive migration through the normal migration process (`prisma migrate deploy` after reviewing **all pending migrations**). Do not use `db push` or destructive reset commands. Generate Prisma client as part of the normal build.
3. Deploy code and the pinned `js-tiktoken` dependency to the website and whichever service actually executes content generation. The separate functions/VPS deployment must carry compatible retrieval code/configuration; updating Vercel alone does not update it. The old local AI worker remains disabled. No service restart or infrastructure change was performed here.
4. Configure embedding model/dimensions, canary workspace IDs, provider key and `KNOWLEDGE_INDEXING_ENABLED=true`. Keep hybrid retrieval off until readiness is checked.
5. Build the bounded index CLI with `npm run knowledge:index:build`. Run `node dist-knowledge/index.cjs --workspace=WORKSPACE_ID --batches=10` in the developer-managed environment with credentials supplied securely. Repeat until ready. The CLI does not load `.env` automatically. To retry terminal failures after fixing their cause, add `--retry-failed` with an explicit workspace ID.
6. Schedule authenticated **POST** requests to `/api/cron/knowledge-index` or run the CLI periodically. No automatic cron schedule is installed. Each request processes one batch; Vercel's built-in GET cron will not directly invoke this POST handler. Never put secrets into URLs. Use the existing scheduler's secret/header facility.
7. Check readiness in Knowledge. Enable hybrid plus reranking for the canary. Generate representative drafts and inspect factual support, missing-fact handling, conflicts, latency and cost. Confirm ordinary generation settings and platform sharing still behave correctly in the deployed worker.
8. Expand only after real workspace acceptance. Monitor `KNOWLEDGE_RETRIEVAL` metadata, incomplete/failed index counts, provider timeouts, vector limits, token usage and prompt budgets. Investigate rather than silently treating fallback as full semantic readiness.

Rollback: set `KNOWLEDGE_HYBRID_ENABLED=false` on every generation runtime to restore the existing retriever. Set `KNOWLEDGE_INDEXING_ENABLED=false` to stop new API indexing work. Leave additive tables/queued records in place; no destructive schema rollback is needed. Stopping indexing does not stop uploads or erase original knowledge.

## Validation and reproducibility

Local verification completed: **48 tests passed**, TypeScript passed, Prisma schema validation passed, and the index CLI built successfully. No production end-to-end test was performed.

Run:

```sh
node --test tests/knowledge-hybrid.test.cjs tests/knowledge-index.integration.test.cjs tests/business-knowledge.test.cjs tests/business-documents.test.cjs tests/ai-generation-jobs.test.cjs
npx tsc --noEmit --incremental false
npx prisma validate
npm run knowledge:index:build
```

The SQL test uses an isolated PGlite install; set `SHOWWORK_REVIEW_PGLITE_PATH` to its module path if the local QA installation is absent. It does not use production `DATABASE_URL`.

`npm run knowledge:evaluate` performs a lexical/fixture evaluation without external AI calls. For a live synthetic comparison, configure the embedding/reranking model variables and run `node scripts/knowledge/evaluate.cjs --live --output=/tmp/knowledge-evaluation.json`. This loads the local OpenAI key but does not query the application database or read customer documents. `--sweep` evaluates ranking parameters using cached embeddings. Cache is synthetic-only and defaults to `/tmp/showwork-synthetic-knowledge-embeddings.json`; override with `KNOWLEDGE_EVAL_CACHE`. Never substitute private documents into shareable benchmark output.

Tests cover source fidelity, query fallback, semantic contract, provider outages, malformed output, token budgets, status authorisation, prompt-injection data handling, conflicts, real SQL workspace isolation, concurrent leases, reindexing, revision races, batch resumption, retries and deletion. Existing document, knowledge and AI job regression suites are included. Live generated-content quality, production database scale, worker deployment and production latency remain unverified.

## File-by-file implementation map

- `lib/knowledge/hybrid/config.ts`: feature flags, model/version and bounded ranking configuration.
- `lib/knowledge/hybrid/tokens.ts`: lazy tokenizers and token truncation.
- `lib/knowledge/hybrid/query.ts`: structured deterministic query plan.
- `lib/knowledge/hybrid/chunks.ts`: structure-aware passages, stable provenance and embedding text.
- `lib/knowledge/hybrid/ranking.ts`: BM25, cosine, RRF and diversity/deduplication.
- `lib/knowledge/hybrid/provider.ts`: bounded embeddings/reranking APIs and validated responses.
- `lib/knowledge/hybrid/store.ts`: scoped SQL reads, resumable index batches and lease/revision safety.
- `lib/knowledge/hybrid/conflicts.ts`: conservative unresolved price/policy hints; not automatic conflict resolution.
- `lib/knowledge/hybrid/engine.ts`: retrieval, fallback, assembly, diagnostics and model-window checks.
- `lib/knowledge/context.ts`: content-only feature-flag integration, fingerprints, section budgets and safe diagnostics.
- `lib/calendarAiGeneration.ts`: structured retrieval context in calendar generation.
- `lib/publishing/showworkApplication.ts`: same context integration in canonical worker generation.
- `lib/openai.ts`: final context-window guard for hybrid requests.
- `prisma/schema.prisma`: index/passages models and relations.
- `prisma/migrations/20261025160000_hybrid_knowledge_index/migration.sql`: additive schema, queues, invalidation triggers and metadata backfill.
- `app/api/cron/knowledge-index/route.ts`: secret-protected bounded job endpoint.
- `app/api/calendars/[id]/business-documents/index/route.ts`: authorised readiness endpoint.
- `components/calendars/KnowledgeIndexStatus.tsx`: readiness/fallback status and polling.
- `components/calendars/BusinessKnowledgeCard.tsx`: status placement in existing Knowledge UI.
- `scripts/knowledge/index.ts`: workspace-scoped operational indexing/retry CLI.
- `scripts/knowledge/build.mjs`: index CLI bundle build.
- `scripts/knowledge/evaluate.cjs`: reproducible baseline/hybrid/live evaluation and sensitivity sweep.
- `tests/fixtures/knowledge/businesses.cjs`: synthetic documents, website and evidence labels.
- `tests/knowledge-hybrid.test.cjs`: retrieval/provider/context/security tests.
- `tests/knowledge-index.integration.test.cjs`: isolated PostgreSQL migration/index lifecycle tests.
- `package.json`, `package-lock.json`: pinned tokenizer dependency and knowledge commands.
- `.gitignore`: exclude generated `dist-knowledge` bundle.
- `docs/knowledge-retrieval/README.md`, `evaluation.json`, `parameter-sweep.json`: operational guide and measured results.

Primary references: [OpenAI embeddings API](https://developers.openai.com/api/reference/resources/embeddings/methods/create), [GPT-4.1 context window](https://developers.openai.com/api/docs/models/gpt-4.1), [pgvector](https://github.com/pgvector/pgvector), [tiktoken JS](https://github.com/dqbd/tiktoken/tree/main/js).
