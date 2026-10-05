# Import Calendar

The existing Content Workspace calendar has an **Import Calendar** action for owners and collaborators with `EDIT_CALENDAR` permission. Imports use the existing `CalendarPost` model, post editor, calendar grid, client view, and approval workflow.

## Workflow

1. Choose a PDF, CSV, XLS, XLSX, DOC, DOCX, or TXT file.
2. Review detected items and their source references. Change column mappings, timezone, numeric date order, and defaults for missing years, times, or platforms.
3. Edit individual fields or exclude items. Correct errors; acknowledge possible duplicates and imported approvals where applicable.
4. Check the review acknowledgment and confirm. Only then are posts created, one per platform.

Successful confirmation refreshes the existing calendar, clears filters, and opens the earliest imported month. Exact duplicates are skipped. Source documents and previews are not persisted or uploaded to public asset storage.

## Mapping

| Source field                                | Existing field                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Date and time                               | `postDate` (UTC instant)                                                                      |
| Platform / channel                          | `platform`; multiple platforms become separate posts                                          |
| Format / content type                       | `postType`                                                                                    |
| Title / topic                               | `contentIdea`                                                                                 |
| Copy / caption                              | `caption`                                                                                     |
| Category / pillar                           | `category`                                                                                    |
| Hook, script, CTA, hashtags, mentions, link | Corresponding existing fields                                                                 |
| Notes                                       | Custom field labeled `Notes`                                                                  |
| Unmatched columns                           | Custom fields, unless explicitly ignored                                                      |
| Source status                               | Custom field labeled `Source status`; recognized approval labels also map to `approvalStatus` |

`Approved` and `Client approved` map to `APPROVED`, requiring explicit acknowledgment because existing editing rules lock approved posts. Revision/rejected labels map to `NEEDS_REVISION`. Other statuses default to `PENDING`. Importing never schedules publishing or creates platform publication IDs. TikTok privacy remains unset for the user to choose in the existing editor. Media filenames/links can be retained as custom fields; they are not automatically downloaded or attached.

## Dates

The import timezone defaults to the browser's IANA timezone. The preview shows both the selected import wall time and the browser-local calendar timestamp, matching the existing grid's date grouping. There is no new workspace timezone setting.

ISO dates, explicit-offset ISO timestamps, numeric dates, month-name dates, 12/24-hour times, and Excel date/time serials are supported. Both Excel 1900 and 1904 date systems are handled. Ambiguous numeric dates require an explicit date-order selection. Missing years/times require an explicit default or a per-item correction. Invalid dates and repeated/nonexistent daylight-saving local times block confirmation; an explicit-offset timestamp resolves daylight-saving ambiguity.

## Parsing and limits

CSV and spreadsheet/TSV tables use deterministic extraction and header aliases; no AI call is needed. XLS/XLSX use SheetJS CE 0.20.3 from its official distribution. DOC uses `word-extractor`; DOCX uses Mammoth with table structure retained. PDF uses `pdf2json` text positions. Unstructured TXT and document text use the existing workspace AI service with a structured extraction schema, preserving source copy and marking uncertainty. Users must review these results: document interpretation can make mistakes.

Scanned/image-only PDFs are rejected with an OCR/export explanation. OCR is not included. Irregular documents require the existing AI service configuration. File contents are treated as data, never instructions, and document HTML is never rendered.

Limits: 3 MB upload, 200 content items, 500 resulting platform posts, 20 spreadsheet sheets, 2,000 rows per sheet, 50 columns, 60,000 characters for AI document interpretation, and 20 MB expanded DOCX/XLSX archive size. Oversized files are rejected rather than silently truncated. Preview extraction does not consume media storage.

## Server implementation

- `POST /api/calendars/[id]/imports/preview`: authenticated upload/extraction; returns source items, proposed mappings, and existing posts for duplicate review. Creates no posts.
- `POST /api/calendars/[id]/imports/confirm`: rechecks permissions and subscription access, validates corrected fields/date options, then commits posts and an import receipt in one transaction.
- `lib/calendarPosts.ts`: shared validation and creation data used by both manual creation and imports. Manual multi-platform creation is now transactional and deduplicates repeated platform selections.
- `lib/calendarImport/`: extraction, mapping, validation, duplicate detection, and confirmation.
- `components/calendars/ImportCalendar.tsx`: native modal preview with mapping and item editing, exclusions, review acknowledgments, and safe retry behavior.

Exact duplicates compare workspace, timestamp, platform, normalized copy/topic/hook/script, format, category, CTA, hashtags, tagged accounts, link, and custom details. Similar copy/topic/hook/script on the same platform and local day is flagged and requires an explicit keep decision. Duplicate checks run again against current database state during confirmation. A workspace row lock serializes import confirmations and manual creation. `CalendarImport` stores a unique workspace/request ID, actor, payload hash, and result IDs so retries return the original result. Confirmation failures roll back the whole import. No uniqueness constraint is imposed on ordinary posts, so intentionally similar content can still be created.

## Database rollout

Apply `prisma/migrations/20261001140000_calendar_imports/migration.sql` through the normal Prisma migration workflow before enabling confirmation, and regenerate the Prisma client. The migration adds only the `CalendarImport` receipt table and its workspace relationship. It does not alter existing posts. Do not run all pending migrations against production without reviewing any unrelated pending migrations.

## Verification

```sh
node --test tests/calendar-import.test.cjs
npx tsc --noEmit --incremental false
npx prisma validate
```

Tests exercise real CSV, XLS, XLSX, PDF, DOCX, and legacy DOC extraction, field mapping, Unicode/multiline text, date ambiguities, timezones/daylight saving, permissions, idempotency, duplicates, transactional rollback, and shared manual creation. AI calls and database operations use isolated test doubles; no real provider calls or database writes are made by the tests.

The legacy DOC fixture is from https://github.com/morungos/node-word-extractor/blob/develop/__tests__/data/test01.doc; its MIT license is included in `tests/fixtures/calendar-import-legacy-LICENSE`.


### Reviewing times

The review follows your browser’s date and time display preferences. Import timezone controls how source times become scheduled instants. Explicit AM/PM, dotted forms such as `2.30 p.m.`, noon, midnight, and clear 24-hour times are supported. For ambiguous values such as `9` or `12:00`, specify AM/PM or explicitly select “My calendar uses 24-hour times.” Zero-padded morning values such as `09:30` are treated as 24-hour notation.

“Fill missing times” supplies times only where none exist. “Replace times for all selected content” overwrites existing and missing times, including times embedded in date fields; excluded items remain unchanged. Individual time corrections also replace embedded times. Replacement times use the selected import timezone. Validation updates immediately; unrelated date, platform, or duplicate issues still need review.

Use search and the All items, Needs attention, Ready to import, and Duplicates filters to navigate large imports. Change file starts a fresh review.
