import { createHash, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  calendarPostData,
  lockCalendar,
  POST_TEXT_FIELDS,
} from "@/lib/calendarPosts";
import {
  approvalFor,
  duplicateIndex,
  parsePlatforms,
  rowIssues,
  type ImportOptions,
  type ImportRow,
  type ExistingPost,
} from "./mapping";
import type { Prisma, SocialPlatform } from "@prisma/client";

export class ImportError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export type ImportSelection = ImportRow & { keepPossibleDuplicate?: boolean };
export type ConfirmInput = {
  requestId: string;
  options: ImportOptions;
  rows: ImportSelection[];
  confirmApprovals: boolean;
};
export function validateConfirm(input: unknown): ConfirmInput {
  if (!input || typeof input !== "object")
    throw new ImportError("Invalid import request.");
  const body = input as ConfirmInput;
  if (
    typeof body.requestId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(body.requestId)
  )
    throw new ImportError("Invalid import request ID.");
  if (
    !body.options ||
    typeof body.options.timezone !== "string" ||
    body.options.timezone.length > 100 ||
    !["ASK", "DMY", "MDY"].includes(body.options.dateOrder)
  )
    throw new ImportError("Invalid date options.");
  for (const field of ["year", "defaultTime", "defaultPlatform"] as const)
    if (typeof body.options[field] !== "string")
      throw new ImportError("Invalid import options.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: body.options.timezone });
  } catch {
    throw new ImportError("Choose a valid timezone.");
  }
  if (!Array.isArray(body.rows) || !body.rows.length || body.rows.length > 200)
    throw new ImportError("Choose between 1 and 200 items to import.");
  const ids = new Set<string>();
  for (const row of body.rows) {
    if (
      !row ||
      typeof row !== "object" ||
      typeof row.id !== "string" ||
      row.id.length > 100 ||
      ids.has(row.id)
    )
      throw new ImportError("Invalid or repeated content item.");
    ids.add(row.id);
    for (const field of [
      "source",
      "date",
      "time",
      "platform",
      "notes",
      "status",
      ...POST_TEXT_FIELDS,
    ]) {
      const value = row[field as keyof ImportRow];
      if (typeof value !== "string" || value.length > 20000)
        throw new ImportError(`Invalid ${field} field.`);
    }
    if (
      !Array.isArray(row.customFields) ||
      !Array.isArray(row.warnings) ||
      row.warnings.some((value) => typeof value !== "string")
    )
      throw new ImportError("Invalid content item details.");
    const issues = rowIssues(row, body.options);
    if (issues.errors.length)
      throw new ImportError(
        `${row.source.slice(0, 100)}: ${issues.errors.join(" ")}`,
      );
    if (
      approvalFor(row.status) === "APPROVED" &&
      body.confirmApprovals !== true
    )
      throw new ImportError(
        "Confirm that imported approved posts will be locked.",
      );
    try {
      calendarPostData(
        "validation",
        { ...row, postDate: issues.iso, customFields: importCustomFields(row) },
        parsePlatforms(row.platform)[0] as SocialPlatform,
      );
    } catch (error) {
      throw new ImportError(
        error instanceof Error ? error.message : "Invalid content fields.",
      );
    }
  }
  if (
    body.rows.reduce(
      (count, row) => count + parsePlatforms(row.platform).length,
      0,
    ) > 500
  )
    throw new ImportError("At most 500 platform posts per import.");
  return body;
}

export async function confirmImport(
  calendarId: string,
  creatorId: string,
  raw: unknown,
) {
  const input = validateConfirm(raw);
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
  return db.$transaction(
    async (tx) => {
      await lockCalendar(tx, calendarId);
      const previous = await tx.calendarImport.findUnique({
        where: {
          calendarId_requestId: { calendarId, requestId: input.requestId },
        },
      });
      if (previous) {
        if (
          previous.creatorId !== creatorId ||
          previous.payloadHash !== payloadHash
        )
          throw new ImportError(
            "This import request was already used. Start a new import for changed content.",
            409,
          );
        return previous.result;
      }
      const existing: ExistingPost[] = await tx.calendarPost.findMany({
        where: { calendarId },
        select: {
          id: true,
          postDate: true,
          platform: true,
          caption: true,
          contentIdea: true,
          hook: true,
          script: true,
          postType: true,
          category: true,
          cta: true,
          hashtags: true,
          taggedAccounts: true,
          linkUrl: true,
          customFields: { select: { label: true, value: true } },
        },
      });
      const duplicates = duplicateIndex(existing, input.options.timezone);
      const postIds: string[] = [],
        skipped: string[] = [];
      const posts: Prisma.CalendarPostCreateManyInput[] = [];
      const fields: Prisma.CalendarPostCustomFieldCreateManyInput[] = [];
      let firstDate: string | null = null;
      for (const row of input.rows) {
        const postDate = rowIssues(row, input.options).iso!;
        for (const platform of parsePlatforms(row.platform)) {
          const candidate: ExistingPost = {
            ...row,
            id: row.id,
            postDate,
            platform,
          };
          if (duplicates.exact(candidate)) {
            skipped.push(`${row.id}:${platform}`);
            continue;
          }
          if (
            duplicates.possible(candidate) &&
            row.keepPossibleDuplicate !== true
          )
            throw new ImportError(
              `Possible duplicate at ${row.source.slice(0, 100)}. Review it and explicitly keep it or exclude the item.`,
              409,
            );
          const customFields = importCustomFields(row);
          const data = calendarPostData(
            calendarId,
            { ...row, postDate, customFields },
            platform as SocialPlatform,
          );
          data.approvalStatus = approvalFor(row.status);
          const id = randomUUID();
          const { calendar, customFields: nestedFields, ...post } = data;
          posts.push({ ...post, id, calendarId });
          for (const field of (nestedFields?.create ?? []) as {
            label: string;
            value: string;
          }[]) {
            fields.push({ ...field, postId: id });
          }
          postIds.push(id);
          if (!firstDate || postDate < firstDate) firstDate = postDate;
          duplicates.add(candidate);
        }
      }
      // Bulk inserts avoid a database round trip for every post and nested field.
      // Keep posts, fields, and the retry receipt in the same locked transaction.
      if (posts.length) await tx.calendarPost.createMany({ data: posts });
      for (let offset = 0; offset < fields.length; offset += 1000) {
        await tx.calendarPostCustomField.createMany({
          data: fields.slice(offset, offset + 1000),
        });
      }
      const result = { postIds, skipped, firstDate };
      await tx.calendarImport.create({
        data: {
          calendarId,
          creatorId,
          requestId: input.requestId,
          payloadHash,
          result: result as Prisma.InputJsonValue,
        },
      });
      return result;
    },
    { maxWait: 10000, timeout: 30000 },
  );
}

function importCustomFields(row: ImportRow) {
  return [
    ...row.customFields,
    ...(row.notes.trim() ? [{ label: "Notes", value: row.notes }] : []),
    ...(row.status.trim()
      ? [{ label: "Source status", value: row.status }]
      : []),
  ];
}
