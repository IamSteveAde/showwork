# Portfolio subdomains after the Netlify-to-Vercel migration

Audit: 26 October 2026. No deployment, DNS edit, provider-resource deletion, content migration or intentional database write was performed. Public page requests can increment the application's existing view counter.

## Verified findings

| Check | Result |
| --- | --- |
| `nkechi-chukwulo.useshowwork.com/` | HTTP 503, Cloudflare, `x-nf-request-id`; response JSON `error: usage_exceeded` |
| `www.useshowwork.com/portfolio/nkechi-chukwulo` | HTTP 200, Vercel, matched `/portfolio/[slug]` |
| `useshowwork.com/portfolio/nkechi-chukwulo` | HTTP 308 to the working www path |
| `the-creative-rexxie.useshowwork.com/` | Same Netlify-tagged HTTP 503 |
| `www.useshowwork.com/portfolio/the-creative-rexxie` | HTTP 200, Vercel |
| `sopy-studios.useshowwork.com/` | Same Netlify-tagged HTTP 503 |
| Random nonexistent wildcard hostname | Same Netlify-tagged HTTP 503, before an application-level not-found response |
| Main www website and `/login` | HTTP 200, Vercel |
| Authoritative nameservers | Cloudflare (`princess` / `rene.ns.cloudflare.com`) |
| Affected hostname A lookup | Cloudflare edge addresses; does not disclose the origin behind proxying |
| User-supplied Vercel CNAME target A lookup | `216.198.79.1`, `64.29.17.1`; does not prove the currently active Cloudflare origin |

Read-only record comparison:
- Affected slug exists, created 26 August 2026, ACTIVE, 9 sections, 97 media records.
- `the-creative-rexxie` exists, created 22 October 2026, ACTIVE, 1 section, 1 media record.
- `sopy-studios` exists, created 21 October 2026, ACTIVE, no sections/media.

The old-versus-new distinction is not reproduced when comparing actual subdomains: newer subdomains fail too. New sharing links are generated as `/portfolio/<slug>` by `lib/portfolioUrl.ts`, avoiding the failing wildcard hostname. No creation-date check controls public portfolio resolution.

## Architecture and root-cause boundary

`Portfolio.slug` is unique. Both normal and agency creation write ordinary database records with slugs; they do not provision independent Netlify sites. Portfolio has no Netlify site ID, hosting URL or deployment metadata. `app/portfolio/[slug]/page.tsx` loads the same record, sections, testimonials and media regardless of age. Uploaded media uses `publicUrlFor(fileKey)` backed by R2. Existing banner/hero fallbacks are retained.

`middleware.ts` internally rewrites portfolio hosts to `/portfolio/<slug>` without redirecting the public URL. `next.config.mjs` contains no Netlify portfolio proxy/redirect. Netlify references in publishing/billing/background services are unrelated to this portfolio request and were left untouched.

Confirmed failure: wildcard hostname traffic is still served by a Netlify-tagged origin reporting `usage_exceeded`, while the same portfolio record renders on Vercel via its path. This is an upstream hostname/origin migration problem, not a missing portfolio or a required republish.

NOT confirmed: the exact Cloudflare DNS record currently active, Worker route, origin override, SaaS custom hostname, load-balancer origin, Vercel wildcard association/certificate state or retained Netlify custom-domain association. No authenticated Cloudflare/Vercel/Netlify dashboard tools were available. The supplied DNS export is evidence, not a live configuration read. A TLS-verified direct-origin probe using the exported target IP failed its handshake; this does not establish whether the certificate, network path or project association caused that failure.

## Local code change

Only `middleware.ts` changes runtime behaviour:
- Normalises hostname casing, optional port and trailing dot.
- Resolves valid single-label portfolio hosts through the existing slug-backed page.
- Avoids double-prefixing already resolved portfolio paths.
- Leaves root/www, localhost, API paths, Next internals and shared static assets at their normal routes.
- Does not trust forwarded host values or add a Netlify fallback.

This is routing hardening, not a claim to repair Cloudflare before traffic reaches Next.js. No URL, slug, asset key or database schema was changed. `lib/portfolioUrl.ts` remains unchanged; existing subdomains remain supported aliases and are not redirected to replacement URLs.

Files added: `tests/portfolio-subdomain-routing.test.cjs`, `tests/portfolio-compatibility.test.cjs`, and this report. No environment-variable changes or migration required.

## Infrastructure work required — inspect first, change only with approval

