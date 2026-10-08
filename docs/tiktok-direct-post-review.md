# TikTok Direct Post release and review

The publishing screen is `components/calendars/TikTokPublishing.tsx`. The server
validates the same settings in `lib/tiktokAuthorization.ts` and again in the
worker. Client approval alone does not schedule TikTok content. Approved posts
still permit review of TikTok settings and explicit authorization, while caption
and media edits continue to require a client revision.

## Release steps

1. Run `npm ci` and `npx prisma generate` in the release environment.
2. Apply `npx prisma migrate deploy` to the intended release database before
   deploying this revision. Do not run it against an unintended database.
   Migration `20261008160000_tiktok_direct_post_compliance` adds post settings,
   consent evidence and account-wide API pacing. Historical scheduled TikTok
   posts become unscheduled; users must review and authorize them again.
3. Deploy Next.js and Netlify functions together. `ffprobe-static` and
   `ffmpeg-static` must be packaged for media checks and conversion: Next output tracing and the two function-specific
   `netlify.toml` sections include only the runtime binaries for the Next server
   and publishing worker. Do not add ffprobe to global function includes or
   external packages: that duplicates large binaries into unrelated functions.
   Verify executable permissions in the deployed function.
4. Confirm the publishing OAuth redirect is exactly
   `/api/calendars/tiktok/callback`, the app has Direct Post enabled, and users
   grant `video.publish`. Set server-only app credentials, JWT_SECRET and
   CRON_SECRET using the existing deployment secret store. Never include secret
   values in recordings or screenshots.
5. Verify the actual R2 public media domain or URL prefix in TikTok's app portal.
   URLs must be HTTPS, publicly readable, have no redirects and remain available
   during TikTok's processing. Application code cannot perform portal verification.
6. Verify the minute-based cron and protected background worker are deployed.
   Publish now dispatches the authorized post immediately; scheduling dispatches
   at the calendar time. Long-running provider processing is reconciled by cron
   without another initialization. A definite provider failure requires corrected
   content/new post; an ambiguous submission without a provider ID requires
   checking TikTok before explicitly authorizing retry.
7. Run staging checks below, using controlled accounts and separately authorized
   test publishing. No live publishing is performed by the local unit tests.

## Staging verification

- Connect an account, cancel OAuth, try an altered state and verify no connection
  is attached. Confirm partial scope grants cannot enable publishing.
- Use public/private accounts. Open the final screen and compare nickname,
  username and dropdown options with the creator response. Refresh settings.
- Verify a new post has no privacy selection, interactions start unchecked and
  unavailable interactions are greyed out. Photos show comments only.
- Toggle Content Disclosure off/on; select Your Brand, Branded Content and both;
  check Promotional content / Paid partnership explanations.
- With disclosure on and no classification, verify publishing is disabled.
  Exercise Only me before Branded Content and Branded Content before Only me.
- Check the music declaration and branded-content policy link conditional on
  third-party disclosure. Attempt a crafted request without consent, with a
  stale account or prohibited interactions; all must fail before initialization.
- Review actual video/photo preview and exact composed caption. Change editable
  caption fields before client approval. Confirm the photo title is editable.
- Client approval must not schedule TikTok by itself. Then authorize scheduling,
  reload and verify settings. Cancel scheduling and verify new consent is needed.
- Request a revision, edit content and reapprove. Verify the old authorization
  cannot publish the revision. Reconnect a different account and verify the old
  scheduled authorization cannot target it.
- Verify valid and invalid media: JPEG/WebP; MP4/MOV/WebM; video duration maximum,
  codecs, 23–60 FPS, dimensions, photo 1080p/20 MB, video 4 GB. File bytes are
  inspected by ffprobe rather than trusting browser metadata.
- Authorize Publish now. Observe provider processing, completion and the resulting
  permitted TikTok post. Verify an extended processing fixture keeps polling and
  never initializes a duplicate. Test token expiry and concurrent posts.

## Recording script

1. Show the customer calendar and connect TikTok through the real Login Kit flow.
2. Show the connected account; create original content and select TikTok.
3. Preview the uploaded video and edit caption/mentions/hashtags before approval.
4. Open Post to TikTok; show the live nickname and username and open the privacy
   dropdown. Choose an available option explicitly.
5. Toggle each allowed interaction. Show restricted interactions on a suitable
   controlled account. Repeat with a photo to show comments-only settings.
6. Enable Content Disclosure with no classification to show blocked submission.
7. Select Your Brand, then Branded Content, then both; show each label explanation.
8. Demonstrate the private/branded conflict in both selection orders. Turn
   disclosure off and show the noncommercial state.
9. Approve the content as a client and show it remains unscheduled.
10. Review the final account, media, caption, settings and applicable declaration.
    Open the music/policy links and explicitly accept the declaration.
11. Authorize a permitted test post, show processing and completion, then show the
    resulting post in TikTok. Demonstrate scheduling/cancellation separately.
12. Include revisions/account replacement if shown in the submitted workflow.

Unaudited apps are restricted by TikTok to private accounts and SELF_ONLY.
Demonstrate branded validation without pretending a private branded post is
valid. Use only TikTok-permitted review arrangements for actual branded posting.
Public unrestricted publishing and a successful review cannot be guaranteed by
local code changes. Record the deployed revision and accurately state any current
app restrictions.

## Official references

- https://developers.tiktok.com/doc/content-sharing-guidelines
- https://developers.tiktok.com/doc/content-posting-api-reference-query-creator-info
- https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- https://developers.tiktok.com/doc/content-posting-api-reference-photo-post
- https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide
- https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status

## Input formats and automatic preparation

Uploads are not limited to TikTok's output extensions. PNG, JPEG, WebP, AVIF,
TIFF, GIF, SVG and decodable HEIC/HEIF files are converted into JPEG photos. Additional image decoders use
FFmpeg where available. Photos retain aspect ratio, are resized to fit 1080p,
use white for transparency and the first frame for animated inputs. Proprietary
camera/editor formats that neither decoder can read require an exported copy;
a file extension alone cannot make arbitrary or corrupt bytes publishable.

Video source validation accepts the decodable video containers supported by the
conversion pipeline, including AVI, MKV, WMV/ASF, FLV, MPEG, Ogg, 3GP/MOV/MP4,
MXF and WebM. Compatible videos can pass through. Others are transcoded by the
background worker to H.264/AAC MP4 without trimming. Resizing/padding and frame
rate normalization are disclosed beside the publishing consent. Creator duration
and platform size limits still apply. Very large or complex conversions may need
a smaller exported copy to fit the worker's time/temporary-disk limits.

Original assets are never replaced. Worker-only prepared copies use generated
`tiktok-prepared-<UUID>.jpg/.mp4` names in the same source folder, preserving
existing verified URL prefixes. The daily storage cleanup removes copies older
than seven days; its R2 credential needs list/delete access. Only generated names
are eligible; original assets are excluded. The updated consent version requires
previously authorized posts to be reviewed and authorized again. This change
adds no database migration.
