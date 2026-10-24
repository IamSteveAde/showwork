# Homepage capability audit — 24 October 2026

This is a source-code and local-test audit for homepage communications. It is not a production acceptance test. No live publishing, messages, AI generation, credentials, or VPS changes were performed. No capability is newly classified as **verified production** from this audit alone.

## Capability classifications

“Available with limitations” below means an implemented application path was found, subject to the stated conditions. The unresolved production AI-worker deployment prevents treating content generation as verified live functionality.

| Capability | Classification | Evidence and limits |
| --- | --- | --- |
| Business knowledge | Available with limitations | `lib/knowledge/context.ts`, `lib/knowledge/retrieval.ts`, business-document routes. Selected source passages and source-derived summaries; not exhaustive document or website understanding. |
| Content planning | Available with limitations | `components/calendars/CalendarGrid.tsx`, calendar post routes. Workspace access and plan capacity apply. |
| AI generation | Available with limitations; production reliability unverified | `app/api/calendars/[id]/ai-generate/route.ts`, `lib/calendarAiGeneration.ts`. Production queues work or uses the configured publishing boundary; worker/service availability and AI allowance apply. No successful live job is shown in the homepage guide. |
| Collaboration | Available with limitations | `lib/calendarTeamService.ts`, `lib/calendarTeamPolicy.ts`. Collaborator limits and role access apply. |
| Approvals | Available with limitations | `app/api/social-calendar/[slug]/posts/[postId]/review/route.ts`, `components/calendars/ClientCalendarView.tsx`. Review and approval do not guarantee successful publication. |
| Publishing | Available with limitations | `lib/publishing/platformIntegration.ts`, publishing-settings route. Deployment ownership, connected accounts, authorization, media validation, schedules, and platform consent apply. Auto-publishing can be disabled. |
| Social inbox | Available with limitations | `lib/socialInbox.ts`, inbox routes. Studio/Agency entitlement; supported connections, scopes, sync state, and messaging windows apply. |
| Lead management | Available with limitations | `lib/calendarLeads.ts`, leads routes. Studio/Agency; contact details, notes, and follow-up status, not a complete sales CRM. |
| Analytics | Available with limitations | `lib/reporting/data.ts`, `lib/reporting/adapters/`. Real stored account/post data and adapters; metric availability, permissions, sync freshness, and history vary. Basic analytics are in all plans; advanced analytics require Studio/Agency. |
| AI performance recommendations | Available with limitations | Reporting analyze route, `lib/knowledge/context.ts`. Studio/Agency; available metrics, business sources, service availability, and AI quota apply. Recommendations require human judgment. |
| AI inbox replies | Available with limitations | Inbox draft/settings routes. Drafting: Studio/Agency. Automatic replies: Agency, opt-in. No universal or autonomous response guarantee. |
| Team permissions | Available with limitations | `lib/calendarTeamPolicy.ts`, `lib/calendarPermissions.ts`. Basic collaboration and advanced permissions differ; advanced roles/custom access require Studio/Agency. |

No planned features, autonomous agents, universal channel support, or complete CRM claims were added. No customer evidence or success figures were invented.

## Integration interpretation

The existing eight logo assets and two repeated animated groups are unchanged: Facebook, X, Instagram, LinkedIn, TikTok, OpenAI, Meta, Paystack.

- Social logos refer to supported connections, not identical publishing/messaging/reporting coverage. Reporting adapters currently register Instagram, TikTok, Facebook, X, and LinkedIn. A platform appearing in an enum alone does not establish working support.
- Inbox eligibility depends on platform-specific account state and scopes; publishing connection is not sufficient to imply messaging access.
- Meta represents the Meta authorization/platform ecosystem, not an additional independent messaging channel.
- OpenAI is an AI service; Paystack is a payment service. Neither is described as a social channel.
- No fresh external platform test was performed for this homepage task.

## Commercial facts retained

`lib/contentWorkspaceEntitlements.ts` remains unchanged. Creator/Studio/Agency prices, capacities, billing cycles, seven-day trial, and feature gates are still sourced from existing configuration. Homepage plan controls and signup destinations were preserved.

## Communications changes

Kept the hero headline, established visual style, integration animation, navigation, pricing behavior, and ecosystem hierarchy. Expanded the hero and six capability groups, added a continuous lifecycle and engagement/performance section, widened knowledge/AI/audience copy, replaced principle-based trust cards with a nine-step product guide, and updated FAQ, metadata, and homepage-only footer positioning.

The guide describes actual screen names and actions. It is explicitly not a live account demonstration or fabricated dashboard. A verified live Marketing Workspace recording and approved customer evidence remain future inputs. The business demo flow remains an email enquiry, not a scheduling or email-delivery backend.

## Scope

Homepage components and homepage-only variants of shared footer/integration components were changed. Application workflows, permissions, subscription configuration, other product pages, and VPS services were not modified.

## Verification results

- `npx tsc --noEmit --incremental false`: passed.
- `npm run build`: passed on retry. The first attempt compiled and passed type validation but failed because sitemap generation could not reach the database.
- Pricing, entitlements, business knowledge, and reporting recommendation tests: 42/44 passed. Two existing entitlement tests fail in their CommonJS test loader resolving `@/lib/knowledge/context`; the affected test/backend sources were not changed.
- `npm run lint`: cannot run a configured lint check; the repository opens Next.js's ESLint setup prompt.
- Browser checks passed at 320, 390, 768, and 1440px: no horizontal document overflow and no JavaScript page errors.
- Verified six capability cards, nine expandable guide steps, ten FAQs, guide anchor navigation, keyboard expansion, mobile menu, monthly/annual pricing links, product pricing switches, required demo fields, integration pause/resume, reduced motion, and no broken internal anchors.
- Accessibility scan after animations settled: no WCAG A/AA findings in the main content (shared footer excluded; previous footer contrast findings remain outside this positioning correction).
- Source comparison against the original integration component: identical logo array, animation markup, duplicate groups, and controls.
- No production service acceptance test, email delivery, checkout purchase, deployment, or VPS action was performed.

## Homepage files changed

- `app/HomeClient.tsx`
- `app/page.tsx`
- `components/landing/HomepageSections.tsx`
- `components/landing/IntegrationsSection.tsx` (homepage variant only)
- `components/landing/PricingSection.tsx`
- `components/landing/FAQSection.tsx`
- `components/landing/SiteFooter.tsx` (homepage variant only)
