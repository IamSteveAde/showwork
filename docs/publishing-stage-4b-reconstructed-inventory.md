# Reconstructed Stage 4B local entrypoint inventory

Static source inventory; indirect media/cascade dependencies are included conservatively. This is not evidence of production traffic. Exact functions, fields, checks and baseline hashes are in the JSON artifact.

| File | Functions | Writes / effects | Publication dependency | Current authority | Risk / order |
|---|---|---|---|---|---|
| app/[slug]/page.tsx | generateMetadata, SlugPage | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/admin/accounts/page.tsx | deliveryPlanLabel, deliveryStatusLabel, AdminPage, creators.map:callback | creator.createdAt | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/admin/creators/[id]/page.tsx | CreatorDetailPage | creator.createdAt | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/admin/social-calendars/[id]/route.ts | PATCH | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/admin/social-calendars/page.tsx | AdminSocialCalendarsPage, calendars.map:callback | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/account/avatar/route.ts | POST, PATCH | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/account/change-password/route.ts | POST | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/account/deactivate/route.ts | POST | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/account/profile/route.ts | PATCH | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/account/route.ts | PATCH, DELETE | creator.update, creator.delete | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/admin/billing-offers/route.ts | GET, POST, PATCH, PUT | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/admin/creators/[id]/complimentary/route.ts | POST, db.$transaction:callback | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/admin/creators/[id]/route.ts | PATCH, db.$transaction:callback, DELETE | creator.update, creator.delete | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/admin/creators/bulk-import/route.ts | POST | creator.create | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/admin/creators/route.ts | POST | creator.create | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/admin/partners/[id]/route.ts | PATCH, db.$transaction:callback | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/admin/social-calendars/[id]/route.ts | PATCH | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/auth/login/route.ts | POST | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/auth/reset-password/route.ts | POST | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/auth/verify-otp/route.ts | POST, db.$transaction:callback | creator.create, creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/ai-drafts/[postId]/restore/route.ts | POST | calendarPost.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/ai-drafts/[postId]/route.ts | GET, POST, PATCH, DELETE | calendarPost.update, calendarPost.delete | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/ai-drafts/route.ts | GET, DELETE | calendarPost.deleteMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/ai-generate/route.ts | POST, db.$transaction:callback | calendarPost.create | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/business-documents/[documentId]/route.ts | DELETE | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/calendars/[id]/business-documents/upload-complete/route.ts | POST | socialCalendar.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/business-documents/upload-presign/route.ts | POST | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/calendars/[id]/business-documents/website/route.ts | POST | socialCalendar.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/channels/[channel]/disconnect/route.ts | POST | socialCalendar.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/channels/facebook/select-page/route.ts | POST | socialCalendar.update, socialConnection.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/channels/linkedin/messaging/route.ts | POST | socialConnection.updateMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/channels/linkedin/pages/route.ts | GET, POST | socialCalendar.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/channels/whatsapp/route.ts | GET, POST, db.$transaction:callback, DELETE, db.$transaction:callback | socialConnection.updateMany, socialConnection.upsert | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/collaborators/[collaboratorId]/route.ts |  | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/calendars/[id]/instagram/disconnect/route.ts | POST | socialCalendar.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/invites/[token]/route.ts |  | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/calendars/[id]/invites/route.ts | GET, POST | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/calendars/[id]/posts/[postId]/assets/[assetId]/route.ts | DELETE | calendarPostAsset.delete | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/posts/[postId]/attach-asset/route.ts | POST | calendarPostAsset.create, calendarPost.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/posts/[postId]/publish/route.ts | POST | calendarPost.updateMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/posts/[postId]/resubmit/route.ts | POST | calendarPost.updateMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/posts/[postId]/route.ts | PATCH, DELETE | calendarPost.update, calendarPost.delete | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/posts/[postId]/upload-complete/route.ts | POST, db.$transaction:callback | calendarPostAsset.create, calendarPost.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/posts/route.ts | GET, POST, db.$transaction:callback | calendarPost.create | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/report/route.ts | GET | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/calendars/[id]/reset/route.ts | POST, db.$transaction:callback | calendarPost.deleteMany, socialCalendar.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/retry-payment/route.ts | POST | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/route.ts | PATCH, db.$transaction:callback, releaseOldBanner, DELETE | socialCalendar.update, socialCalendar.delete | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/tiktok/disconnect/route.ts | POST | socialCalendar.update, calendarPost.updateMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/tiktok/messaging/route.ts | GET, POST | socialConnection.updateMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/[id]/verify-subscription/route.ts | POST | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/cancel-subscription/route.ts | POST | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/channels/[channel]/callback/route.ts | GET | socialCalendar.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/channels/tiktok-messaging/callback/route.ts | GET | socialConnection.updateMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/downgrade-to-individual/route.ts | POST | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/instagram/callback/route.ts | GET | socialCalendar.update, socialConnection.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/invites/[token]/accept/route.ts | POST | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/calendars/route.ts | GET, POST, db.$transaction:callback | creator.update, socialCalendar.create | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/subscribe/route.ts | POST | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/tiktok/callback/route.ts | GET | socialCalendar.update, calendarPost.updateMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/upgrade-to-company/route.ts | POST | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/calendars/verify-subscription/route.ts | POST | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/cron/instagram-publish/route.ts | POST | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| app/api/cron/social-publish/route.ts | POST | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| app/api/cron/tiktok-publish/route.ts | POST | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| app/api/managed-projects/[id]/brief-attachments/[attachmentId]/route.ts | DELETE | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/media/[mediaId]/replace/complete/route.ts | POST | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/media/[mediaId]/replace/multipart-complete/route.ts | POST | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/media/[mediaId]/replace/multipart-start/route.ts | POST | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/media/[mediaId]/replace/presign/route.ts | POST | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/media/[mediaId]/route.ts | DELETE, PATCH | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/payments/webhook/route.ts | getContentWorkspacePlanFromMetadata, POST | creator.update, creator.updateMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/portfolio/media/[mediaId]/route.ts | DELETE | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/portfolio/sections/[sectionId]/route.ts | PATCH, DELETE, fileKeys.map:callback | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/projects/[id]/add-files-batch/route.ts | POST | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/sections/[sectionId]/route.ts | PATCH, DELETE, fileKeys.map:callback | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/social-calendar/[slug]/posts/[postId]/review/route.ts | POST | calendarPost.updateMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/social-calendar/[slug]/reporting/route.ts | GET | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/api/social-calendar/[slug]/respond/route.ts | POST | socialCalendar.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/api/subscription/cancel/route.ts | POST | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/dashboard/[projectId]/page.tsx | ProjectDetailPage | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/dashboard/billing/BillingSubscriptions.tsx | getComplimentaryPeriod, ContentWorkspaceSubscription, BillingSubscriptions | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/dashboard/billing/page.tsx | BillingPage | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/dashboard/calendars/[id]/page.tsx | CalendarDetailPage, sections.filter(section => {
        const required: Record<string, TeamPermission> = { overview: "workspace.manage", content: "calendar.view", team: "people.view", analytics: "analytics.view", inbox: "inbox.view", leads: "leads.view", access: "delivery.manage", channels: "channels.view", knowledge: "knowledge.view", generate: "ai.generate", publish: "delivery.manage" };
        if (section.id === "overview") return can("workspace.manage") && can("calendar.view") && can("analytics.view") && can("inbox.view") && can("leads.view");
        return can(required[section.id]);
      }).map:callback | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/dashboard/calendars/page.tsx | CalendarsPage, retryDatabaseRead:callback | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| app/dashboard/profile/page.tsx | ProfilePage | creator.createdAt | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| app/social-calendar/[slug]/page.tsx | SocialCalendarPage | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/adminCustomers.ts | customerCte, customerRows, getCustomers | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/aiResearchScheduler.ts | runScheduledAiBusinessResearch | socialCalendar.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| lib/billingOffers.ts | eligibleOffers, offerQuote, initializeOfferSubscription, resolveDeliveryPlan, resolveWorkspacePlan, restoreOfferPrice, recordOfferPayment, reconcileOfferExpirations, offerSubscriptionId, billingPriceQuotes | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/calendarImport/confirmation.ts | validateConfirm, confirmImport, db.$transaction:callback | calendarPost.createMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| lib/calendarPermissions.ts | getCalendarAccess, getCalendarRole, hasCalendarPermission, canAccessCalendar, canAccessCalendarById, canUseCalendarFeature, calendarFeatureGate | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/calendarTeamService.ts | teamAccess, inviteTeammate, editTeammate, db.$transaction:callback, removeTeammate, db.$transaction:callback, cancelTeamInvite, acceptTeamInvite, db.$transaction:callback, teamErrorResponse | calendarCollaborator.update, calendarCollaborator.delete, calendarCollaborator.create | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| lib/calendarTrialEmails.ts | runCalendarTrialEmailCheck | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| lib/complimentaryAccess.ts | deliveryComplimentaryTier, workspaceComplimentaryPlan, workspaceComplimentaryEndsAt, hasDeliveryPaidAccess, deliveryComplimentaryCycleStart | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/complimentaryGrants.ts | grantProjection, refreshComplimentaryGrantsForAccounts, refreshComplimentaryGrants, refreshExpiredComplimentaryGrants | creator.updateMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| lib/contentWorkspaceEntitlements.ts | planIncludesWorkspaceFeature, workspaceFeatureUpgradeMessage, getContentWorkspaceFeatureList, formatWorkspaceLimit, getContentWorkspaceEntitlements, getContentWorkspaceMonthlyPrice, getContentWorkspaceAnnualPrice, getContentWorkspacePlanCodeEnv, getContentWorkspacePlanCode, contentWorkspacePlanFromPaystackPlanCode, getNextContentWorkspacePlan, isHigherContentWorkspacePlan | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/contentWorkspaceUsage.ts | isContentWorkspaceTrialActive, isComplimentaryAccessActive, canAccessContentWorkspace, getContentWorkspacePlan, canUseContentWorkspaceFeature, getActiveWorkspaceCount, getCollaboratorCount, currentAiCycleStart, getOrCreateContentWorkspaceUsage, getContentWorkspaceUsage, canCreateContentWorkspace, canAddContentWorkspaceCollaborator, reserveContentWorkspaceStorage, finalizeContentWorkspaceStorageReservation, releaseContentWorkspaceStorageReservation, releaseContentWorkspaceStorage, consumeAiGeneration, consumeCalendarAiGeneration, consumeAiRegeneration, cleanupExpiredContentWorkspaceStorageReservations | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/instagram.ts | buildInstagramAuthUrl, exchangeCodeForToken, exchangeForLongLivedToken, listManagedPages, listInstagramGrantedPermissions, getInstagramUsername, listConnectedInstagramAccounts, createMediaContainer, createCarouselContainer, waitForContainerReady, publishContainer, getMediaPermalink | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/instagramPublishing.ts | createInstagramPublisher, publishPostToInstagram, fail, complete:callback, publishPostToInstagram | calendarPost.update | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/instagramScheduler.ts | runScheduledInstagramPublishing | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/lifecycleEmails.ts | processCreator, runLifecycleEmailCheck | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| lib/paymentSync.ts | syncVerifiedPayment | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/actionBoundary.ts | createPublishingActionBoundary | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/batchClaims.ts | claimPublishingBatch, failPublishingDispatchBatch | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/batchScheduler.ts | runPublishingBatchScheduler | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/publishing/budgetedDatabase.ts | createBudgetedPublishingDatabase | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/canonicalContract.ts | publicationKey, legacyProjection, lifecycleAllows | Read, provider, policy or indirect dependency | No direct post creation identified | CANONICAL_INACTIVE | MEDIUM / 3 |
