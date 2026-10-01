const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const XLSX = require("xlsx");
const JSZip = require("jszip");
const root = path.resolve(__dirname, "..");
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
function load(file, mocks = {}, cache = new Map()) {
  file = path.resolve(root, file);
  if (cache.has(file)) return cache.get(file);
  const mod = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  function localRequire(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("@/") || name.startsWith(".")) {
      const target = name.startsWith("@/")
        ? path.join(root, name.slice(2))
        : path.resolve(path.dirname(file), name);
      return load(
        target.endsWith(".ts") ? target : target + ".ts",
        mocks,
        cache,
      );
    }
    return require(name);
  }
  new Function("require", "module", "exports", source)(
    localRequire,
    mod,
    mod.exports,
  );
  cache.set(file, mod.exports);
  return mod.exports;
}
const mapping = load("lib/calendarImport/mapping.ts");
const options = {
  timezone: "Africa/Lagos",
  dateOrder: "ASK",
  year: "",
  defaultTime: "",
  defaultPlatform: "",
};
const row = (extra = {}) => ({
  id: "row-1",
  source: "Sheet 1, row 2",
  date: "2026-10-01",
  time: "09:30",
  platform: "Instagram",
  postType: "Reel",
  category: "",
  caption: "Hello world",
  contentIdea: "Launch",
  hook: "",
  script: "",
  cta: "",
  hashtags: "",
  taggedAccounts: "",
  linkUrl: "",
  notes: "",
  status: "",
  customFields: [],
  warnings: [],
  ...extra,
});
const request = (rows = [row()], extra = {}) => ({
  requestId: "12345678-1234-4234-8234-123456789abc",
  options,
  rows,
  confirmApprovals: false,
  ...extra,
});
function extractor(mocks = {}) {
  return load("lib/calendarImport/extraction.ts", {
    "@/lib/openai": {
      extractCalendarItems: async () =>
        assert.fail("Structured input must not use AI"),
    },
    ...mocks,
  });
}

test("headers map existing fields and preserve notes and unknown columns", () => {
  const items = [
    {
      id: "1",
      source: "row 2",
      values: {
        "Publish Date": "2026-10-01",
        Copy: "First line\nSecond line",
        Title: "Launch",
        Channels: "IG / LinkedIn",
        Format: "Reel",
        Notes: "Film outdoors",
        Music: "Track 1",
      },
    },
  ];
  const rows = mapping.mapItems(items, mapping.suggestMapping(items), options);
  assert.equal(rows[0].caption, "First line\nSecond line");
  assert.equal(rows[0].contentIdea, "Launch");
  assert.equal(rows[0].notes, "Film outdoors");
  assert.deepEqual(rows[0].customFields, [
    { label: "Music", value: "Track 1" },
  ]);
  assert.deepEqual(mapping.parsePlatforms(rows[0].platform), [
    "INSTAGRAM",
    "LINKEDIN",
  ]);
});

test("date mapping preserves local calendar date and explicit offsets", () => {
  assert.equal(
    mapping.resolveDate("2026-10-01", "12:15 AM", options).iso,
    "2026-09-30T23:15:00Z",
  );
  assert.equal(
    mapping.resolveDate("Thursday, 1st October 2026", "2:30 PM", options).iso,
    "2026-10-01T13:30:00Z",
  );
  assert.equal(
    mapping.resolveDate("2026-10-01T08:15:00+02:00", "", options).iso,
    "2026-10-01T06:15:00Z",
  );
  assert.equal(
    mapping.resolveDate("2026-10-01 14:30", "", options).iso,
    "2026-10-01T13:30:00Z",
  );
});

