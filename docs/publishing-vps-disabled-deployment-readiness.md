# Disabled VPS deployment readiness

**GO for separate approval of a disabled artifact installation only. Production publishing remains NO-GO. No remote operation was performed.**

Release: `sw-disabled-78484da7afe5-3498b2e0f20d78e5`. Source commit: `78484da7afe53deec8b359c3294c41f97b8350ed`. The repository contains uncommitted accepted integration changes; `release.json` records the exact relevant working-tree source hashes. This is explicitly an overlay release, not a claim that HEAD contains all bundled code. Commit/archive the reviewed source before a later active release.

## Artifact and transfer inventory

Archive: `dist-vps-disabled/sw-disabled-78484da7afe5-3498b2e0f20d78e5.tar.gz`.
Archive SHA-256: `0f5ba2e8a48019f5daef2f23863b9ef8143fc17047010d16a80abb9d08067e2a`.
Transfer exactly that archive and its adjacent `.tar.gz.sha256` file. Pin the hash above independently; a checksum transported alongside an archive is not a signature. No credentials, frontend, node_modules, development dependencies, database, media binaries or test infrastructure are included.

Runtime: existing Node.js 22 only; **zero external runtime packages**. Bundled graph permits only `node:crypto` and `node:perf_hooks`. Exact build Node 22.23.1 and esbuild 0.25.12 are recorded. Build with existing installed dependencies: `node scripts/vps/package-disabled.mjs`; deterministic archive headers and gzip timestamp. Two final builds produced the identical hash above. This does not promise identical bytes with another compiler version.

| Extracted file | SHA-256 |
| --- | --- |
| `check.sh` | `f05b58d0584da194c43279e3fe96b579c98be1a46538f11fd7ad434d06e7e5ad` |
| `disabled.json` | `8ff384454bf619cee6ad2997da0a2be87fc2ab97875fc5a13039dfd0897d7018` |
| `install.sh` | `0ad73561f183cd6d1a89216598bdf447620058f1fbc36c6cb64eb039eddc5d91` |
| `main.cjs` | `8226c16f4d0358afcdf4b959bd586109301dfa47b366b50256ad4fc801d925c0` |
| `metafile.json` | `d926f4b5ffeaad38e0bf0bdeed2fe00191af513083ce25e79d70cfa55ebb0985` |
| `offline-deny.cjs` | `abe54e8b33b95a26f16a3d6b55359e7e3bb0aa4dd93dba7e59e60b315a31114b` |
| `release.json` | `b8256c9485348ff3b6d7864e0aa3f79a4e831f0b62b936d25f277c28625689a1` |
| `rollback.sh` | `e5d58bf7798f38eaf0b08efc21467dd7a7478b2819ed75cda7ded7c2f8b28137` |

`SHA256SUMS` itself is protected by the pinned archive hash; it enumerates all eight other package files. `release.json` includes relevant source SHA-256 hashes and runtime dependency inventory. `metafile.json` contains the compiled dependency graph.

## Default-disabled enforcement

`check.sh` requires Node 22, verifies every listed file, strips inherited environment variables and executes only `--check-composition` with `disabled.json`. Exact output:

```json
{"state":"disabled","publishingEnabled":false,"databaseConnected":false,"maySend":false}
```

The composition uses rejecting database/provider/storage dependencies and performs an inactive poll then closes. The wrapper denies network primitives, child processes and timers. Bare startup exits 78. Enabled, absent/invalid and extra-field configurations fail closed. No job consumption, credential loading, billing/storage calls, provider clients, listeners or scheduled execution are installed. Source owner VPS in the template is a future configuration value, not an ownership transition.

There is deliberately **no systemd unit, timer, cron or long-running service**. Installation only changes `/home/showwork/app/publishing-disabled`, a dedicated link that is separate from the application itself. Never use `node main.cjs` as a service. The offline preload is a regression guard, not an OS sandbox against malicious replacement; validate the approved archive hash before execution.

## Prerequisites and separately approved commands

Expected, unverified server: 162.35.116.148, Ubuntu 24.04, Node 22, user showwork, `/home/showwork/app` and `/home/showwork/releases` already owned/writable by showwork. Existing FFmpeg/FFprobe are unused in this disabled package. Verify disk capacity, directory ownership, no unexpected symlinks, trusted node binary/PATH, and availability of GNU `sha256sum`, `tar`, `mv -T`, POSIX sh. Do not alter SSH, firewall, system services or other applications. Existing `/etc/showwork` and `/var/lib/showwork-publishing` are unused.

After **separate transfer/installation approval**, from the repository run:

```sh
scp dist-vps-disabled/sw-disabled-78484da7afe5-3498b2e0f20d78e5.tar.gz dist-vps-disabled/sw-disabled-78484da7afe5-3498b2e0f20d78e5.tar.gz.sha256 showwork@162.35.116.148:/home/showwork/releases/
ssh showwork@162.35.116.148 'umask 077; cd /home/showwork/releases && printf "%s  %s\n" "0f5ba2e8a48019f5daef2f23863b9ef8143fc17047010d16a80abb9d08067e2a" "sw-disabled-78484da7afe5-3498b2e0f20d78e5.tar.gz" | sha256sum -c - && sha256sum -c sw-disabled-78484da7afe5-3498b2e0f20d78e5.tar.gz.sha256 && mkdir .stage-sw-disabled-78484da7afe5-3498b2e0f20d78e5 && tar -xzf sw-disabled-78484da7afe5-3498b2e0f20d78e5.tar.gz -C .stage-sw-disabled-78484da7afe5-3498b2e0f20d78e5 && ./.stage-sw-disabled-78484da7afe5-3498b2e0f20d78e5/sw-disabled-78484da7afe5-3498b2e0f20d78e5/install.sh'
```

