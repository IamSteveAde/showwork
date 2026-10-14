# Authorized local history cleanup — completed scope

Only `development/vps-publishing` was rewritten. Old HEAD: `19d3a66d407514f80a14137d50d5224f9823e301`. New HEAD: `78484da7afe53deec8b359c3294c41f97b8350ed`.

This report supersedes the pending-local-rewrite status in the earlier security preparation report. Production, remote history cleanup, GitHub pushes and VPS startup remain **NO-GO without separate authorization**.

## Backup created before mutation

An encrypted backup was created outside the repository at `/Users/dolikin/.local/share/showwork-security-backups/2026-10-12T18-55-58-616Z/`. It contains the original `.git` directory/index/refs and all 1,108 tracked or unignored working files, including the user's existing edits. Ignored dependencies, build directories and private environment files were not copied; the rewrite did not modify them.

The archive is AES-256-GCM authenticated encryption over gzip/tar. A random encryption key is stored separately in the private local recovery-key directory. The backup directory and key directory are owner-only mode 0700; archive mode 0600; key mode 0400, owned by the current user. No key or secret values were printed. The manifest records the archive SHA-256 and pre-rewrite file hashes/ref identities. Authenticated decryption of the complete archive and tar structure validation succeeded without extracting plaintext; 9,201 archive entries were read. This validates the archive, not a live repository restore.

The backup and key locations were checked to be outside Git repositories and known cloud-sync path locations. Only local filesystem/crypto/archive operations were used: no upload, Git remote operation or backup registration with an external service occurred. Keep both the encrypted archive and separate key private; do not add either to GitHub or attach them to an issue. Original sensitive data intentionally remains inside this encrypted recovery copy.

## Rewrite scope and preservation

All 277 commits were retained, including any commit rendered empty by removing the browser snapshot; 168 descendant commit IDs changed. Authors, committers, dates, messages and merge-parent order were retained. No signed commit/tag headers required removal.

Changes to historical trees were restricted to:

- `public/images/del.html`: omitted from every tree in the cleaned branch. The sensitive browser blob is separately checked for reachability, not just its filename.
- `docs/publishing-diagnostic-final-permissions.md`: incorporated the already-reviewed removal of the connection-string example.
- `tests/publishing-gateway.test.cjs` and `tests/publishing-hardening.test.cjs`: incorporated the already-tested random runtime fixture passwords, removing historical static credential-like literals without weakening password-required/TLS/destination validation. These fixture strings were synthetic, not confirmed production credentials.

Every rewritten historical tree was compared against its original; no paths outside these four changed. Every pre-existing working file's bytes and permissions were checked against the backup manifest immediately after rewriting. They were unchanged. Other uncommitted security/VPS preparation changes remain in the working tree; they were not swept into an unrelated commit. The inert replacement for the removed browser page remains a clean untracked file, not the sensitive historical page. The index was reset to the clean new HEAD without modifying working files, preventing the old browser blob from being left staged for accidental recommit. New report/evidence files were added afterward.

Ref comparison verified that the sole changed ref is `refs/heads/development/vps-publishing`:

| Protected ref | Before and after |
|---|---|
| `refs/heads/main` | `6272c5a5e83e5c150b65dd78d1e83e7eff51f0cb` |
| `refs/remotes/origin/main` | `6fa631cac883d87fceabb5613a457550f61ceea8` |

Every other pre-existing ref, including `origin/HEAD` and local tool checkpoint refs, remained unchanged. No remote was fetched or contacted. No push, force-push, merge, deployment, credential rotation, database connection or VPS worker start occurred.

## Verification evidence

The local publishing/gateway/TikTok/calendar/VPS regression suite passed **137/137 tests**, with zero failures. `npx tsc --noEmit --incremental false` passed with no output. The tests used mocked providers and local fixtures; the gateway HTTP tests required only authorized loopback listeners.

Working-tree Secretlint and supplemental byte-pattern checks passed. Full cleaned-history scan results are recorded in [history-scan.json](assessments/vps-history-rewrite/history-scan.json). The scan uses pinned Secretlint on text blobs and supplemental token/private-key/credential patterns on all blobs, including binary assets. Historical `.env.example` placeholder matches are identified by exact previously-reviewed blob IDs and rule/path—not a broad suppression of passwords or tokens. No actual credentials are reproduced in evidence.

[Rewrite and code-preservation verification](assessments/vps-history-rewrite/rewrite-verification.json). [Protected-ref verification](assessments/vps-history-rewrite/protected-ref-verification.json). The complete original-to-clean commit mapping remains in the private backup directory. Scanner absence of findings is bounded by the rules used; it does not revoke credentials.

## What intentionally remains

The repository as a whole is **not globally purged**: local `main`, cached remote refs, checkpoint refs and reflogs/old objects still retain old history. Preserving those refs was an explicit requirement. No garbage collection, reflog expiry, object pruning or manipulation of unrelated refs was performed. GitHub's current refs, caches, PRs, forks and any deployed copy were not inspected or changed. A clean development branch does not remove data already published elsewhere.

Do not merge old `main` into this cleaned branch: doing so would make the contaminated ancestry reachable again. Do not restore or push the backup. Existing GitHub exposure requires a separately authorized coordinated cleanup.

## Remaining GitHub and exposure-response steps — not executed

1. Separately authorize and perform the credential response in the prior report: rotate/revoke the reported exposed PostgreSQL login as appropriate to its consumers, and invalidate the exposed browser-account sessions. Neither deleting files nor rewriting commits revokes a credential. Do not use the captured token for verification.
2. With read-only GitHub access approval, inventory current affected branches, tags, pull-request refs, forks and cached commit views. Compare remote commit IDs rather than assume cached `origin/main` is current. Coordinate collaborators and review repository protections and Netlify branch/preview auto-deploy triggers.
3. Obtain explicit authorization for the exact remote branches/tags to rewrite, including `main` if still affected, and for any necessary deployment-trigger controls. Prepare a protected remote-state backup and a narrowly scoped cleanup plan that preserves legitimate code. No automatic `--mirror` push or blind force-push.
4. After all scans/tests pass, update only approved remote refs with expected-old-ID checks (force-with-lease where applicable). Request GitHub Support's sensitive-data cleanup for cached views/PR references as appropriate; coordinate forks and fresh collaborator clones. Remote-ref updates alone do not erase everyone's copies. See [GitHub's sensitive-data removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
5. Separately investigate the served/cached `/images/del.html` asset. If it remains on Netlify, removal requires a separately approved security-only deployment/cache/deploy-artifact cleanup. Base that fix on the live website version, not an accidental deployment of the unapproved publishing candidate. Existing publishing jobs must continue unless a different migration action is explicitly approved.
6. Re-scan the final authorized remote history and fresh checkout. Reconcile the cleaned development ancestry with the coordinated clean main history before normal collaboration resumes. Only then consider a separately authorized read-only VPS inventory; production worker deployment still requires the unresolved ownership, permissions, connection-budget and actual VPS reliability/performance gates.

No remote cleanup is requested or implied by this local completion report; it requires separate authorization.
