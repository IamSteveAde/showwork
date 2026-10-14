# Security remediation and VPS preparation

Status: **NO-GO for GitHub push, production deployment and publishing activation**. Local branch remains `development/vps-publishing`, HEAD `19d3a66`. No refs were rewritten, no remote was contacted, no credentials were rotated, no VPS was accessed, no production database was connected and no live Netlify configuration was edited.

## Security findings and local fixes

| Finding | Classification and action |
|---|---|
| `docs/publishing-diagnostic-final-permissions.md:131` | User reports a confirmed real database credential exposure. In the current checkout and inspected reachable version, the matched password/project fields are placeholders, so a literal real password could not be reproduced. Treat the reported earlier exposure as real regardless. Removed the entire URL example and replaced it with private-runtime configuration instructions. Do not paste a replacement URL into documentation. |
| `tests/publishing-gateway.test.cjs:99` | Loopback synthetic credential, not evidence of a production login. Removed static password; constructs a random ephemeral test password at runtime. Password-required/TLS/destination rejection coverage remains. |
| `tests/publishing-hardening.test.cjs:6` | Same synthetic-loopback classification and randomized fixture fix. |
| `public/images/del.html` | Additional confirmed sensitive saved browser page, approximately 4.2 MB, with an authentication JWT and session/profile data. Replaced the page with an inert placeholder. No app reference was found. No token/profile values were output. The token's embedded expiry is in the past, but expiry is not proof that the account/session exposure is remediated. |
| `.env.example` | Placeholder database URL removed to avoid copying credential-bearing URI patterns; now empty with private-configuration instructions. Other reviewed placeholder/synthetic fixture findings were not actual credentials. |
| Ignore rules | `.env.production` and `.env.staging` were not ignored. Added `.env.*` with only `.env.example` exempt, common private-key/container formats, private runtime/security directories, generated build metadata and local diagnostic-result paths. Existing tracked files are not retroactively untracked by ignore rules. |

The browser snapshot entered commit `41667ce` and is reachable from local `main`, development HEAD and cached `origin/main`. This establishes a shared-history problem based on local refs; current GitHub/deployed availability was not accessed or independently verified. Treat any served/cached copy as needing separate authorized removal. It is not safe to describe this as an unpushed-only leak.

## Scan scope and limitations

Scanned every tracked working-tree file with Secretlint 13.0.7 initially: 1,088 files, no findings after the initial fixes. Added a reproducible redacted-output wrapper plus a supplemental byte-pattern scanner because recommended Secretlint rules did not detect the embedded browser-session JWT. The final command scans current tracked and unignored files; Secretlint handles text and the supplemental scan also inspects binary bytes. Counts grow with these preparation files. Results emit only file/object identifiers, rule types and line numbers, never matching values or raw scanner errors. `npm run security:scan` fails closed on scanner errors.

History: 277 commits and 2,776 unique reachable blobs scanned. Secretlint found three historical database-string matches at the reported paths. Supplemental audit found the real browser JWT plus reviewed synthetic/placeholder matches. Basic commit metadata token/credential patterns found none. Reviewed 70 committed diagnostic JSON/log files: no additional credential matches. Ignored files beneath scripts/docs/tests were only desktop metadata, not hidden diagnostic credential files. The actual private root `.env` was deliberately not printed or scanned as source-to-commit content. No production credential was validated against a server.

Scanners are not proof that arbitrary unknown secrets or all personal data are absent. The entire sensitive browser document was replaced rather than retaining its surrounding session data. Historical raw blobs were scanned in a temporary mode-0700 directory and removed afterward. Redacted evidence is under `docs/assessments/vps-security-preparation/`.

Pinned Secretlint development dependencies and scripts enable repeatable checks. Optional `.githooks/pre-commit` runs the scan; `.githooks/pre-push` blocks every push during preparation. Hooks are **prepared but not installed**: `.git/config` was not changed. No GitHub workflow was added and no CI/deployment was triggered. The existing `tsconfig.tsbuildinfo` remains tracked and has a pre-existing user edit; remove it from tracking only in the approved selective history/commit cleanup, preserving the local file.

## Why history rewrite is pending authorization

Your task authorizes remediation but separately requires stopping for destructive actions. Shared-history rewriting would change commit identities beyond the latest unpushed commit. No reset, rebase, force push, reflog expiration or object pruning was performed. No secret-containing backup bundle was created.

Proposed reviewable scope:

1. Preserve the two pre-existing user edits (`scripts/diagnostics/gateway/secret-denial-probe.cjs` and `tsconfig.tsbuildinfo`) without staging them. Verify their content remains unchanged. Record sanitized tree/source manifests before mutation; do not print a raw diff of the contaminated page.
2. With explicit authorization, rewrite **only `development/vps-publishing` ancestry** to omit `public/images/del.html` from all its historical trees, using a reviewed history-filter operation scoped to that branch. Preserve all other legitimate files/changes. Do not move local `main`, cached `origin/main` or any remote branch.
3. Amend/rebuild the unpushed development change with the documentation/test sanitization and reviewed preparation files, so the three scanner matches do not survive in the branch's published history. Preserve a sanitized inert page only if desired; do not restore the downloaded page. Untrack generated build metadata without deleting the user's local file. Verify that sanitized final code equals the intended working tree, excluding those explicit removals and preserved user edits.
4. Re-run Secretlint and supplemental scanning across **every blob reachable from the rewritten branch**, plus working-tree/staged changes; run regression/type checks again. Record commit mapping and new HEAD without sensitive content.
5. Other refs and unreachable local objects will still retain the old browser snapshot. A branch-only rewrite does not clean the whole repository or GitHub. Shared `main`, cached/PR/fork references and hosted copies require a separate coordinated approval and incident cleanup plan. Do not expire/prune objects or force-push shared refs without that approval.
6. Before any authorized push, inspect GitHub and Netlify branch/preview deployment settings with read-only access approval. No push now; no merge into main; no claim that a branch push cannot trigger Netlify. Existing collaborators must not merge contaminated ancestry back into the sanitized branch.

