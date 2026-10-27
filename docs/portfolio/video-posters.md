# Saved portfolio video posters

## Behaviour

New single-part and multipart gallery video uploads capture a frame from the local file (up to one second into the video), fit it within 960 × 960, and send a JPEG to an authenticated endpoint after the original has been saved. The endpoint verifies ownership, video type and the image bytes, re-encodes and strips metadata, uploads a separate JPEG to R2, and saves `PortfolioMedia.posterFileKey`. Upload payloads are capped at 1 MB, decoded images at 16 million pixels. Capture and upload have timeouts.

Gallery tiles, section covers, media-based hero banners, dashboard tiles and opened video players receive the saved poster URL. Posters display before playback and eliminate speculative video metadata downloads for those previews. Only the selected visible autoplay video starts playback. Legacy videos without posters retain metadata fallback. Photos and original video URLs are unchanged.

Browser codec support varies; unsupported local videos may fail preview capture. That does not fail or repeat the original upload. The uploader reports that preview creation was incomplete. The backfill can handle supported server-side codecs later. Posters are generated once; repeated endpoint calls retain the current poster. No manual poster replacement UI is introduced.

Dedicated desktop/mobile banners uploaded separately in Portfolio Details do not create PortfolioMedia records; this gallery backfill does not process those standalone files. They retain the previous near-viewport video loading behaviour. This is separate from a gallery video chosen as the hero, which does receive its poster.

## Release requirements

1. Review pending Prisma migrations in the target environment. The additive migration `20261027120000_portfolio_video_posters` adds nullable `PortfolioMedia.posterFileKey`. Apply approved migrations before serving code using the new column. No production migration was run by this implementation.
2. Regenerate Prisma client and rebuild/redeploy the website. There are no new environment variable names. Existing R2 upload credentials and `R2_PUBLIC_URL` are used. No AI worker or VPS update is required for new browser-generated posters.
3. Verify one supported video upload, reload the editor/public page, and check that the JPEG poster renders before playback. Test short clips and mobile Safari/Chrome. Check that failure leaves the original playable.
4. Backfill existing videos only after reviewing and authorizing the selected portfolio. It performs storage and database writes only with `--apply`.

## Backfill for the developer

Dry run (database reads only; no original download or storage writes):

```sh
node scripts/backfill-portfolio-video-posters.cjs --portfolio-id PORTFOLIO_ID --limit 20
```

Apply to that portfolio after approval:

```sh
node scripts/backfill-portfolio-video-posters.cjs --portfolio-id PORTFOLIO_ID --limit 20 --apply
```

The script runs serially, skips existing posters, limits each run to at most 100 records, bounds original downloads to 100 MB/45 seconds and local extraction to 30 seconds, and removes temporary files. Larger originals are left unchanged for a separate controlled processing job. The first frame is used by the backfill (new browser captures use a later frame to reduce title-card/black-frame risk); a suitable visible frame is not guaranteed for every video. Failed records are reported by ID, with no credential or signed-URL output. Defaults load `.env`; use the developer's existing secret-management process. Do not paste credentials into terminal commands or reports.

No backfill was run against any real portfolio. Automated validation includes a synthetic local MP4 and real JPEG decoding, plus route authentication/ownership, invalid payloads, idempotency, public mapping and viewport loading tests. Real-browser performance testing remains necessary.
