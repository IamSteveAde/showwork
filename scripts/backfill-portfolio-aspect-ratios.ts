import "dotenv/config";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Matches the app's own publicUrlFor() logic — duplicated here rather
// than imported, since this script runs standalone via tsx, outside
// the Next.js module graph.
function publicUrlFor(fileKey: string): string {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) throw new Error("R2_PUBLIC_URL is not set in .env");
  return `${base.replace(/\/$/, "")}/${fileKey}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BATCH_SIZE = 10;
const PAUSE_BETWEEN_BATCHES_MS = 500;

// Usage:
//   npx tsx scripts/backfill-portfolio-aspect-ratios.ts
//   npx tsx scripts/backfill-portfolio-aspect-ratios.ts --apply
//
// Dry run by default — shows what it would update without touching
// anything. Only photos are handled here; videos need ffprobe-style
// tooling this project doesn't currently have, and are deliberately
// left for the gallery's own per-item fallback detection instead.
async function main() {
  const applyChanges = process.argv.includes("--apply");

  const photos = await db.portfolioMedia.findMany({
    where: { type: "PHOTO", aspectRatio: null },
    select: { id: true, fileKey: true },
  });

  if (photos.length === 0) {
    console.log("No photos missing an aspect ratio — nothing to do.");
    return;
  }

  console.log(`Found ${photos.length} photo(s) missing an aspect ratio.\n`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    const batch = photos.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (photo) => {
        try {
          const res = await fetch(publicUrlFor(photo.fileKey));
          if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
          const buffer = Buffer.from(await res.arrayBuffer());
          const metadata = await sharp(buffer).metadata();

          if (!metadata.width || !metadata.height) {
            throw new Error("Could not read dimensions");
          }
          const aspectRatio = metadata.width / metadata.height;

          console.log(`  ${photo.fileKey} → ${aspectRatio.toFixed(3)}`);

          if (applyChanges) {
            await db.portfolioMedia.update({
              where: { id: photo.id },
              data: { aspectRatio },
            });
          }
          updated++;
        } catch (err) {
          console.log(`  FAILED: ${photo.fileKey} — ${err instanceof Error ? err.message : "unknown error"}`);
          failed++;
        }
      })
    );

    if (i + BATCH_SIZE < photos.length) {
      await sleep(PAUSE_BETWEEN_BATCHES_MS);
    }
  }

  console.log(`\n${applyChanges ? "Updated" : "Would update"} ${updated}, failed ${failed}.`);
  if (!applyChanges) {
    console.log("Dry run only — re-run with --apply to actually save these values.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());