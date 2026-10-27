# Portfolio media loading

## Confirmed code bottlenecks

- Public gallery and section covers used original images without responsive derivatives.
- Autoplay previews had no saved poster and used `preload="none"`. Only the active video was asked to play, leaving other visible tiles dependent on a later playback request.
- Every legacy item missing an aspect ratio launched a detached original-image or video-metadata request, including offscreen media.

## Changes

- Gallery images and section covers use Next Image responsive derivatives. Full-screen images still use the original for detailed viewing. Originals and upload keys are unchanged.
- Next Image accepts the configured `R2_PUBLIC_URL` hostname/path in addition to existing R2 patterns. Restart local Next after config changes; rebuild on deployment with the media URL configured.
- Video previews attach sources and fetch metadata within 300px of the viewport. Hidden/offscreen previews do not start source downloads on mount. Existing one-active-video policy is preserved. Opened video players retain an immediate source.
- Gallery video components mount near the viewport rather than after scrolling well into it.
- Missing dimensions are learned from the displayed image/video load events instead of detached downloads. Stored upload dimensions remain authoritative.

## Remaining work

Saved gallery-video posters are now implemented; see [video-posters.md](video-posters.md) for migration, upload and controlled backfill details. Until a video has a saved poster, metadata preload remains a best-effort fallback: browser behaviour and video container layout vary. A video with metadata at the end may require substantial range requests. Transcoding/fast-start MP4 or adaptive streaming should be considered for large originals.

No storage migration, production writes, deployment or thumbnail backfill was performed. Do not claim a measured speed improvement until comparing cold-load timings on representative mobile connections. Check image optimizer responses, image transfer sizes, video range responses and first visible preview times. Optimized-image cold requests still involve fetching the original once; subsequent derivatives can be cached.

## Validation

14 tests pass across media-loading behaviour, portfolio compatibility and subdomain routing. Source type checking is run separately from generated Next dev types because the running dev server can remove those generated files during a check. Browser/network performance measurements remain outstanding.