test("ambiguous dates, absent years/times and invalid dates require correction", () => {
  assert.throws(
    () => mapping.resolveDate("01/10/2026", "09:00", options),
    /Ambiguous/,
  );
  assert.equal(
    mapping.resolveDate("01/10/2026", "09:00", { ...options, dateOrder: "DMY" })
      .iso,
    "2026-10-01T08:00:00Z",
  );
  assert.equal(
    mapping.resolveDate("01/10/2026", "09:00", { ...options, dateOrder: "MDY" })
      .iso,
    "2026-01-10T08:00:00Z",
  );
  assert.throws(
    () =>
      mapping.resolveDate("01/10/26", "09:00", {
        ...options,
        dateOrder: "DMY",
      }),
    /Two-digit/,
  );
  assert.equal(
    mapping.resolveDate("01/10/26", "09:00", {
      ...options,
      dateOrder: "DMY",
      year: "2026",
    }).iso,
    "2026-10-01T08:00:00Z",
  );
  assert.equal(
    mapping.resolveDate("01-Oct-2026", "09:00", options).iso,
    "2026-10-01T08:00:00Z",
  );
  assert.throws(() => mapping.resolveDate("31/10", "09:00", options), /year/);
  assert.throws(() => mapping.resolveDate("2026-02-30", "09:00", options));
  assert.throws(
    () => mapping.resolveDate("2026-10-01", "", options),
    /Time is missing/,
  );
  assert.throws(() => mapping.resolveDate("2026-10-01", "24:00", options));
  assert.throws(() => mapping.resolveDate("2026-10-01", "00:30 PM", options));
  const resolved = mapping.resolveDate("31/10", "", {
    ...options,
    year: "2026",
    defaultTime: "10:00",
  });
  assert.equal(resolved.warnings.length, 2);
});

test("daylight-saving repeated and nonexistent local times are rejected", () => {
  const ny = { ...options, timezone: "America/New_York" };
  assert.throws(() => mapping.resolveDate("2026-03-08", "02:30", ny));
  assert.throws(() => mapping.resolveDate("2026-11-01", "01:30", ny));
  assert.equal(
    mapping.resolveDate("2026-11-01T01:30:00-04:00", "", ny).iso,
    "2026-11-01T05:30:00Z",
  );
});

test("unsupported/missing platforms block import; source statuses never imply publishing", () => {
  assert.throws(() => mapping.parsePlatforms("Pinterest"), /Unsupported/);
  assert.throws(() => mapping.parsePlatforms(""), /Choose/);
  assert.deepEqual(
    mapping.parsePlatforms("Instagram, IG & Twitter and YouTube"),
    ["INSTAGRAM", "X", "YOUTUBE"],
  );
  assert.equal(mapping.approvalFor("Scheduled"), "PENDING");
  assert.equal(mapping.approvalFor("Published"), "PENDING");
  assert.equal(mapping.approvalFor("NEEDS_REVISION"), "NEEDS_REVISION");
  assert.equal(
    mapping.rowIssues(row({ caption: "", contentIdea: "" }), options).errors
      .length,
    1,
  );
});

test("exact duplicate fingerprint preserves meaningful differences and matches persisted notes", () => {
  const post = {
    ...row(),
    postDate: "2026-10-01T08:30:00Z",
    platform: "INSTAGRAM",
  };
  assert.equal(
    mapping.duplicateKey(post),
    mapping.duplicateKey({ ...post, caption: " HELLO   world " }),
  );
  assert.notEqual(
    mapping.duplicateKey(post),
    mapping.duplicateKey({ ...post, cta: "Buy now" }),
  );
  assert.notEqual(
    mapping.duplicateKey({
      ...post,
      caption: "",
      contentIdea: "",
      notes: "Note 1",
    }),
    mapping.duplicateKey({
      ...post,
      caption: "",
      contentIdea: "",
      notes: "Note 2",
    }),
  );
  assert.equal(
    mapping.duplicateKey({ ...post, notes: "Film outdoors", status: "Draft" }),
    mapping.duplicateKey({
      ...post,
      notes: "",
      customFields: [
        { label: "Notes", value: "Film outdoors" },
        { label: "Source status", value: "Draft" },
      ],
    }),
  );
});

