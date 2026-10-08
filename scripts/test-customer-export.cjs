const assert = require("node:assert/strict"),
  fs = require("fs"),
  ts = require("typescript");
const { parse } = require("csv-parse/sync");
function load(file, deps = {}) {
  const mod = { exports: {} };
  new Function(
    "module",
    "exports",
    "require",
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
  )(mod, mod.exports, (n) => deps[n] ?? require(n));
  return mod.exports;
}
const filters = load("lib/adminCustomerFilters.ts");
const { customerCsvHeader, customerCsvRow } = load("lib/customerCsv.ts", {
  "@/lib/adminCustomerFilters": filters,
});
const now = new Date("2026-10-08T12:00:00Z");
const window = filters.customerFilters(
  { range: "custom", from: "2026-10-01", to: "2026-10-07" },
  now,
);
assert.equal(window.from.toISOString(), "2026-09-30T23:00:00.000Z");
assert.equal(window.to.toISOString(), "2026-10-07T23:00:00.000Z");
assert(
  filters.customerFilters(
    { range: "custom", from: "2026-02-30", to: "2026-03-02" },
    now,
  ).error,
);
assert.equal(
  filters.customerFilters({ status: "constructor" }, now).status,
  "all",
);
assert.equal(filters.customerFilters({ page: "-1" }, now).page, 1);
const sample = {
  key: "customer",
  creatorId: "customer",
  name: '=HYPERLINK("evil","click")',
  email: "person@example.com",
  phone: "+2348012345678",
  companyName: 'Acme, "Studio"\nNorth',
  accountType: "CREATOR",
  joinedAt: now,
  deactivated: false,
  product: "delivery",
  status: "active",
  plan: "STARTER",
  cycle: "MONTHLY",
  nextBillingAt: now,
  firstPaidAt: now,
  lastPaidAt: now,
  lifetimePayments: 3,
  lifetimeRevenue: 17700,
  periodPayments: 1,
  periodRevenue: 5900,
  subscriptionPayments: 3,
  oneTimePayments: 0,
  recentPayments: [
    {
      reference: "charge-1",
      amountNgn: 5900,
      paidAt: now.toISOString(),
      type: "SUBSCRIPTION_INITIAL",
    },
  ],
};
const parsed = parse(customerCsvRow(sample));
assert.equal(parsed[0].length, customerCsvHeader.length);
assert(parsed[0][1].startsWith("'="));
assert.equal(parsed[0][3], "'+2348012345678");
assert.equal(parsed[0][4], sample.companyName);
let session = { email: "admin@example.com" },
  pageCalls = 0;
const total = 425;
const { GET } = load("app/api/admin/customers/export/route.ts", {
  "@/lib/auth": { getCurrentCreator: async () => session },
  "@/lib/admin": { isAdminEmail: (email) => email === "admin@example.com" },
  "@/lib/adminCustomerFilters": filters,
  "@/lib/customerCsv": {
    customerCsvHeader,
    customerCsvRow,
    csvCell: load("lib/customerCsv.ts", {
      "@/lib/adminCustomerFilters": filters,
    }).csvCell,
  },
  "@/lib/adminCustomers": {
    customerCte: async () => ({}),
    customerRows: async (cte, sort, limit, offset) => {
      pageCalls++;
      return Array.from(
        { length: Math.min(limit, total - offset) },
        (_, i) => ({
          ...sample,
          name: "Customer " + (offset + i),
          key: String(offset + i),
        }),
      );
    },
  },
});
(async () => {
  session = null;
  assert.equal(
    (
      await GET({
        nextUrl: new URL("https://example.test/api/admin/customers/export"),
      })
    ).status,
    401,
  );
  session = { email: "user@example.com" };
  assert.equal(
    (
      await GET({
        nextUrl: new URL("https://example.test/api/admin/customers/export"),
      })
    ).status,
    401,
  );
  session = { email: "admin@example.com" };
  assert.equal(
    (
      await GET({
        nextUrl: new URL(
          "https://example.test/api/admin/customers/export?range=custom&from=bad",
        ),
      })
    ).status,
    400,
  );
  const response = await GET({
    nextUrl: new URL(
      "https://example.test/api/admin/customers/export?status=active&product=delivery&page=8",
    ),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const csv = await response.text();
  const rows = parse(csv, { bom: true });
  assert.equal(rows.length, total + 1);
  assert.equal(pageCalls, 2);
  assert.equal(rows[0].length, customerCsvHeader.length);
  console.log(
    "Customer export checks passed: date boundaries, input validation, auth, CSV escaping, formula protection and all matching rows across pages.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
