# Facebook reporting permission diagnosis

Verified against the connected Page on 6 October 2026, using read-only database and Meta Graph API calls. No tokens, app secrets, captions, reporting snapshots, or Page posts were written by the diagnosis.

## Confirmed cause

The Facebook adapter requested basic Page posts and optional engagement expansions in one `/PAGE_ID/posts` call. Meta rejects this connection's likes expansion and requires the additional, ungranted `pages_read_user_content` permission for comments. Either rejected expansion fails the entire compound request. The adapter translated Graph errors 10/200 into a generic instruction to reconnect, hiding which operation actually failed.

This is a confirmed Showwork request-composition/error-diagnostic bug plus genuine Meta field-level restrictions. It is not a missing `pages_read_engagement` value in the saved connection, a missing `read_insights` value, or a User token mistakenly stored as the Page token. The reason for Meta's likes denial despite the granted engagement scope cannot be determined from the grant list alone; verify the relevant app access level and test-user/app-role configuration in Meta. No access level has been changed or bypassed by this fix.

## Selected connection and permissions

- Page: Thestephenadediran
- Page ID: 108238759045067
- Graph API version: v26.0
- Stored status: CONNECTED
- Meta token debugger: valid PAGE token; configured app matches; Page profile matches; granular `pages_read_engagement` target list includes this Page.
- Stored grant metadata and current Page-token debugger scopes match.

OAuth requests `pages_show_list,pages_read_engagement,pages_manage_posts,read_insights,pages_messaging,pages_manage_metadata`.

The saved/debugged grant list is `read_insights,pages_show_list,business_management,pages_messaging,instagram_basic,instagram_manage_insights,instagram_content_publish,instagram_manage_messages,pages_read_engagement,pages_manage_metadata,pages_manage_posts,public_profile`.

`/me/permissions` runs with the long-lived User token and records only permissions whose status is `granted`. It may include grants previously authorized for the same app, explaining permissions beyond this particular OAuth request. The Page token comes from `/me/accounts` and is saved only after the user selects a Page from authenticated, encrypted HTTP-only selection state. Grant metadata is stored in `SocialConnection.tokenScopes`; the actual stored access token is a Page token. Current live token inspection confirms that these grants also exist on this Page token.

Refresh permissions starts the same OAuth flow with `auth_type=rerequest`. The callback retrieves fresh grants, then requires Page selection. Completing selection upserts the token and scope list, resets the connection status to CONNECTED and clears its sync error. Merely returning to the picker does not save a new selection. `connectedAt` is the initial connection timestamp, not a reliable last-reauthorization timestamp.

## Calls, gates and live evidence

| Operation | Showwork gate / Meta evidence for this token | Result |
| --- | --- | --- |
| User `/me/accounts` | OAuth `pages_show_list`; returns Page choices and Page tokens | Working selection flow |
| User `/me/permissions` | Actual granted-permission metadata, not OAuth token response's optional `scope` field | Persisted grants |
| Page `/{id}?fields=id,name` | Mandatory local `pages_read_engagement` check; actual Page token | HTTP 200, correct Page identity |
| Page `/{id}?fields=followers_count` | Page read access | HTTP 200, 15 followers |
| Page `/{id}/posts` with ID/message/date/permalink/picture | Mandatory local `pages_read_engagement`; actual Page token | HTTP 200, real Page content |
| Page posts with likes summary | Meta cites `pages_read_engagement` or PPCA, despite this token carrying the grant | Error 10, still restricted |
| Page posts with comments summary | Meta explicitly requires `pages_read_user_content` or PPCA; permission absent from OAuth/stored grants | Error 10 |
| Page posts with shares field | Optional Page-owned engagement value | HTTP 200; absent values remain unknown |
| Page `/{id}/insights?metric=page_media_view&period=day` | Local optional Insights gate uses `read_insights`, in addition to mandatory Page engagement check | HTTP 200, a metric row returned |
| Post `/{post-id}/insights` | Optional `read_insights` gate, with actual Page/token authorization enforced by Meta | Real reach/view values returned for tested posts |

`pages_show_list` is used for Page enumeration, not as a substitute for Page-content permission. `business_management` is not required by Showwork's Facebook reporting adapter and is not a substitute for the reporting permissions. The adapter's standalone post-metric path also reads `/POST_ID/likes`, `/POST_ID/comments`, and the `shares` field; comments are now requested only when their actual scope is granted. These are optional metrics, and Graph denials never become invented zeros.

This matrix records the implementation gates and observed provider responses. It is not an exhaustive public-production permissions guarantee. Meta's public documentation pages returned 429/unavailable during this investigation; the selected-Page conclusions were verified with actual Meta API responses rather than third-party guidance. Official references: [permissions](https://developers.facebook.com/docs/permissions/), [Page Insights](https://developers.facebook.com/docs/graph-api/reference/page/insights/), [access levels](https://developers.facebook.com/docs/graph-api/overview/access-levels/).

## Safe change

Only `lib/reporting/adapters/facebook.ts` changes integration behavior:

