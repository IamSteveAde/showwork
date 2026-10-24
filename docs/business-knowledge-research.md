# Business knowledge and research

## What each AI feature uses

- Inbox replies and staff drafts retrieve relevant passages from the current workspace's extracted documents and websites. The saved customer-care playbook still supplies tone, confirmed pricing/policies, qualification questions and handoff rules.
- A rebuilt overview supplements those passages only when its source fingerprint matches the current documents. Legacy rolling summaries are not trusted as reply evidence.
- Content generation, regeneration and analytics also receive enabled findings from the latest successful research run matching the current source fingerprint, completed within the past 30 days. Observed account metrics remain the evidence for performance claims.
- Research never replaces confirmed business facts or feeds external market claims into automatic replies. It suggests experiments for content and analytics.

Retrieval scans the full extracted text, splits it into overlapping passages, ranks by question words and related price/policy/service terms, and includes source labels. This is keyword retrieval with bounded context, not model training or exhaustive semantic understanding. Scanned PDFs still require readable text; this change does not add OCR. Source ambiguity and missing facts must lead to clarification or human handoff.

## Research lifecycle

Open **AI Studio → Research**, enter a public research focus (including the business website, industry and audience), and start a run. Knowledge management permission and an active workspace are required; Knowledge viewers can inspect results.

The database records QUEUED → RUNNING → SUCCEEDED/FAILED, the current phase, focus, timestamps, source fingerprint, findings, unknowns and citation URLs. The initial request returns 202; Next.js `after()` executes the work with a 180-second route duration. The interface polls while work is active. A run older than 15 minutes is marked interrupted, and can be retried. Claims and a partial unique index prevent concurrent runs for one workspace. Runs have a 10-minute admission cooldown; an uncertain interrupted run is never automatically replayed.

Web search receives the business name, the public research topic and known website URLs. A separate synthesis call receives selected business passages to assess relevance. That means private source excerpts are sent to the configured OpenAI API for synthesis, but are not included in the web-search input. Users should keep customer secrets out of their research topic.

Only URLs returned as actual web-search citations are accepted as finding sources. Findings without accepted citations are dropped, and a run with no supported findings fails. Citations establish provenance, not guaranteed truth. The UI displays sources and unanswered questions, and allows managers to exclude findings from future recommendations. Source changes or age expiry stop old research from informing new outputs; historical results remain available to inspect.

## Documents and summaries

Uploads and website refreshes rebuild the summary from current sources, without merging the prior research-enriched summary. Deletion invalidates the summary and removes the source from future retrieval. Knowledge includes a **Rebuild from current sources** control to recover failed summaries. Retrieval remains available even if summary creation fails. Existing conversation history and content already generated are not erased or rewritten.

## Deployment

Apply `20261021120000_business_knowledge_research`, regenerate Prisma, and restart application/AI worker processes before serving the new code. This migration is additive. It does not deploy or move the website, change DNS, or alter the existing publishing worker.

The protected `POST /api/cron/ai-research` endpoint now creates cited research runs instead of rewriting summaries. It processes at most one eligible workspace per call (weekly success cadence; failed/recent attempts are skipped for a day). The deployment scheduler must invoke it with `CRON_SECRET`; this change does not configure an external scheduler. Manual research works independently of cron. Existing AI content worker deployments must receive the updated context code to use the new retrieval and research.

## Verification

`tests/business-knowledge.test.cjs` covers deep-document retrieval, source changes, stale summaries, research separation, exclusion, citations, workspace permissions, cooldown and exclusive claims. Existing message/handoff, document extraction and generation tests cover adjacent behavior. Live model quality still requires a workspace test and review of the actual cited findings.
