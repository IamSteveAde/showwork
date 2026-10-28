# Project Delivery: feature and help audit

Reviewed: 27 October 2026. Scope: current local implementation, not live infrastructure certification.

## Deliverables

- Public help centre: `/help/project-delivery`, alongside `/help/workspace`.
- Shared searchable, responsive help interface with task-based guides, deep links, related guides, printing, prerequisites and troubleshooting.
- Delivery-specific source catalogue: `lib/help/deliveryGuides.ts`.
- Written handbook: `docs/help/project-delivery-handbook.md`.
- Help links in the direct-delivery and managed-project dashboards, opening a separate tab to preserve current work.

## Audited feature map

| Area | Main inspected implementation | Coverage |
| --- | --- | --- |
| Direct project creation | `app/dashboard/new/page.tsx`, `app/dashboard/projects/page.tsx` | Client name, suggested/custom access code, tagline, typed media sections, initial uploads, account limits |
| Creator dashboard | `app/dashboard/[projectId]/page.tsx`, `ProjectTabController.tsx` | Overview, Work, Client access, Team, Activity, approval health, delivery stage, presentation/edit controls |
| Upload/add/organize | `AddMoreFilesButton.tsx`, `SectionHeader.tsx`, `AddSubSection.tsx`, `AddTaskSubSection.tsx`, `lib/uploadClient.ts`, `lib/deliveryUploadClient.ts`, `lib/deliveryUploads.ts` | New/add-file/task/replacement flows, sections/subsections, pause, resumable transfer and registration recovery, limits and failure notices |
| Files and revisions | `FileGridItem.tsx`, `ReplaceFileButton.tsx`, `ReviewsModal.tsx` | Asset inspection, client-review records, revised upload, file actions and destructive controls |
| Client gate/payload | `app/[slug]/page.tsx`, `app/[slug]/DeliveryPage.tsx`, `lib/deliveryAccess.ts`, viewer verification routes | Name/email identity, access code, signed viewer session, omitted locked media, managed pre-publication gate |
| Review and comments | `ProjectContent.tsx`, `ReviewControls.tsx`, `VideoComments.tsx`, `VideoModal.tsx` | Image/video/document review controls, approval/revision notes, timed video comments, authenticated reviewer identity |
| Payment/release | `DeliveryStatusControl.tsx`, `PaymentReleasePanel` in project page, `lib/paymentSync.ts` | Delivered/Approved/Paid, explicit owner confirmation, normal client-download lock, distinction from creator Showwork billing |
| Downloads | `lib/download.ts`, `app/api/download/route.ts`, `app/api/download/archive/route.ts` | Authorized native single downloads, temporary URLs, streamed section archive, 100-file/1 GiB cap, error recovery |
| Direct team | `CollaboratorsPanel.tsx`, project invite endpoints | Search/select/invite by email, active membership, pending invites, removal/cancellation; no invented workspace-style role editor |
| Managed creation/brief | `app/dashboard/new-managed/page.tsx`, `app/dashboard/managed/[managedProjectId]/page.tsx`, `ManagedProjectBrief.tsx` | Project brief fields, references/attachments, deadlines, optional client brief visibility |
| Managed team/tasks | `ManagedProjectCollaborators.tsx`, `ManagedProjectTasks.tsx`, managed API routes | Team invitations, title/description, assignee, priority/due date, task uploads/subsections, owner internal asset approval/changes |
| Managed publication | `ManagedProjectPublish.tsx`, managed publish route, `ManagedProjectClientView.tsx` | Owner publication, approved assets promoted into linked delivery, progress before publication, finished files after publication, later approved work |
| Activity/deletion | Direct dashboard Activity, `DeleteProjectButton.tsx`, project deletion/access checks | Recorded visits, reviewer identities, ownership bounds, destructive deletion, no claim of complete playback/download proof |

Component paths are relative to `components/` unless otherwise shown.

## Critical distinctions and limitations

1. Direct delivery begins with files; managed projects start with a brief/tasks and require explicit publication of approved work.
2. Internal managed-asset approval, client-file approval and creator payment confirmation are separate decisions.
3. Publishing to a client portal does not publish content to a social network.
4. A creator's Showwork subscription/project-access payment is not the client's payment for creative services.
5. `Paid` is the creator's deliberate confirmation and releases normal client download actions. It is not automatic reconciliation of funds owed by the client.
6. Download locking is not DRM. Browser screenshots/screen recording cannot be reliably disabled, and an existing public original URL is not revoked by a hidden download control.
7. Transfer recovery is conditional on valid sessions. Initial forms/local File objects are not guaranteed to survive reload/tab close.
8. New poster generation does not backfill every legacy video. Format/codecs, browser support, network and hosting limits still matter.
9. Client activity is recorded visits, not guaranteed proof of complete watching, approval, payment or download.
10. Delivery collaboration does not inherit Marketing Workspace role labels/permission settings.

## Validation scope

Help tests use synthetic content and SSR. No real client files, live storage transfers, paid payment flows, emails, production migrations, deployment or VPS changes were initiated. Existing delivery regression tests are used where appropriate; provider/CORS/bucket configuration, browser device behaviour and live payment delivery remain operational checks, not claims established by this documentation release.

The existing upload/security implementation audit remains in `docs/project-delivery/upload-release.md`; this help release does not change those mechanisms or resolve outstanding infrastructure work.

## Maintenance

Update `lib/help/deliveryGuides.ts` alongside UI or policy changes, then run `node scripts/generate-delivery-handbook.cjs` to regenerate the written handbook. The workspace and delivery pages share presentation, but use independent guide catalogues and canonical routes. Portfolio help is now available at `/help/portfolio`; the product switcher links the three independent guide catalogues.
