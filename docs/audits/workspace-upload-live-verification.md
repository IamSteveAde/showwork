# Marketing Workspace: live upload verification

Verified on 28 October 2026 using the local development app at `localhost:3000`, its configured live database and R2 storage, and a separate Chrome test profile. The user signed in normally. A temporary workspace was created with auto-publishing disabled and one unapproved synthetic Instagram carousel. Existing client workspaces were not edited.

**Result: the new queue/completion reliability checks passed against real storage and database records. Upload speed still needs server-side optimization.**

## Test files

Three synthetic 1200 × 800 JPEGs (684,510, 684,028 and 683,878 bytes) and an eight-second 640 × 360 MP4 (2,155,049 bytes). The initial batch totalled **4,207,465 bytes**, approximately 4.21 MB. Additional copies of these files were used for retry, cancellation and concurrency checks.

No customer documents, private media or real social publishing were used. No document ingestion or paid AI generation test was initiated. Opening the content editor automatically attempted its existing missing-brief request; it returned the stale-post 409 before the AI call. Subsequent AI POST requests were blocked in the test browser. Credentials and signed storage URLs are excluded from this report.

## Live results

| Check | Observed result |
| --- | --- |
| Four-file batch through the editor | Four distinct assets saved; all requests returned 200. Internal and client approval remained pending; publishing remained not scheduled. |
| Save response lost after commit | First request really committed with HTTP 200, then its response was deliberately dropped. Manual Retry returned the same saved file. Exactly one preparation, one storage transfer and two completion requests; asset count increased by one and consumed storage increased by exactly 684,510 bytes. |
| Transfer failure recovery | The first PUT was aborted in the browser before reaching storage. The existing automatic retry succeeded on the second PUT using the same receipt. This was a simulated failure, not a measured physical-network outage or multipart resume. |
| Simultaneous completion | Two actual concurrent authenticated completion requests, using different operation IDs for the same receipt, both returned 200 and the same asset ID. Exactly one asset and 683,878 consumed bytes were added. |
| Active-transfer cancellation | An in-flight PUT was held before forwarding its bytes. Cancel returned 200; its receipt became RELEASED; no completion request or asset was created. Consumed bytes and pre-existing reserved bytes remained unchanged. |
| Image display | All rendered image previews loaded successfully. |
| Video display | The saved MP4 opened with duration 8 seconds, dimensions 640 × 360 and no media error. Opening the already-uploaded video reached a ready frame in approximately 784 ms; this is not a cold-thumbnail benchmark. |
| Responsive panel | At widths 1440, 390 and 320 pixels, the upload panel stayed entirely inside the viewport. Document width equalled viewport width in each check. |

The tests used browser interception only to introduce the explicitly described failures and concurrent calls. Successful storage transfers, completion transactions, saved records and accounting checks used real services.

## Speed measurements

Initial batch elapsed time was **77.33 seconds**, from its first preparation request to its last completion response, excluding workspace/post creation.

| Stage | Per-file observed range | Median |
| --- | --- | --- |
| Prepare upload | 17.96–21.82 seconds | 19.30 seconds |
| Direct storage PUT | 0.58–3.30 seconds | 1.48 seconds |
| Save/finalize | 12.15–15.48 seconds | 13.75 seconds |

For additional context, three warm read-only requests each produced:

- Publishing settings: 4.98, 2.51 and 2.57 seconds.
- Posts: 3.06, 3.16 and 3.20 seconds.

**The measured bottleneck is the preparation/finalization path, rather than transferring these small file bodies.** Same-post finalizations are serialized for correctness, so repeated slow server calls dominate a multi-file batch. These measurements include local development overhead and network access to remote services. SQL statements, entitlement checks, connection-pool waits and compilation were not individually timed; attributing all delay specifically to the database would be premature. This is a single small-file local run, not a production benchmark or a large-video throughput test.

Recommended next optimization: instrument server stages, remove repeated authorization/entitlement/owner lookups within each request while preserving enforcement, and consider safe batch preparation/finalization to reduce repeated network/database round trips. Preserve reservation idempotency, expiry, post/review locks and storage integrity verification. Resumable large-video uploads remain useful, but would not address most of this measured small-file delay.

## Cleanup and additional finding

All six completed test assets represented **5,575,853 consumed bytes**. The seventh receipt was the cancelled upload.

Cleanup verified the exact temporary workspace/post/name bindings, synthetic filenames, unapproved/not-scheduled status, absence of documents/banners, absence of foreign asset references and absence of publishing intents/jobs/origin records. All seven test object keys were removed if present and confirmed absent with R2 HEAD requests. A scoped database transaction then removed the temporary workspace and returned exactly its consumed bytes. Re-running cleanup cannot credit the same removed workspace twice.

Verified after cleanup:

- Temporary workspace no longer exists.
- All seven test object keys are absent.
- Used storage returned exactly to its calculated pre-test value.
- Pre-existing reserved storage was unchanged.
- No production migration, deployment or VPS change was performed.

**Additional product issue:** the ordinary legacy whole-workspace DELETE handler deletes objects/workspace rows but does not release the owner's consumed storage counter. The verification used a separate narrowly scoped cleanup transaction rather than leaving this test footprint counted. The ordinary deletion path still needs a retention-aware, shared-reference-safe accounting fix; this report does not claim that fix has been implemented.

## Not verified live

Business-document extraction/knowledge rebuilds, banner replacement, large-video upload, page-refresh resume, real mobile-network interruption, expiry cron scheduling, deployed production performance and canonical publishing deployment. These findings apply to the local application paths exercised above.

## Subsequent implementation

The deletion/accounting issue above has since been addressed in local code with a prepared migration and durable cleanup queue. See [workspace deletion and storage release](workspace-deletion-storage-release.md). It has not been migrated or deployed, and is not included in the live results recorded above.