test("CSV handles BOM, semicolons, quoted delimiters, and multiline copy without AI", async () => {
  const { items } = await extractor().extractImport(
    Buffer.from(
      '\uFEFFDate;Time;Platform;Caption;Title\r\n2026-10-01;09:00;Instagram;"Hello; friend\nSecond line";Launch',
    ),
    "calendar.csv",
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].values.Caption, "Hello; friend\nSecond line");
  assert.equal(items[0].source, "calendar.csv, row 2");
});

test("TSV and UTF16 text tables are supported", async () => {
  const buffer = Buffer.from(
    "\uFEFFDate\tPlatform\tTitle\n2026-10-01\tX\tLaunch",
    "utf16le",
  );
  const result = await extractor().extractImport(buffer, "calendar.txt");
  assert.equal(result.items[0].values.Platform, "X");
});

for (const bookType of ["xlsx", "xls"]) {
  test(`${bookType.toUpperCase()} reads multiple sheets and normalizes serial dates and times`, async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Date", "Time", "Platform", "Caption"],
      [46296, 0.5, "Instagram", "Launch"],
      [],
      [46297.75, "", "X", "Follow up"],
    ]);
    sheet.A2.z = "dd/mm/yyyy";
    sheet.B2.z = "hh:mm";
    sheet.A4.z = "mm/dd/yyyy hh:mm";
    XLSX.utils.book_append_sheet(workbook, sheet, "October");
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Date", "Platform", "Title"],
        ["2026-11-01", "LinkedIn", "Update"],
      ]),
      "November",
    );
    const result = await extractor().extractImport(
      XLSX.write(workbook, { type: "buffer", bookType }),
      `calendar.${bookType}`,
    );
    assert.equal(result.items.length, 3);
    assert.equal(result.items[0].values.Date, "2026-10-01");
    assert.equal(result.items[0].values.Time, "12:00:00");
    assert.equal(result.items[1].values.Date, "2026-10-02T18:00:00");
    assert.equal(result.items[1].source, "October, row 4");
  });
}

test("Excel 1904 date system is respected", async () => {
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { WBProps: { date1904: true } };
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Date", "Platform", "Title"],
    [44834, "X", "Launch"],
  ]);
  sheet.A2.z = "m/d/yy";
  XLSX.utils.book_append_sheet(workbook, sheet, "Calendar");
  const { items } = await extractor().extractImport(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    "calendar.xlsx",
  );
  assert.equal(items[0].values.Date, "2026-10-01");
});

test("no headers preserve all rows for manual mapping", () => {
  const items = extractor().tableItems(
    [
      ["2026-10-01", "IG", "Launch"],
      ["2026-10-02", "X", "Update"],
    ],
    "Sheet",
  );
  assert.equal(items.length, 2);
  assert.equal(items[0].values["Column 1"], "2026-10-01");
  assert.match(items[0].warnings[0], /No header/);
});

test("limits and file signatures reject mismatched, oversized, truncated and encrypted files", async () => {
  const extract = extractor().extractImport;
  await assert.rejects(
    extract(Buffer.from("plain text"), "calendar.doc"),
    /legacy Word/,
  );
  await assert.rejects(
    extract(Buffer.from("plain text"), "calendar.pdf"),
    /not a PDF/,
  );
  await assert.rejects(
    extract(Buffer.from("plain text"), "calendar.xlsx"),
    /extension/,
  );
  await assert.rejects(
    extract(Buffer.from("PKinvalid"), "calendar.docx"),
    /archive/,
  );
  await assert.rejects(
    extract(Buffer.alloc(3 * 1024 * 1024 + 1), "calendar.txt"),
    /3 MB/,
  );
  await assert.rejects(extract(Buffer.from("text"), "calendar.exe"), /Use PDF/);
  await assert.rejects(
    extract(
      Buffer.from(
        "Date,Platform,Title\n" +
          Array(201).fill("2026-10-01,X,Launch").join("\n"),
      ),
      "calendar.csv",
    ),
    /200 items/,
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Date", "Platform", "Title"],
      ...Array(2050).fill(["2026-10-01", "X", "Launch"]),
    ]),
    "Big",
  );
  await assert.rejects(
    extract(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
      "calendar.xlsx",
    ),
    /row limit/,
  );
});

