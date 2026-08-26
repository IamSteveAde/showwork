import "dotenv/config";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Usage:
//   npx tsx scripts/recreate-accounts-from-list.ts emails.txt
//   npx tsx scripts/recreate-accounts-from-list.ts emails.txt --apply
//
// emails.txt: one email per line. Blank lines and lines starting with
// # are ignored, so you can paste a list with notes/comments in it.
async function main() {
  const filePath = process.argv[2];
  const applyChanges = process.argv.includes("--apply");

  if (!filePath) {
    console.error("Usage: npx tsx scripts/recreate-accounts-from-list.ts <path-to-email-list.txt> [--apply]");
    process.exit(1);
  }

  const raw = readFileSync(filePath, "utf-8");
  const emails = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.toLowerCase());

  const uniqueEmails = [...new Set(emails)];

  if (uniqueEmails.length === 0) {
    console.log("No email addresses found in that file.");
    return;
  }

  console.log(`Found ${uniqueEmails.length} unique email${uniqueEmails.length === 1 ? "" : "es"}:\n`);
  for (const email of uniqueEmails) console.log(`  ${email}`);

  if (!applyChanges) {
    console.log("\nDry run only — nothing was created. Re-run with --apply to actually create these accounts.");
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const email of uniqueEmails) {
    const existing = await db.creator.findUnique({ where: { email } });
    if (existing) {
      console.log(`  Skipped (already exists): ${email}`);
      skipped++;
      continue;
    }

    // A long, random, never-communicated string — nobody can log in
    // with this. The only way into the account is the real "Forgot
    // password" flow, which emails a fresh reset link and lets the
    // actual person set their own new password.
    const placeholderPassword = randomUUID() + randomUUID();
    const passwordHash = await bcrypt.hash(placeholderPassword, 10);

    await db.creator.create({
      data: { email, passwordHash },
    });
    console.log(`  Created: ${email}`);
    created++;
  }

  console.log(`\nDone — created ${created}, skipped ${skipped} (already existed).`);
  console.log("Each person needs to use \"Forgot password\" on /login to set their own password before they can sign in.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());