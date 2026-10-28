# Portfolio: feature and help audit

Reviewed: 27 October 2026. Scope: current local implementation and its user-facing controls, not certification of live hosting, billing or media infrastructure.

## Deliverables

- Public help centre: `/help/portfolio`, with the shared product switcher linking Marketing Workspace, Project Delivery and Portfolio.
- Guide source: `lib/help/portfolioGuides.ts` — 35 guides across 7 topics.
- Written handbook: `docs/help/portfolio-handbook.md`.
- Help links in the portfolio editor and creation/agency collection views, opening a separate tab.
- Search, topic selection, numbered instructions, prerequisites, related guides, deep links, print styling and support contact.

## Feature map

| Area | Inspected implementation | Documented coverage |
| --- | --- | --- |
| Personal creation | `CreatePortfolioForm.tsx`, `app/dashboard/portfolio/page.tsx`, `app/api/portfolio/route.ts` | Name, tagline, contact email, WhatsApp, CTA, existing-personal-portfolio behaviour; no invented setup charge |
| Studio navigation | `app/dashboard/portfolio/[id]/page.tsx` | Overview/checklist, Identity, Work, Testimonials, desktop/mobile navigation, preview and file/section counts |
| Identity | `PortfolioDetailsForm.tsx`, portfolio update route | Display name/tagline, separate desktop/mobile banners, gallery hero fallback, bio photo/text, skills, optional manually entered stat, contact fields and six social-profile links |
| Media collections | `PortfolioAddSection.tsx`, `PortfolioSectionHeader.tsx`, upload/section/media API routes | Media-type sections, images/videos/documents/PDFs as offered, add files, rename, delete, current uploader validation and recovery |
| Covers/posters | `PortfolioFileGridItem.tsx`, `PortfolioAutoplayVideo.tsx`, `lib/portfolioVideoPoster.ts`, poster route | Chosen section cover, gallery-video posters, legacy poster fallback, original/preview distinction, no claimed manual poster editor |
| Public experience | `PortfolioContent.tsx`, `PortfolioMediaModal.tsx`, `WhatsAppChatWidget.tsx`, `app/portfolio/[slug]/page.tsx` | Public media viewing, mobile layout, saved identity/work, email/WhatsApp actions, social links, no delivery-style reviewer gate |
| URLs/legacy hosts | `lib/portfolioUrl.ts`, `middleware.ts` | Canonical `/portfolio/slug` links, legacy host routing support, infrastructure-dependent DNS/host resolution, no claimed self-service custom domain editor |
| Testimonials | `PortfolioTestimonialsManager.tsx`, `TestimonialSubmitForm.tsx`, testimonial APIs | Request link, public submission, owner addition, optional ratings, approve/hide/delete, approved public display |
| Agency collection | `AgencyPortfolioList.tsx`, agency branch of portfolio dashboard | Client/brand portfolios, displayed recurring-price/card terms, payment completion, intended-portfolio selection and preview verification |
| Troubleshooting | Existing upload/media behaviour and UI notices | Failed transfers versus preview-generation errors, slow playback/codecs, missing saved work, empty sections, pending testimonials, external link handlers and legacy domain issues |

Component paths are relative to `components/portfolio/` unless otherwise shown.

## Important distinctions retained in the guides

1. Portfolio is a public showcase. It is not private Project Delivery and does not use its email/password, client approval or payment-release workflow.
2. Saved portfolio identity/work is not sent through Marketing Workspace internal/client approval. Testimonial visibility has a separate approval control.
3. Public testimonial submissions explicitly enter pending approval; owner-added testimonials use the model's approved default. The guides tell owners to check visibility immediately.
4. Changing company display name does not update the slug in the inspected update route. Share the actual preview link, not a URL constructed from the new name.
5. Social profile links and the WhatsApp widget do not authorize OAuth publishing, analytics, inbox messaging or AI auto-replies.
6. Dedicated desktop/mobile banners override the legacy gallery-hero choice. Section cover and page hero are separate selections.
7. The optional bio stat is manually supplied copy, not verified analytics. The public page's view counter is not documented as a complete attribution/visitor report.
8. New gallery-video posters do not backfill all historical videos. Separate Identity banner files follow a different path. Poster errors do not necessarily mean original-upload failure.
9. Agency billing differs from personal creation; documentation defers to displayed current terms instead of freezing a price.
10. Portfolio media is public. No screenshot prevention, original-file secrecy or private delivery protection is implied.

## Follow-up observations

- Multi-portfolio scoping needs a separate functional audit: the inspected Identity and testimonial management components use creator-level `/api/portfolio` and testimonial routes, and those routes select the creator's first portfolio. The selected agency portfolio ID is not passed through those inspected forms. This is a potential wrong-portfolio update risk for agency accounts with multiple portfolios. This documentation change does not certify or alter those update flows. Guides explicitly advise verifying the selected public page after saving and stopping edits if the wrong portfolio changes.
- Existing testimonial request-link construction in the editor depends on `NEXT_PUBLIC_APP_URL`. Validate that environment and the resulting submission link in the deployed site. No production environment was changed here.
- Legacy subdomains require actual DNS and host configuration beyond application routing. No domain/hosting changes were performed.
- Browser/device visual checks, real uploads, billing/card flows, storage permissions and poster backfills were not run for this help release.

## Validation and maintenance

Synthetic help tests verify guide completeness and related-link integrity, landing/deep-link server rendering, portfolio-only catalogue content, search/navigation route isolation, public sharing/privacy distinctions and handbook coverage. Existing workspace/delivery help tests are rerun because presentation is shared. Source TypeScript and stylesheet parsing are checked.

No production migration, deployment, paid action, real client upload, VPS update or live billing test was performed. Update the shared catalogue when controls change, then run `node scripts/generate-portfolio-handbook.cjs` to regenerate the written document.