Do not run these commands during preparation. The pinned hash is checked before extraction. Stage creation fails if it already exists; inspect interrupted installs rather than blindly rerunning. Installation refuses an existing release and an unrelated/directory application target. The script validates before and after copying, sets files 600/scripts 700, uses umask 077 (release directory 700), and atomically updates only the dedicated link. No root privileges or service changes are needed. On interruption retain staging/release evidence for inspection; do not delete another release. Delete approved staging/archive copies only after verifying the installed artifact.

Disabled installed verification:

```sh
ssh showwork@162.35.116.148 '/home/showwork/app/publishing-disabled/check.sh'
```

Expected output includes eight checksum OK lines followed by the JSON above. No secrets are required. `systemctl is-active showwork-publishing.service`, `systemctl is-enabled showwork-publishing.service` and `journalctl -u showwork-publishing.service --no-pager -n 50` may be inspected read-only after approval: this task installs no unit, so absent/inactive/disabled is expected; an existing active unit is a blocker requiring investigation, never permission to stop it. Offline checks log only checksums and sanitized status.

## Rollback

Record `readlink /home/showwork/app/publishing-disabled` before installation if it exists. For a previous reviewed disabled release:

```sh
/home/showwork/releases/sw-disabled-78484da7afe5-3498b2e0f20d78e5/rollback.sh PREVIOUS_DISABLED_RELEASE_ID
```

Rollback validates the previous artifact, requires the dedicated link and atomically replaces it without changing services, application routes, database state or ownership. It rejects traversal and unrelated targets. A first install has no prior release: after separately approved rollback, verify the link points to this exact release and remove **only that link**; retain release/evidence. Do not run down migrations, restore old database snapshots or stop Netlify. No database rollback is part of this installation.

## Configuration and security

No environment variables or secrets are required in disabled mode. `DATABASE_URL`, social client/token secrets, billing credentials, storage credentials, callback secrets and canonical-host activation flags are deliberately absent. No `.env` is transferred or sourced. Configuration JSON includes strict pool/concurrency limits, schema and proposed API versions, but none are contacted or validated with real services. Future activation must separately review versions, pooled connection transaction semantics, approved database grants/RLS, secret delivery and shared immutable media/journal storage.

Future secrets should be delivered through a separately approved secret-management procedure to non-world-readable showwork-owned files (directory 700/files 600), never CLI arguments, archives or logs. The existing `/etc/showwork` ownership must be verified and provisioning approved separately. Later active composition must use reviewed injected database/storage/provider adapters and default-disabled controls on every host. This package cannot be activated by setting a config flag.

Future monitoring requires redacted structured logs, durable authorization/outcome metrics, uncertain-age/journal/ownership/eligibility/account/pool-pressure alerts and an independently reviewed service definition. This package provides offline validation only. Updates create new immutable version directories, validate them, then replace the dedicated link; retain prior releases for rollback. No retention deletion is automated.

## Local verification

- Node 22.23.1; worker TypeScript passed.
- Six package tests passed: exact inventory, inert composition, invalid/enabled config and bare startup rejection, denied network/process/timer probes, artifact tamper rejection, installer user/service safeguards, and validated rollback preserving unrelated app data.
- 31 worker-build/lifecycle/ownership/retry regressions passed, zero failures/skips.
- Shell syntax and scoped whitespace checks passed.
- Repeat packaging produced identical release ID and archive SHA-256.
- Rollback executed against disposable local paths; macOS test shim models GNU `mv -T` with same-filesystem atomic rename. Real Ubuntu permission/utility behavior is **not remotely verified**. No network namespace/packet capture was used; evidence is rejecting dependencies, import allowlist and fail-closed offline primitive probes.
- Temporary test directories were removed in test finally blocks. No downloads/installations, PostgreSQL or new infrastructure were needed. Previous 733-test database/application results remain historical evidence; they were not rerun or represented as new tests.

## Findings and blockers

Disabled installation has no identified local packaging blocker. Actual server state, permissions, Node executable and available utilities remain pre-install verification requirements; they are expected configuration, not established facts. Separate approval is still mandatory before transfer or connection.

Active publishing remains blocked by the eight policy decisions and 21 adjacent incomplete integrations in `publishing-launch-critical-readiness.md`, real provider/billing/storage verification, migration/grant review, production-shaped active runtime/service approval, all-sender compatibility and explicit ownership/cutover authorization. This artifact must not install the incomplete application profile in Next/Netlify, alter existing posts, drain legacy senders or change epochs. Packaging readiness does not resolve those launch blockers.

## Exact local changes

Created: `scripts/vps/package-disabled.mjs`; `scripts/vps/disabled/check.sh`, `offline-deny.cjs`, `install.sh`, `rollback.sh`; `tests/vps-disabled-release.test.mjs`; this report. Generated/rebuilt: `dist-worker/main.cjs`, `dist-worker/metafile.json`, the release directory and archive/checksum files listed above. Existing application code, worker contracts, Netlify files/configuration and database schemas were unchanged by this task.

No VPS connection, file transfer, production database access, provider/billing/storage request, migration, service start/enable, worker activation or ownership change occurred. **Production remains untouched and publishing remains NO-GO. Stopped for review.**