| lib/publishing/canonicalStore.ts | createCanonicalIntentActions, createCanonicalPublishingStore | Read, provider, policy or indirect dependency | No direct post creation identified | CANONICAL_INACTIVE | MEDIUM / 3 |
| lib/publishing/canonicalWorker.ts | createInactiveCanonicalWorker | Read, provider, policy or indirect dependency | No direct post creation identified | CANONICAL_INACTIVE | MEDIUM / 3 |
| lib/publishing/canonicalWorkerStore.ts | canonicalPublicationTarget, createCanonicalWorkerStore | Read, provider, policy or indirect dependency | No direct post creation identified | CANONICAL_INACTIVE | MEDIUM / 3 |
| lib/publishing/capabilityProviders.ts | createCapabilityProviderIntegration | Read, provider, policy or indirect dependency | No direct post creation identified | CANONICAL_INACTIVE | MEDIUM / 3 |
| lib/publishing/coordinatorTransport.ts | createCoordinatorDatabase | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/editGuard.ts | postContentEditError | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/eligibilityPolicy.ts | workspaceEligibility, policyHash, accountAuthorizationHash, publishingContentHash | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/errors.ts |  | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/executionContext.ts | withPublishingExecution, publishingFetch | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/externalAuthorization.ts | createExternalPublicationAuthorization | Read, provider, policy or indirect dependency | No direct post creation identified | CANONICAL_INACTIVE | MEDIUM / 3 |
| lib/publishing/http.ts | providerJson, linkedInHeaders, mediaBytes | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/intentActions.ts | createPublishingIntentActions | Read, provider, policy or indirect dependency | No direct post creation identified | CANONICAL_INACTIVE | MEDIUM / 3 |
| lib/publishing/legacyRecoveryBridge.ts | importLegacyPublishingRecovery | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/publishing/ownership.ts | transitionAllowed, outcomeAllowed, createPublishingOwnership | Read, provider, policy or indirect dependency | No direct post creation identified | CANONICAL_INACTIVE | MEDIUM / 3 |
| lib/publishing/platformIntegration.ts | createPlatformIntegration, publish, withPublishingExecution:callback, execute:callback, complete:callback, reconcile, port.unitOfWork:callback, port.unitOfWork:callback | calendarPost.update | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/publishing/portableRuntime.ts | createPortablePublishingRuntime, tick, consume, anonymous@40, anonymous@46 | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/publishing/providerJournal.ts | createProviderJournal | Read, provider, policy or indirect dependency | No direct post creation identified | CANONICAL_INACTIVE | MEDIUM / 3 |
| lib/publishing/providerSpool.ts | createSyntheticProviderSpool | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/providers.ts | publishFacebook, publishX, publishLinkedIn | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/publishing/reliableAdmission.ts | runReliableAdmission | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/reliableConsumer.ts | drainReliablePublishing | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/publishing/reliableStore.ts | createReliablePublishingStore, readLiveAuthorization, cancelBeforeExternal | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/publishing/reliableWorker.ts | createReliableWorker, execute, reconcileReliableJob | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/publishing/retryPolicy.ts | proposeRetryGeneration | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/runtime.ts | createPublishingRuntime, tick, anonymous@41, runPublishingMinuteLoop | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/publishing/scheduler.ts | runScheduledPublishing, due.map:callback | calendarPost.updateMany | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/publishing/stagingConsumerAdapter.ts | createStagingConsumerAdapter | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/stagingNetlifyAdapter.ts | createStagingNetlifyAdapters | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/state.ts | statusField, publishingStatus, statusWhere, statusUpdate, buildCaption, validatePublishContent | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/transactionDatabase.ts | createPublishingTransactionDatabase | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/transports.ts | publishingEnvelope, createDurablePublishingTransport, createNetlifyPublishingTransport, executePublishingEnvelope | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/publishing/validationAdapters.ts | createPublishingValidationAdapters, workspace, expiry | Read, provider, policy or indirect dependency | No direct post creation identified | CANONICAL_INACTIVE | MEDIUM / 3 |
| lib/publishing/worker.ts | runPublishJob, publish:callback | calendarPost.updateMany, calendarPost.update | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/r2.ts | isAllowedContentType, getPresignedUploadUrl, createMultipartUpload, getPresignedPartUploadUrl, completeMultipartUpload, abortMultipartUpload, publicUrlFor, putTikTokPreparedFile, isTikTokPreparedKey, cleanupTikTokPreparedFiles, buildMediaKey, getObjectSize, deleteObject | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/reporting/adapters/index.ts | getSocialPlatformAdapter | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/reporting/adapters/instagram.ts |  | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/reporting/adapters/tiktok.ts |  | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/reporting/sync.ts | syncConnection, syncConnectedSocialReporting, syncCalendarSocialReporting | socialConnection.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| lib/resend.ts | generateOtpCode, sendOtpEmail, sendReviewNotificationEmail, sendVideoCommentNotificationEmail, sendRevisionReadyEmail, sendPasswordResetEmail, sendProjectInviteEmail, sendCollaboratorAddedEmail, sendTaskAssignedEmail, sendTaskNeedsChangesEmail, sendTaskApprovedEmail, sendNewUploadReadyForReviewEmail, sendWelcomeEmail, sendPortfolioInviteEmail, sendProjectManagementIntroEmail, sendCreativoPromoEmail, sendDeliverReminderEmail, sendManagedProjectInviteEmail, sendWebinarHostApplicationEmail, sendPortfolioPaymentFailedEmail, sendPortfolioOfflineReminderEmail, sendSpotlightSubmissionEmail, sendWebinarRsvpConfirmationEmail, sendWebinarRsvpNotificationEmail, sendAccountRecoveryEmail, sendFreeAccessGrantedEmail, sendDiscountGrantedEmail, sendCalendarInviteEmail, sendCalendarPostReviewedEmail, sendCalendarPostResubmittedEmail, sendCalendarPaymentFailedEmail, sendCalendarTrial2DaysLeftEmail, sendCalendarTrialFollowUpEmail, sendCalendarTrialEndsTodayEmail, sendCalendarTrialEndedEmail, sendPartnerReferralSignupEmail, sendPartnerCommissionEarnedEmail, sendPartnerPayoutPaidEmail, sendPartnerApplicationReceivedEmail, sendPartnerApplicationNotificationEmail, sendPartnerApplicationApprovedEmail, sendPartnerApplicationDeclinedEmail, sendPartnerWelcomeEmail, sendBillingBenefitEmail | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/socialMessaging/tiktok.ts | tikTokMessagingAccess, freshTikTokMessagingConnection, normalizeTikTokMessage, receiveTikTokMessage, sendTikTokMessage, syncTikTokInbox | socialConnection.updateMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| lib/socialMessaging/whatsapp.ts | whatsappConfigured, whatsappMessagingAccess, verifyWhatsAppSignature, whatsappRequest, validateWhatsAppConnection, normalizeWhatsAppMessage, receiveWhatsAppNotification, sendWhatsAppMessage, whatsappAutoReplyHandoff | socialConnection.updateMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| lib/socialMessaging/x.ts | xMessageParticipant, syncXInbox, syncSocialInboxes, xInboxErrorMessage | socialConnection.updateMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| lib/socialReporting.ts | upsertSocialConnection, database.$transaction:callback, markSocialConnectionDisconnected, recordPublishedSocialPost, utcSnapshotDate | socialConnection.updateMany, socialConnection.upsert | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| lib/socialTokens.ts | requireScopes, freshConnection | socialConnection.updateMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| lib/subscriptionUsage.ts | getCreatorUsage | Read, provider, policy or indirect dependency | No direct post creation identified | LEGACY_OR_INDIRECT | MEDIUM / 3 |
| lib/syncContentWorkspaceRenewal.ts | syncContentWorkspaceRenewal | creator.update | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| lib/tiktok.ts | buildTikTokAuthUrl, exchangeCodeForTikTokTokens, refreshTikTokAccessToken, getTikTokDisplayName, queryTikTokCreatorInfo, initTikTokVideoPublish, initTikTokPhotoPublish, checkTikTokPublishStatus, waitForTikTokPublishResult | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/tiktokAuthorization.ts | authorizeTikTokPost | calendarPost.updateMany | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/tiktokConnection.ts | freshTikTokConnection, database.$transaction:callback, reserveTikTokRequest, getTikTokCreator | socialConnection.updateMany, socialCalendar.updateMany | No direct post creation identified | LEGACY_OR_INDIRECT | HIGH / 2 |
| lib/tiktokPublishing.ts | createTikTokPublisher, publishPostToTikTok, fail, complete:callback, publishPostToTikTok | calendarPost.update, calendarPost.updateMany | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| lib/tiktokScheduler.ts | runScheduledTikTokPublishing | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| netlify/functions/publish-post-background.ts | handler | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| netlify/functions/social-publish-cron.ts | schedule:callback | Read, provider, policy or indirect dependency | Yes; inspect function record | LEGACY_OR_INDIRECT | CRITICAL / 1 |
| app/api/payments/initialize/route.ts | POST | project.update, project.update | No direct post creation identified | INDIRECT_MEDIA_CASCADE | HIGH / 2 |
| app/api/projects/[id]/route.ts | slugify, findAvailableSlug, GET, PATCH, DELETE | project.deletedAt, project.deletedAt, project.update, project.deletedAt, project.update | No direct post creation identified | INDIRECT_MEDIA_CASCADE | HIGH / 2 |
| app/api/projects/[id]/invites/route.ts | generateInviteToken, GET, POST | project.deletedAt, project.deletedAt | No direct post creation identified | INDIRECT_MEDIA_CASCADE | HIGH / 2 |
| app/api/projects/[id]/invites/[inviteId]/route.ts | DELETE | project.deletedAt | No direct post creation identified | INDIRECT_MEDIA_CASCADE | HIGH / 2 |
| app/api/projects/[id]/collaborators/[collaboratorId]/route.ts | DELETE | project.deletedAt | No direct post creation identified | INDIRECT_MEDIA_CASCADE | HIGH / 2 |