test("DOCX keeps table structure for document interpretation", async () => {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    "_rels/.rels",
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    "word/document.xml",
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:tbl><w:tr><w:tc><w:p><w:r><w:t>2026-10-01</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Instagram</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>',
  );
  const extracted = extractor({
    "@/lib/openai": {
      extractCalendarItems: async (text) => {
        assert.match(text, /<table>/);
        assert.match(text, /2026-10-01/);
        return [
          {
            id: "1",
            source: "table",
            values: { date: "2026-10-01", platform: "Instagram" },
          },
        ];
      },
    },
  });
  const { items } = await extracted.extractImport(
    await zip.generateAsync({ type: "nodebuffer" }),
    "calendar.docx",
  );
  assert.equal(items.length, 1);
});

async function pdfBuffer(text) {
  const PDF = require("pdfkit");
  const document = new PDF();
  const chunks = [];
  const done = new Promise((resolve) => {
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
  });
  if (text) document.text(text);
  document.end();
  return done;
}

test("real PDF text retains page references; image-only PDFs fail instead of inventing items", async () => {
  const extracted = extractor({
    "@/lib/openai": {
      extractCalendarItems: async (text) => {
        assert.match(text, /Page 1/);
        assert.match(text, /Launch/);
        return [{ id: "1", source: "Page 1", values: { caption: "Launch" } }];
      },
    },
  });
  const { items } = await extracted.extractImport(
    await pdfBuffer("2026-10-01 Instagram Launch"),
    "calendar.pdf",
  );
  assert.equal(items.length, 1);
  await assert.rejects(
    extracted.extractImport(await pdfBuffer(""), "scanned.pdf"),
    /Scanned PDFs/,
  );
});

test("legacy DOC is routed through a binary Word parser", async () => {
  const buffer = Buffer.from("d0cf11e0a1b11ae100000000", "hex");
  const result = await extractor({
    "word-extractor": class {
      async extract(value) {
        assert.equal(value, buffer);
        return { getBody: () => "2026-10-01 Instagram Launch" };
      }
    },
    "@/lib/openai": {
      extractCalendarItems: async (text) => {
        assert.match(text, /Launch/);
        return [{ id: "1", source: "Word", values: { caption: "Launch" } }];
      },
    },
  }).extractImport(buffer, "calendar.doc");
  assert.equal(result.items.length, 1);
});

test("real legacy DOC fixture extracts Unicode text through the installed parser", async () => {
  const result = await extractor({
    "@/lib/openai": {
      extractCalendarItems: async (text) => {
        assert.match(text, /Unicode characters/);
        assert.match(text, /😀/);
        return [{ id: "1", source: "Word", values: { caption: text } }];
      },
    },
  }).extractImport(
    fs.readFileSync(
      path.join(__dirname, "fixtures/calendar-import-legacy.doc"),
    ),
    "calendar.doc",
  );
  assert.match(result.items[0].values.caption, /This is a test of reviewing/);
});

