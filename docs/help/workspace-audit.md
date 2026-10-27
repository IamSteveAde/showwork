# Marketing Workspace: feature and help audit

Reviewed: 27 October 2026. Scope: the current local implementation, not a live production certification.

## Deliverables

- Public help centre: `/help/workspace`; `/help` redirects there.
- Searchable task guides: `lib/help/workspaceGuides.ts` (shared content source).
- Full written handbook: `docs/help/marketing-workspace-handbook.md`.
- Help links in expanded and collapsed workspace navigation, and mobile More. Links open a separate tab to preserve local work.
- Public documentation contains no workspace records, account identities, credentials or private customer data.

## Audit method and limits

Inspected workspace composition, user-facing controls, permissions, relevant data and API paths, workflow helpers and existing tests. The help describes implemented UI, not requested or hypothetical capabilities. No live OAuth, API sync, publishing, email delivery, paid generation, production migration, VPS changes or deployment was performed for this work. Provider approvals and production configuration are not certified by this audit. Browser/device visual validation should follow locally.

## Feature coverage

| Area | Inspected implementation | Documented abilities and boundaries |
| --- | --- | --- |
| Workspace creation/navigation | `app/dashboard/calendars/page.tsx`, `CreateCalendarForm.tsx`, `CalendarWorkspaceShell.tsx`, `WorkspaceOverview.tsx` | Create a client workspace, automatic private password, overview, desktop collapse, mobile bottom navigation, role-dependent sections, retained panels |
| Content | `CalendarGrid.tsx`, `ContentPlanner.module.css`, `CreativeBriefEditor.tsx` | Manual planning, formats/platforms, brief fields, Reimagine where offered, assets, search/filters, stage views, deletion and owner reset |
| Calendar import | `ImportCalendar.tsx`, calendar import API routes | PDF/CSV/Excel/Word/TXT/HTML, 3 MB/200-item displayed limits, preview, timezone/date correction, mappings, duplicates, selective import, retry confirmation |
| Internal/client reviews | `CalendarGrid.tsx`, `lib/calendarWorkflow.ts`, `lib/calendarTeamPolicy.ts`, review API routes | Private internal feedback, authorized approval, client visibility gate, client review, protected approved content, return-to-review when allowed |
| Publishing | `AutoPublishToggle.tsx`, `SocialPostPublishing.tsx`, `TikTokPublishing.tsx`, `lib/publishing/` | Workspace auto-publish switch, explicit approved/scheduled/published/failed distinction, channel eligibility, TikTok per-post consent, safe retries |
| Knowledge | `BusinessKnowledgeCard.tsx`, `BrandPersonalityCard.tsx`, `lib/knowledge/`, knowledge API routes | Documents, website reader, overview/index status, source removal/rebuild, saved five-question brand profile, factual/context limitations |
| AI Studio | `AiContentGeneratorCard.tsx`, `AiDraftReviewModal.tsx`, `KnowledgeClarification.tsx`, `lib/calendarAiGeneration.ts`, `lib/openai.ts` | Campaign objective, dates/cadence/timezone/platforms, instructions, asynchronous generation, clarification, draft editing/confirmation/removal, no implicit publishing |
| Research | `BusinessResearchPanel.tsx`, `lib/knowledge/research.ts`, `researchPlan.ts`, `researchHandoff.ts`, research route | Focus questions, preferences, source exclusions, run progress/history, evidence, feedback, included findings, freshness and brief handoff |
| Channels | `ChannelsWorkspace.tsx`, `ChannelCapabilities.tsx`, Instagram/TikTok/Additional/WhatsApp connection cards, channel OAuth routes | Intended-account selection, permission-aware connection/reauthorization, separate messaging setup and capabilities; no blanket feature guarantees |
| Inbox | `SocialLeadInbox.tsx`, `InboxSetupPanel.tsx`, `ReplyDraftAssistant.tsx`, `XChatInbox.tsx`, `lib/socialMessaging/` | Conversation filters/replies, mobile list/chat, focused desktop view, provider reply windows, AI settings/drafts, client visibility, human handoff, owner-only encrypted X tools |
| Leads | `CalendarLeadsPanel.tsx`, leads API | Contact create/edit, qualification and pipeline stages, filters/pagination, CSV up to 500 rows/under 2 MB, filtered export, no claimed reminder automation |
| Reporting | `CalendarReportingPanel.tsx`, reporting components, `lib/reporting/data.ts`, reporting routes | Date/applied multi-platform filters, saved refresh vs provider sync, observed/missing counters, account/native posts, private lead gating, AI recommendations and generation handoff |
| Production summaries | `ReportingProductionSummary.tsx`, `lib/workspaceOverview.ts` | Workspace-wide channel mix, internal/client stages, fully approved metric and attached-media counts; explicitly independent of report filters |
| People | `WorkspaceTeamPanel.tsx`, `lib/calendarTeamPolicy.ts`, `lib/calendarPermissions.ts`, team API routes | Role/delegation bounds, internal-review ability, plan-gated customization, owner protection, invitation delivery/resend/cancel, removal and activity history |
| Client/settings | workspace page Client section, `CalendarPasswordDisplay.tsx`, `CalendarSettingsMenu.tsx`, client portal and access API | Separate password-unlocked client view, internal visibility gate, read-only inbox option, rename, allowance links and explicitly destructive actions |

Component paths above are relative to `components/calendars/` unless a different path is shown.

## Important distinctions preserved in the help

1. Internal approval precedes client visibility; confirming an AI draft is not internal approval.
2. Approved, scheduled and published are different states; a successful connection does not certify publishing or analytics.
3. Auto-publish off prevents normal new-approval queuing; turning it back on does not backfill approvals made while off. In-flight deliveries may finish.
4. Website ingestion reads the homepage plus up to four relevant pages, not every page. Document extraction and per-request retrieval are distinct.
5. Research is external evidence, not authoritative business policy. Excluding findings affects future context, not previously generated output.
6. Brand personality shapes expression; factual business knowledge, customer intent and safety/handoff rules retain priority.
7. Missing social metrics remain unavailable rather than invented zeroes. Lifetime and period counters are labelled separately.
8. Bottom production summaries are whole-workspace statistics, separate from applied performance filters.
9. Human handoff pauses automatic conversation control and creates owner/responsible-teammate alerts; email delivery is not promised as instant.
10. Encrypted X requires owner/device unlock and is excluded from shared history and AI. Closing its dropdown is not locking the session.
11. Roles, feature entitlements, provider scopes and configuration independently affect available controls.

## Follow-up observations

- UI labels and provider capabilities can change. Maintain guides alongside feature changes; use the shared source as the canonical catalogue.
- Some social connections need external approvals/configuration. The help directs users to actual access/error notices rather than promising all metrics or DM support.
- Saved content and research may already be outdated; updating knowledge cannot rewrite prior posts or messages automatically.
- Exact business-document limits depend on ingestion configuration. Help defers to uploader errors rather than publishing an assumed universal PDF limit.
- Further help centres for project delivery and portfolio are intentionally outside this release. No placeholder links claim these guides already exist.