1. Export Cloudflare DNS/rules/Worker bindings and record the current Vercel domain assignments and production deployment. Retain the old Netlify configuration for rollback; do not delete it.
2. In **Vercel → Showwork production project → Settings → Domains**, inspect `*.useshowwork.com`. It must be assigned to this project/production environment and serve the application, not redirect all tenant hosts to www. Add it if absent only after approval. Record the exact project-specific traffic CNAME and any verification records Vercel displays. Check certificate status, not just the presence of a DNS record.
3. Keep Cloudflare authoritative DNS. If Vercel requires wildcard certificate delegation, follow its current external-provider procedure: in Vercel's team Domains page select `useshowwork.com`, enable Vercel DNS there while retaining the registrar's Cloudflare nameservers; in Cloudflare add the two NS records at `_acme-challenge` pointing to `ns1.vercel-dns.com` and `ns2.vercel-dns.com`. Confirm this challenge name is not needed by another active certificate provider before approving delegation. This delegates certificate validation only, not email or all domain DNS.
4. In **Cloudflare → useshowwork.com → DNS → Records**, inspect the *live* wildcard CNAME and all explicit portfolio-host A/AAAA/CNAME records. Specific records override a wildcard. The approved traffic target must match Vercel's actual project guidance; do not substitute an arbitrary fixed IP or infer the origin from Cloudflare edge addresses. Do not change apex/www, MX, SPF, DKIM, DMARC or other service records. A temporary DNS-only canary is possible only after its Vercel host/certificate is ready and explicitly approved; the orange/grey cloud switch alone is not a guaranteed fix.
5. Use **Cloudflare Rules → Trace** for the affected host, a newer host and a random missing host. Review matching Redirect Rules, Origin Rules, old Page Rules, Cloud Connector and load-balancer origins. Inspect **Workers & Pages → relevant Worker → Settings → Domains & Routes**, plus zone Worker routes/custom domains and any SaaS custom-hostname configuration. Look for hostname/resolve/SNI overrides or Worker `fetch()` targets still pointing to Netlify. A Worker need not appear as a redirect in curl output.
6. Correct only the identified matching Netlify routing dependency, with a narrow portfolio-host condition preserving apex/www and unrelated worker routes. Preserve the original Host header to Vercel so middleware can resolve the slug. Do not broadly disable all Cloudflare rules or all Workers.
7. In **Netlify → old Showwork site → Domain management**, record wildcard and explicit custom-domain associations and any remaining dependencies. Keep resources; removing a Netlify domain association alone does not repoint Cloudflare. Netlify's reported usage issue explains its current 503, but paying/re-enabling Netlify would not complete migration to Vercel.
8. Re-run public checks. If caching is implicated by actual headers/configuration, purge only affected portfolio-host URLs after the origin correction, not the whole zone. Current failure reports `DYNAMIC`; a blanket cache purge is not an evidence-based fix.

References:
- [Vercel wildcard domains and external DNS certificate delegation](https://vercel.com/docs/domains/working-with-domains/add-a-domain#use-wildcard-domains-with-an-external-dns-provider)
- [Cloudflare Origin Rules](https://developers.cloudflare.com/rules/origin-rules/)
- [Cloudflare Trace](https://developers.cloudflare.com/rules/trace-request/)
- [Cloudflare Worker routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [Cloudflare wildcard DNS](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/)

## Validation and release sequence

Local tests run through real NextRequest/NextResponse middleware, real portfolio page and create/edit handler functions with isolated mock storage. They cover old/recent/custom slugs, query preservation, assets/API exclusions, invalid/nested hosts, root/www/login/dashboard routing, missing-record not-found, multiple sections, existing asset URLs and hero fallback, authenticated creation, edits preserving slugs/media and unauthorised mutations. No production creation/edit was attempted.

No unpublished boolean/state exists in the audited Portfolio model, nor a separate publish-to-host operation. Portfolios are created as database-backed public records. Tests cover nonexistent records; they do not invent an unpublished-state policy or change billing visibility.

- 12 local tests passed; TypeScript passed.
- Public main site/login and old/recent path-based portfolio routes: passed HTTP checks.
- One sample image from the affected portfolio and one from the recent portfolio each returned HTTP 200 with image/png. This does not prove that every stored asset was downloaded or visually checked.
- Authenticated browser login, actual browser/mobile rendering, actual production create/edit and restored wildcard TLS/routing remain unverified. The original subdomain is still failing until external configuration is corrected.

Release: review this diff independently of unrelated workspace changes; deploy only the reviewed portfolio release to Vercel after approval. In parallel stage the confirmed domain/certificate configuration, validate one existing hostname, then approve the exact narrow routing/DNS correction. Verify old/new/custom hosts, missing-host 404, shared assets, main site/auth and a disposable approved create/edit exercise before declaring restored. Existing owners do not need to recreate, republish or rename anything.

Rollback: retain exports and original deployment ID; revert only this middleware commit/redeploy the prior Vercel release if needed, and restore only the changed Cloudflare records/rules/bindings and Vercel domain assignment from the snapshot. Keep certificate delegation until dependency review confirms it is safe to remove. There is no database rollback because no migration/content rewrite is proposed. Restoring the previous Netlify route may restore the existing 503; it is not a healthy fallback until Netlify is independently usable. Preserve the working main-domain path as the temporary access route.