Simply amending `19d3a66` would not remove the older browser snapshot. GitHub recommends rotation/revocation first; history rewriting alone cannot revoke a credential or remove all remote cached/fork copies. [GitHub sensitive-data removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

## Credentials requiring action — no rotation performed

**Reported PostgreSQL credential:** treat the previously exposed login password as compromised, even though current scanned URL fields are placeholders. The owner must identify the affected Supabase database role privately from the original exposure/secret store; do not send it in chat. If it is an unused diagnostic role, revoke login and terminate that role's sessions through an authorized administrator, then remove its secret from any diagnostic environment. If it is a shared application role, inventory its consumers first (Netlify runtime, jobs and local tools), generate the replacement in a secure secret manager, coordinate updates/restarts and password change in a maintenance window, verify application access, then terminate old sessions and verify the old password fails. Password rotation alone does not disconnect existing sessions. A safer role transition must be audited for equivalent restricted permissions and requires separate approval. Do not arbitrarily reset Supabase JWT/service keys: a database password and Supabase API keys are different credentials.

**Browser-session credential:** invalidate the affected ChatGPT/OpenAI account's active sessions through its official account-security controls; review sign-ins and secure the account. If a password was exposed elsewhere or reused, change it through the official identity provider and enable MFA. The scan found an authentication/session token, not evidence of an OpenAI API key; do not claim API-key rotation was completed or required on that evidence alone. A separate authorized cleanup must remove historical/hosted browser snapshots and request cache/reference removal where applicable. Never use the captured token to investigate or test access.

**Synthetic fixture passwords:** no service rotation required; now random and runtime-only. No additional verified live API/storage/social credentials were identified by these scans. These statements are scoped to the inspected local code/history, not all accounts.

## Architecture and preparation deliverables

See [VPS package instructions](../deploy/vps/README.md). Kept the publishing core and live Netlify handlers unchanged. Prepared a non-root systemd template, external `LoadCredential` path, safe configuration checker, injectable lifetime supervisor, synthetic-only health checker/timer, and read-only inventory script. `--run` intentionally exits 78; no hidden production escape hatch or environment flag enables it.

The durable core has local claim/idempotency/account-concurrency/recovery tests, but the app's live action routes and legacy workers are not wired to the new ownership/uncertainty guards. Common Netlify/VPS fencing, reviewed production migrations, restricted Supabase credentials, actual five-backend accounting, provider/media integration and VPS process-recovery/latency measurements remain blockers. The VPS's Ubuntu/user/UFW/Fail2ban/Git details are user-provided, not remotely verified. CPU/RAM/disk/region and independent monitoring remain unknown.

## Validation

- Targeted gateway, hardening and VPS preparation tests: 32/32 passed.
- Publishing/gateway/TikTok/calendar/VPS regression suite: 137/137 passed.
- `npx tsc --noEmit --incremental false`: passed; no incremental build metadata written by this check.
- Local preparation config check succeeds without a DB; run/activation paths refuse. Shutdown/no-overlap/transient-error and stale-health tests pass.
- First gateway test attempt hit sandbox loopback EPERM; authorized local-listener rerun passed. No production request involved.
- First repeatable scanner batching hit an output buffer limit on large media assets. Fixed by scanning text through Secretlint and all bytes through the supplemental scanner; failures remain fail-closed. This was a scanner harness issue, not an unreviewed clean result.
- Linux systemd parser, actual VPS access, hosted execution, real database performance and production migration were not tested.

## Exact next step

Authorize the branch-only local history rewrite described above first. It will leave main/remotes untouched and preserve existing user edits; shared-history/remote cleanup remains separate. After the sanitized branch passes history scans and tests, request read-only SSH inventory permission for `showwork` at the supplied VPS address, verify its host fingerprint through InterServer's console, then run `scripts/vps/inventory.sh`. Do not clone the contaminated history, send credentials, start services or install a production worker yet.

## Exact files changed in this phase

Security: `.env.example`, `.gitignore`, `.secretlintrc.json`, `package.json`, `package-lock.json`, `docs/publishing-diagnostic-final-permissions.md`, `public/images/del.html`, `tests/publishing-gateway.test.cjs`, `tests/publishing-hardening.test.cjs`, `scripts/security/scan-repository.py`, `scripts/security/secretlint-safe.cjs`, `.githooks/pre-commit`, `.githooks/pre-push`.

VPS preparation: `deploy/vps/README.md`, `deploy/vps/worker.config.json`, `deploy/vps/showwork-publishing.service`, `deploy/vps/showwork-publishing-health.service`, `deploy/vps/showwork-publishing-health.timer`, `scripts/vps/config.cjs`, `scripts/vps/worker.cjs`, `scripts/vps/supervisor.cjs`, `scripts/vps/healthcheck.cjs`, `scripts/vps/inventory.sh`, `tests/vps-preparation.test.cjs`.

Report/evidence: this report and the redacted files under `docs/assessments/vps-security-preparation/`. The pre-existing edits in `scripts/diagnostics/gateway/secret-denial-probe.cjs` and `tsconfig.tsbuildinfo` are not changes made by this task.
