# Research opportunities release

This release adds a workspace-scoped research plan (marketing goal, audience, priority questions and excluded domains), opportunity evidence/relevance/uncertainty/success criteria, persistent manager feedback, and a review-before-generation handoff into AI Studio. Old research results remain readable; missing opportunity fields are optional for historical records.

Plans and feedback require knowledge.manage. Viewing retains knowledge.view; creating a brief additionally requires ai.generate in the UI and the existing generation API permission checks. Every run and feedback update is scoped to the calendar. Feedback updates lock the run to avoid lost updates. Excluded domains also exclude subdomains; unsafe URL protocols are rejected when selecting research sources. Existing fresh-research eligibility (matching source fingerprint, last 30 days) remains. Source exclusions are applied when assembling current AI context, not only on new runs.

Research remains asynchronous; content generation does not initiate research. Existing scheduled research uses the saved plan as well. Saving a plan, feedback, and opening AI Studio do not call an AI provider. Start research and Generate remain explicit paid actions. The research topic, public website addresses, and plan goal/audience/priorities go to web-enabled research; selected private business knowledge and prior finding feedback are used in the separate relevance analysis. Do not enter private information in public research fields. Exclusions filter citations and downstream findings; this is not a network firewall guaranteeing the search provider never visits an excluded site.

Create brief transfers opportunity instructions, uncertainty, sources and evaluation criteria into the current workspace's generation form. It does not generate or publish a post. Normal generation review and knowledge safeguards remain. Manager feedback influences subsequent research; it is a preference, not a verified business fact or a trained custom model. Business Knowledge and observed analytics retain precedence over external hypotheses.

## Release

Review and apply the additive migration `20261027180000_research_opportunities` before serving code, regenerate Prisma and redeploy the website. No new environment variables. Existing scheduler setup is unchanged. No production migration, deployment or paid AI test was performed. If content generation runs in a separate deployed service, verify it uses the updated context helper to enforce source exclusions too; this release does not update that service.

## Validation

`node --test tests/research-opportunities.test.cjs` tests input bounds, source filtering, workspace-scoped one-shot handoff, permission checks, plan persistence without AI execution and cross-workspace feedback isolation. Source-only TypeScript checking also applies. Browser usability and real research quality need a separately approved live run after migration. Inbox question discovery and post-performance experiment tracking are future work, not part of this release.
