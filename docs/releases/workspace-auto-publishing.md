# Workspace automatic publishing

Content now has an “Auto-publish approved posts” switch. Owners and collaborators with publishing.manage can change it. The workspace setting defaults to true, including existing workspaces.

Turning it off keeps new client approvals as APPROVED without creating an automatic schedule. Existing unsent schedules pause. Turning it on resumes those existing schedules; it does not backfill posts approved while disabled. Deliveries that crossed the sending boundary may finish, and accepted TikTok deliveries continue reconciliation.

TikTok still requires explicit per-post settings and consent. Existing canonical publishing requires explicit publishing authorization; this setting gates execution and does not create new delegated authority.

## Deployment

Deploy the updated website AND every publishing worker, including the VPS worker. An older worker does not enforce this preference. Apply migration 20261022050000_workspace_auto_publish before running the new code and generate Prisma Client during the build. No new environment variables are required.

The targeted migration was applied and recorded on the database configured in the local environment on 2026-10-22. This does not establish that other environments share that database. Neither website nor worker deployment was performed.

## Validation

TypeScript check passed. 63 distinct selected unit/regression tests passed, including permission checks, pause behavior, client approvals with automation on/off, and existing TikTok publishing safeguards. No real post was published.

The additional disposable PostgreSQL integration test for pause/resume was added, but could not run because its required local PostgreSQL installation was unavailable. Browser interaction and production end-to-end publishing have not been verified.
