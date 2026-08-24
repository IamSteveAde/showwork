// A plain `tsx script.ts` invocation doesn't automatically load .env
// the way `next dev` does — without this, DATABASE_URL is empty and
// Prisma has no real address to connect to at all.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Maps every old category name to its closest new equivalent.
// "Editing" is the one genuine judgment call here — the original set
// (Photography/Videography/Motion/Editing) was all video-production
// roles, so "Editing" most likely meant video editing specifically.
// If that's wrong for your data, change this line before running.
const RENAME_MAP: Record<string, string> = {
  Videography: "Video/Motion",
  Motion: "Video/Motion",
  Editing: "Video/Motion", // judgment call — see comment above
  // "Photography" is unchanged — already a valid new category.
};

async function main() {
  const applyChanges = process.argv.includes("--apply");

  const entries = await db.creativoLeaderboardEntry.findMany({
    where: { category: { in: Object.keys(RENAME_MAP) } },
    select: { id: true, name: true, category: true, periodDate: true },
  });

  if (entries.length === 0) {
    console.log("No leaderboard entries found with an old category name — nothing to migrate.");
    return;
  }

  console.log(`Found ${entries.length} entr${entries.length === 1 ? "y" : "ies"} with an old category name:\n`);
  for (const e of entries) {
    const newCategory = RENAME_MAP[e.category];
    console.log(`  ${e.name} (${e.periodDate.toISOString().slice(0, 7)}): "${e.category}" → "${newCategory}"`);
  }

  if (!applyChanges) {
    console.log("\nDry run only — nothing was changed. Re-run with --apply to actually update these rows.");
    return;
  }

  for (const e of entries) {
    await db.creativoLeaderboardEntry.update({
      where: { id: e.id },
      data: { category: RENAME_MAP[e.category] },
    });
  }

  console.log(`\nDone — updated ${entries.length} entr${entries.length === 1 ? "y" : "ies"}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());