1. Fetch required Page-owned post fields independently.
2. Fetch optional likes, shares and authorized comments in separate bounded Page-edge requests, using the same date window/limit and merging strictly by post ID.
3. Do not request comments without `pages_read_user_content`.
4. Keep denied/missing values null and expose field-specific notices.
5. Preserve redacted provider message, endpoint, code/subcode and trace ID for required access failures.
6. Apply the same separation to account-sync native posts, so a restricted count cannot discard the native feed.

OAuth requests, signed state, Page picker, token storage, ownership checks, and the mandatory `pages_read_engagement` guard are unchanged. There is no database migration for this fix. No new scope or public-content feature is requested or presumed granted. Public access still requires the relevant Meta review/access level.

## Review reproduction

The latest native post is dated 9 August 2026. A recent 30-day window at the time of diagnosis returned no posts legitimately.

Use 11 July–10 August 2026, the validated window, to show:

Meta Login → grant actual scopes → retrieve Page choices → explicitly select Thestephenadediran / 108238759045067 → open Facebook reporting → show the exact Page identity, 15 followers and three real posts.

The latest post's verified values included reach 269 and media views 283; two other posts returned reach/media-view pairs 17/32 and 11/26. These are provider-returned lifetime post values, not fabricated date-range totals. Likes/comments/shares unavailable in the tested response remain null. Permission notices describe these specific optional metrics rather than blocking Page content.

Validation: seven focused regression tests cover missing mandatory permissions, optional denial, ID-based count matching, authorized zero counts, real core failures and redaction, expired tokens, native-feed import and empty periods. The full repository suite passed 305 tests; TypeScript validation passed. Live validation invoked the repaired adapter against Meta without storing snapshots or changing the connection.

## Follow-up: authorized like Insights and localhost overview sync

A later read-only check confirmed that `/{post-id}/insights?metric=post_reactions_like_total&period=lifetime` succeeds with the existing Page token and its granted `read_insights` permission. The latest post returned 4 Like reactions; the two other August posts returned genuine zero values. This specific Like metric is not a substitute using total reactions or guessed engagement. The public likes edge remains restricted; the authorized aggregate Insights endpoint is a different, legitimate reporting permission path.

The adapter now prefers this metric only when `read_insights` is actually present, falls back to the ordinary likes field for unavailable values, and retains null/diagnostics when neither is authorized. Requests are batched two at a time and capped at 20 Like Insights per native-feed fetch; the live activity panel remains capped at five posts. Comments are still not requested without `pages_read_user_content`.

The selected connection had zero saved account snapshots and had never synced. Local configuration has no Netlify dispatch URL, so the existing sync endpoint could not enqueue a worker. The endpoint now uses Next's `after` background hook in development only. Its session, EDIT_CALENDAR permission, workspace-access and connected-account checks all run first. Production keeps the existing Netlify dispatcher and returns a real 503 if dispatch fails. The reporting header now exposes **Sync data** alongside the read-only Refresh action.

A second local heuristic also blocked every Page Insights call when `fan_count < 100`. This Page has 15 Page likes, but Meta returned actual Page Insights data. The threshold is removed; the existing engagement/Insights scope checks remain, and Meta authorizes each requested metric. Live account-read results were followers 15, latest available daily reach 0, video views 0 and engagements 0, plus five native posts. These are provider-returned observations, not invented historical totals.

After restarting/reloading the app, use **Sync data**, wait for the background work, then **Refresh**. A range including the current sync date shows newly collected overview observations; it does not backfill an entire year's history. The screenshot's January–October 2026 window includes both the current observation date and the August posts. August-only filtering can show the live post panel while legitimately excluding an October account snapshot from overview comparisons.

## Follow-up: dashboard cards must consume live reporting data

The live Page panel was enriched after the database reads, but `compareAccounts` still consumed the original unenriched connection posts and only stored snapshots. This left the overview blank even while the lower Page panel showed genuine data. The report now passes enriched posts into comparison, preserving earlier saved records by post ID, and supplies clearly labeled live Facebook values when a single connected Facebook account has no appropriate saved observation.

Facebook live activity now includes the latest allowed Page Insights values. Current follower count is explicitly current rather than a manufactured historical snapshot. Live daily values are used only when the selected range includes their observation time; existing recorded daily totals take precedence. Historical ranges do not receive today's daily values. Unavailable previous observations still produce null deltas/percentages.

The overview also exposes post likes and lifetime media views for available Facebook posts. Media views are not renamed video views, and summed post reach is labeled as such rather than claimed to be unique daily Page reach. Disconnected accounts are excluded from the Facebook media-view total and the Updated timestamp. No snapshots are manufactured or stored by GET reporting.

Verified through the actual full report data function, using the real database and Meta reads for January–October 2026: followers 15; latest available daily reach/video views/engagements 0; post likes 4; lifetime media views 398 across five live Facebook posts; no saved account snapshots. This is sufficient for the cards to render genuine current/available data immediately. Sync remains necessary to collect historical observations and comparison baselines.