test("document interpretation preserves copy, missing fields, and uncertainty without writing posts", async () => {
  const openai = load("lib/openai.ts");
  const fields = [
    "date",
    "time",
    "platform",
    "postType",
    "category",
    "caption",
    "contentIdea",
    "hook",
    "script",
    "cta",
    "hashtags",
    "taggedAccounts",
    "linkUrl",
    "notes",
    "status",
    "source",
    "uncertainty",
  ];
  const item = Object.fromEntries(fields.map((key) => [key, ""]));
  item.caption = "Original copy\nLine two";
  item.source = "Page 1";
  item.uncertainty = "Date not specified";
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "fake-test-key";
  try {
    global.fetch = async (_url, init) => {
      const payload = JSON.parse(init.body);
      assert.match(payload.instructions, /untrusted data/);
      assert.equal(payload.tools, undefined);
      return new Response(
        JSON.stringify({
          status: "completed",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({ items: [item] }),
                },
              ],
            },
          ],
        }),
      );
    };
    const items = await openai.extractCalendarItems(
      "Page 1: Original copy",
      "calendar.txt",
    );
    assert.equal(items[0].values.caption, item.caption);
    assert.equal(items[0].values.date, "");
    assert.match(items[0].warnings.join(" "), /Date not specified/);
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          status: "incomplete",
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: '{"items":[]}' }],
            },
          ],
        }),
      );
    await assert.rejects(
      openai.extractCalendarItems("text", "calendar.txt"),
      /response limit/,
    );
  } finally {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

function database(initial = [], failCreate = false) {
  let posts = [...initial],
    receipts = [],
    queue = Promise.resolve();
  const db = {
    async $transaction(callback) {
      let unlock;
      const next = new Promise((resolve) => {
        unlock = resolve;
      });
      const previous = queue;
      queue = next;
      await previous;
      const priorPosts = structuredClone(posts),
        priorReceipts = structuredClone(receipts);
      try {
        return await callback({
          $queryRaw: async () => [],
          calendarPost: {
            findMany: async () => [...posts],
            create: async ({ data }) => {
              if (failCreate && posts.length) throw new Error("DB insert failed");
              const saved = {
                ...data,
                id: `post-${posts.length + 1}`,
                calendarId: data.calendar.connect.id,
                customFields: data.customFields.create,
              };
              posts.push(saved);
              return saved;
            },
            createMany: async ({ data }) => {
              for (const post of data) {
                posts.push({ ...post, customFields: [] });
              }
              return { count: data.length };
            },
          },
          calendarPostCustomField: {
            createMany: async ({ data }) => {
              if (failCreate) throw new Error("DB insert failed");
              for (const { postId, label, value } of data) {
                posts.find((post) => post.id === postId).customFields.push({ label, value });
              }
              return { count: data.length };
            },
          },
          calendarImport: {
            findUnique: async ({ where }) =>
              receipts.find(
                (receipt) =>
                  receipt.calendarId ===
                    where.calendarId_requestId.calendarId &&
                  receipt.requestId === where.calendarId_requestId.requestId,
              ) ?? null,
            create: async ({ data }) => {
              receipts.push(data);
              return data;
            },
          },
        });
      } catch (error) {
        posts = priorPosts;
        receipts = priorReceipts;
        throw error;
      } finally {
        unlock();
      }
    },
  };
  return { db, posts: () => posts, receipts: () => receipts };
}
const confirmation = (db) =>
  load("lib/calendarImport/confirmation.ts", { "@/lib/db": { db } });

test("large imports preserve every post and custom field across batches", async () => {
  const databaseMock = database();
  const rows = Array.from({ length: 200 }, (_, index) => row({
    id: `row-${index}`,
    platform: "IG, X",
    caption: `Caption ${index}`,
    contentIdea: `Topic ${index}`,
    customFields: Array.from({ length: 6 }, (_, field) => ({
      label: `Field ${field}`, value: `Value ${index}:${field}`,
    })),
  }));
  const result = await confirmation(databaseMock.db).confirmImport(
    "calendar-1", "creator-1", request(rows),
  );
  assert.equal(result.postIds.length, 400);
  assert.equal(new Set(result.postIds).size, 400);
  assert.deepEqual(databaseMock.posts().map((post) => post.id), result.postIds);
  assert.ok(databaseMock.posts().every((post) => post.customFields.length === 6));
  assert.equal(databaseMock.receipts().length, 1);
});

test("confirmation creates normal posts per platform with hooks/scripts/notes and publishing off", async () => {
  const databaseMock = database();
  const result = await confirmation(databaseMock.db).confirmImport(
    "calendar-1",
    "creator-1",
    request([
      row({
        platform: "IG, LinkedIn",
        hook: "Hook",
        script: "Script",
        notes: "Film outdoors",
        status: "Scheduled",
        customFields: [{ label: "Owner", value: "Alex" }],
      }),
    ]),
  );
  assert.equal(result.postIds.length, 2);
  const posts = databaseMock.posts();
  assert.deepEqual(
    posts.map((post) => post.platform),
    ["INSTAGRAM", "LINKEDIN"],
  );
  assert.equal(posts[0].postDate.toISOString(), "2026-10-01T08:30:00.000Z");
  assert.equal(posts[0].hook, "Hook");
  assert.equal(posts[0].script, "Script");
  assert.equal(posts[0].isAiDraft, undefined);
  assert.equal(posts[0].publishStatus, undefined);
  assert.equal(posts[0].instagramPublishStatus, undefined);
  assert.equal(posts[0].tikTokPrivacyLevel, null);
  assert.equal(posts[0].approvalStatus, "PENDING");
  assert.deepEqual(
    posts[0].customFields.map((field) => field.label),
    ["Owner", "Notes", "Source status"],
  );
});

test("exact duplicates in upload and existing posts are skipped, including reimports with new request IDs", async () => {
  const databaseMock = database();
  const service = confirmation(databaseMock.db);
  const input = request([
    row({ notes: "Film outside" }),
    row({ id: "row-2", notes: "Film outside" }),
  ]);
  const first = await service.confirmImport("calendar-1", "creator-1", input);
  assert.equal(first.postIds.length, 1);
  assert.equal(first.skipped.length, 1);
  const second = await service.confirmImport("calendar-1", "creator-1", {
    ...input,
    requestId: "22345678-1234-4234-8234-123456789abc",
  });
  assert.equal(second.postIds.length, 0);
  assert.equal(second.skipped.length, 2);
  assert.equal(databaseMock.posts().length, 1);
});

test("repeated and simultaneous confirmations are idempotent; changed payload cannot reuse receipt", async () => {
  const databaseMock = database();
  const service = confirmation(databaseMock.db);
  const input = request();
  const results = await Promise.all([
    service.confirmImport("calendar-1", "creator-1", input),
    service.confirmImport("calendar-1", "creator-1", input),
  ]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(databaseMock.posts().length, 1);
  assert.equal(databaseMock.receipts().length, 1);
  await assert.rejects(
    service.confirmImport(
      "calendar-1",
      "creator-1",
      request([row({ caption: "Changed" })]),
    ),
    /already used/,
  );
  await assert.rejects(
    service.confirmImport("calendar-1", "another-creator", input),
    /already used/,
  );
});

test("similar posts require explicit keep decision, including a live conflict after preview", async () => {
  const databaseMock = database();
  const service = confirmation(databaseMock.db);
  await service.confirmImport("calendar-1", "creator-1", request());
  const second = request([row({ time: "10:00" })], {
    requestId: "22345678-1234-4234-8234-123456789abc",
  });
  await assert.rejects(
    service.confirmImport("calendar-1", "creator-1", second),
    /Possible duplicate/,
  );
  assert.equal(databaseMock.posts().length, 1);
  second.rows[0].keepPossibleDuplicate = true;
  assert.equal(
    (await service.confirmImport("calendar-1", "creator-1", second)).postIds
      .length,
    1,
  );
});

test("approved imports need explicit confirmation and invalid rows/custom fields are rejected before DB calls", () => {
  const service = confirmation(database().db);
  assert.throws(
    () => service.validateConfirm(request([row({ status: "Approved" })])),
    /Confirm/,
  );
  assert.doesNotThrow(() =>
    service.validateConfirm(
      request([row({ status: "Approved" })], { confirmApprovals: true }),
    ),
  );
  assert.throws(
    () => service.validateConfirm(request([row({ date: "2026-02-30" })])),
    /range/,
  );
  assert.throws(
    () => service.validateConfirm(request([row({ platform: "Pinterest" })])),
    /Unsupported/,
  );
  assert.throws(
    () =>
      service.validateConfirm(
        request([row({ customFields: [{ label: 123, value: "bad" }] })]),
      ),
    /text labels/,
  );
  assert.throws(
    () =>
      service.validateConfirm(
        request([
          row({
            notes: "Notes",
            customFields: Array(50).fill({ label: "x", value: "y" }),
          }),
        ]),
      ),
    /50 custom/,
  );
});

test("failure partway through confirmation rolls back posts and receipt", async () => {
  const databaseMock = database([], true);
  await assert.rejects(
    confirmation(databaseMock.db).confirmImport(
      "calendar-1",
      "creator-1",
      request([row({ platform: "IG, X", notes: "Field insertion fails" })]),
    ),
    /DB insert failed/,
  );
  assert.equal(databaseMock.posts().length, 0);
  assert.equal(databaseMock.receipts().length, 0);
});

test("permissions exclude viewers/add-content users and inactive workspaces at both endpoints", async () => {
  for (const file of ["preview", "confirm"]) {
    let reads = 0;
    const route = load(`app/api/calendars/[id]/imports/${file}/route.ts`, {
      "@/lib/calendarImport/access": {
        importAccess: async () => ({
          error: new Response('{"error":"Denied"}', { status: 403 }),
        }),
      },
      "@/lib/db": { db: {} },
      "@/lib/calendarImport/confirmation": {},
      "@/lib/calendarImport/extraction": {},
    });
    const response = await route.POST(
      {
        formData: () => {
          reads++;
        },
        text: () => {
          reads++;
        },
      },
      { params: Promise.resolve({ id: "other-calendar" }) },
    );
    assert.equal(response.status, 403);
    assert.equal(reads, 0);
  }
  const access = (creator, permitted, active) =>
    load("lib/calendarImport/access.ts", {
      "@/lib/auth": { getCurrentCreator: async () => creator },
      "@/lib/calendarPermissions": {
        hasCalendarPermission: async (_creator, _calendar, role) => {
          assert.equal(role, "EDIT_CALENDAR");
          return permitted;
        },
        canAccessCalendarById: async () => active,
      },
      "@/lib/admin": { isAdminEmail: () => false },
    });
  assert.equal(
    (await access(null, false, false).importAccess("calendar")).error.status,
    401,
  );
  assert.equal(
    (await access({ id: "user" }, false, true).importAccess("calendar")).error
      .status,
    403,
  );
  assert.equal(
    (await access({ id: "user" }, true, false).importAccess("calendar")).error
      .status,
    403,
  );
  assert.equal(
    (await access({ id: "user" }, true, true).importAccess("calendar")).creator
      .id,
    "user",
  );
});

test("manual post creation uses shared validation, saves hooks/scripts and has no partial multi-platform writes", async () => {
  const databaseMock = database();
  const route = load("app/api/calendars/[id]/posts/route.ts", {
    "@/lib/auth": {
      getCurrentCreator: async () => ({
        id: "creator-1",
        email: "test@example.test",
      }),
    },
    "@/lib/db": {
      db: {
        ...databaseMock.db,
        socialCalendar: { findUnique: async () => ({ id: "calendar-1" }) },
      },
    },
    "@/lib/calendarPermissions": {
      hasCalendarPermission: async () => true,
      canAccessCalendarById: async () => true,
    },
    "@/lib/admin": { isAdminEmail: () => false },
    "@/lib/r2": { publicUrlFor: (key) => key },
  });
  const call = (body) =>
    route.POST(
      { json: async () => body },
      { params: Promise.resolve({ id: "calendar-1" }) },
    );
  assert.equal(
    (await call({ postDate: "invalid", platform: "INSTAGRAM" })).status,
    400,
  );
  assert.equal(
    (await call({ postDate: "2026-02-30T09:00:00Z", platform: "INSTAGRAM" }))
      .status,
    400,
  );
  assert.equal(
    (
      await call({
        postDate: "2026-10-01T09:00:00Z",
        platforms: ["INSTAGRAM", "Pinterest"],
      })
    ).status,
    400,
  );
  assert.equal(databaseMock.posts().length, 0);
  const response = await call({
    postDate: "2026-10-01T09:00:00Z",
    platforms: ["INSTAGRAM", "INSTAGRAM", "X"],
    hook: "Hook",
    script: "Script",
  });
  assert.equal(response.status, 200);
  assert.equal(databaseMock.posts().length, 2);
  assert.equal(databaseMock.posts()[0].script, "Script");
});
