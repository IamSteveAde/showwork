# Workspace Randy

Research navigation now reads Randy; its stable `?view=research` URL is preserved. This is the business assistant, distinct from the public Randy help widget (which only knows help guides).

## Behavior

Members with Knowledge view can read their own saved conversations. The only primary action is Start conversation; there is no separate Research library or research page. Sending requires `ai.generate` and an active workspace. Starting research and confirming knowledge additions also require `knowledge.manage`. Conversations are private to a signed-in member within a workspace; additions to knowledge are shared with the workspace. The latest 12 messages provide conversational context; this is not unlimited chat memory. A conversation allows up to 98 messages before asking the user to start another; the history list shows the latest 40 conversations.

Replies use existing `getBusinessKnowledgeContext`: relevant extracted document passages, current source-derived overview, saved personality, and fresh, nonexcluded research when available. This does not include unextracted document content or arbitrary website pages. Unknown facts and conflicting sources should trigger questions, not invented answers. Source titles and external source URLs can be expanded in the answer.

A research request first produces a proposed public topic, resolving conversation references without putting private documents into search. The user reviews and confirms that topic before the existing sourced research engine runs. Existing cooldown, public-source citation validation and saved source exclusions remain in the underlying research engine. Legacy research records remain stored, but the old library UI is removed. Results appear in the conversation and remain in the existing research system for later AI context. Research does not automatically become factual Business Knowledge.

Useful user-provided business facts or clearly labelled strategic recommendations may proactively produce a knowledge addition card asking whether to add it. Explicit requests are supported too. Research hypotheses must remain labelled and cited; suggestions never automatically become company facts. A manager confirms the exact server-stored proposal; the browser cannot substitute arbitrary text at confirmation. Saving is idempotent and creates a CalendarBusinessDocument source. Existing fingerprint/indexing behavior invalidates outdated summaries/research and queues indexing. Existing documents are never silently replaced; contradictory sources still need review. The UI refreshes Knowledge after confirmation. No additional summary-generation charge is incurred at save time.

## Infrastructure and release

- New API: `/api/calendars/[id]/randy` GET/POST.
- New tables: WorkspaceRandyConversation and WorkspaceRandyMessage. Apply `20261028010000_workspace_randy_chat` through the normal migration deployment workflow; then regenerate Prisma Client on each deployed runtime. The migration is additive with cascade deletion on workspace removal. No migration has been applied by this implementation task.
- Existing server-only `OPENAI_API_KEY`; optional `OPENAI_BUSINESS_CHAT_MODEL` defaults to `gpt-4.1-mini`. Research still uses the existing research model/configuration.
- Chat, research-topic preparation and web research use paid services when a user requests them. None were called during implementation validation.
- AI work runs through Next.js `after` with a persisted processing lease and UI polling. Runtime must support a 240-second duration and background completion. There is no new VPS worker requirement. An interrupted server invocation is shown after five minutes; stale invocations cannot append over newer requests. This is not a durable job queue with guaranteed execution.
- Per-member/workspace limit: 20 submitted requests per ten minutes, including research confirmations. A database row lock serializes admission; pending conversation requests reject duplicate submissions. No browser-transcript persistence or private data logging added. Database conversation messages persist until workspace deletion; a dedicated conversation-delete UI is not yet provided.
- Before release, apply migration and deploy matching website code. Configure secrets server-side. Verify real provider access, browser keyboard/scroll behavior, reload persistence, distinct member/workspace access and one approved paid end-to-end run. Do not claim live AI operation from mocked tests.

## Conversation actions

Randy can provide a structured contentBrief in an answer. Its prompt card is editable, with Copy prompt and Use in Generate actions. The existing workspace-scoped research-brief handoff pre-fills Generate without executing generation, saving calendar posts or publishing. A recent answer also offers Create content prompt and Suggest knowledge update follow-ups. The brief and proposal are stored as message JSON, so no additional migration is needed beyond the existing Randy conversation tables. Older messages without contentBrief remain valid.

Knowledge saves retain supporting source labels/URLs from the server-stored answer. Only authorized managers can confirm; existing sources are not overwritten. The old research feedback/preferences controls are no longer exposed in Randy; chat feedback is conversational and does not automatically edit historical research records.
