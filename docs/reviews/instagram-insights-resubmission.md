# Instagram Insights resubmission preparation

Status: draft, pending deployment and successful live verification. Do not submit as evidence of a completed test.

## What the rejection establishes

Meta's notice supplied by the owner says the use case is allowed, but the screencast does not demonstrate the complete workflow described in the submission. It does not establish that the permission is absent from a token, nor that Showwork needs new analytics features. The consent-screen summary alone is not grant evidence.

## Implementation comparison

| Capability | Repository evidence | Remaining evidence |
| --- | --- | --- |
| Facebook Login for a linked professional Instagram account | Existing integration; Meta's official collection confirms this account/Page model | Successful hosted authorization |
| Request instagram_manage_insights | Conditional global flag; new authenticated-reviewer allowlist | Correct hosted environment settings and actual outgoing request |
| Capture actual grant | Callback calls /me/permissions and stores granted scopes | Fresh authorization; stored historical grant is not current token proof |
| Select Page and Instagram account | Explicit legacy picker implemented; canonical picker already exists | Browser walkthrough on deployed build |
| Account insights | Real /{ig-account-id}/insights calls | Successful authorized API response and dashboard rendering |
| Media insights | Real /{media-id}/insights calls including saved/shares where supported | Actual supported media metrics and dashboard rendering |
| Permission/error handling | Reauthorization and non-silent API errors implemented locally | Deployed end-to-end test |
| Reviewer access | Creator allowlist supports restricted testing | Include the dedicated Showwork login supplied in submission instructions, if different from the owner's login; do not enable every ordinary user before approval |

No evidence currently establishes that demographics, ads analytics, additional charts, or additional unrelated permissions are necessary to resolve this specific rejection. Do not add them solely to seek approval.

## Hosted verification instead of localhost

Use the existing hosted Showwork environment and its already-configured callback. Do not redirect a local authorization to a different host: session and state cookies must belong to the application handling the callback.

1. Deploy the reviewed fixes to the intended hosted environment, following the project's normal release process. These fixes have not been deployed by this task.
2. Configure INSTAGRAM_INSIGHTS_REVIEW_CREATOR_IDS for the confirmed app-role testing login. The local .env value does not configure Vercel. Keep INSTAGRAM_REQUEST_INSIGHTS_SCOPE=false while restricting testing.
3. Verify NEXT_PUBLIC_APP_URL and the callback use the same hosted domain that already works with Meta. Production configuration and Meta settings have not been independently inspected.
4. Reauthorize @useshowworkofficial through the hosted application.
5. Validate token/app match and permission, then actual account and media Insights responses. Run the credential-safe audit script against the same deployment database/configuration.
6. Sync Analytics & Reporting and verify the corresponding account and posts render real values. Show missing metrics as unavailable, not zero. Match explanations to rolling totals or lifetime counters as labelled.
7. Ensure the dedicated Showwork review login can reach this same flow. Supply necessary app test credentials only through Meta's submission interface, never a personal Facebook password or access token in a recording.

## Proposed use-case description

Use after verifying that the deployed workflow matches this description:

“Showwork uses instagram_manage_insights to let workspace users view performance analytics for the Instagram professional account they authorize. After Facebook Login, the user selects the Facebook Page and linked Instagram account. In Analytics & Reporting, the user syncs and views account reach and supported post-level insights, including reach, saves and shares. These results help the user evaluate their own content's performance. Showwork retrieves these metrics from Meta's Instagram Graph API. Missing or unsupported metrics are shown as unavailable.”

Do not claim follower demographics, real-time updates, exact metric coverage, successful verification or data-handling guarantees not demonstrated by the deployed application.

## Recommended recording sequence for this rejection

- Showwork login and navigation to workspace Channels.
- Connect/Reauthorize Instagram; complete Meta authorization and relevant Page/account selection.
- Return to Showwork and identify the selected account. Show the actual grant status where available; do not edit UI to pretend Meta granted access.
- Open Analytics & Reporting, select Instagram and date range, sync data and show the resulting status.
- Demonstrate actual account-level analytics, then a specific post and its available Insights metrics. Explain the user's benefit.
- Match the submission's numbered navigation instructions and use-case wording to the recorded build. Add readable captions identifying each step. Avoid recording credentials, raw request headers, tokens or unrelated customer conversations.

This is a recommended response to the supplied rejection, not a guarantee of approval or a claim that every item is a current universal Meta requirement.

## Research provenance and limitations

Meta's official Instagram Facebook Login collection confirms that this API serves Business/Creator accounts and requires a linked Facebook Page:
https://www.postman.com/meta/instagram/folder/u4g5a2a/instagram-api-with-facebook-login

The following official pages were attempted on 21 October 2026 but were inaccessible to the browsing tool (including HTTP 429 for the recording guide):
- https://developers.facebook.com/docs/permissions/instagram_manage_insights/
- https://developers.facebook.com/docs/app-review/submission-guide/screen-recordings/
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/insights/

Therefore this document does not claim a complete independently verified current Meta approval checklist. The specific recording gap is grounded in Meta's rejection provided by the owner; the implementation findings are grounded in the repository and the prior read-only database audit. No third-party approval-service claim is treated as an authoritative technical requirement.
