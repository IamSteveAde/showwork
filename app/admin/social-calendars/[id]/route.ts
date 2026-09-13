import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";

async function requireAdmin() {
const creator = await getCurrentCreator();

if (!creator || !isAdminEmail(creator.email)) {
return null;
}

return creator;
}

// PATCH — admin billing controls for the Content Workspace account
// that owns a client workspace.
//
// Content Workspace billing is account-level:
// one subscription covers the creator's client workspaces,
// collaborators, AI Studio, publishing and related workspace features.
export async function PATCH(
req: NextRequest,
{ params }: { params: Promise<{ id: string }> }
) {
const admin = await requireAdmin();

if (!admin) {
return NextResponse.json(
{ error: "Unauthorized" },
{ status: 401 }
);
}

const { id } = await params;

const calendar = await db.socialCalendar.findUnique({
where: { id },
select: {
id: true,
managerId: true,
},
});

if (!calendar) {
return NextResponse.json(
{ error: "Client workspace not found" },
{ status: 404 }
);
}

let body: { action?: string };

try {
body = await req.json();
} catch {
return NextResponse.json(
{ error: "Invalid request body" },
{ status: 400 }
);
}

const { action } = body;

// ─────────────────────────────────────────────
// GRANT FREE MONTH
// ─────────────────────────────────────────────
//
// Grants one month of Content Workspace access to
// the entire creator account.
//
// This also makes AI Studio available because AI is
// included in the Content Workspace subscription.
//
if (action === "grant_free_month") {
const now = new Date();

 
const oneMonthFromNow = new Date(now);
oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

const existingCreator = await db.creator.findUnique({
  where: { id: calendar.managerId },
  select: {
    contentWorkspacePlan: true,
  },
});

const plan = existingCreator?.contentWorkspacePlan ?? "CREATOR";

const updated = await db.creator.update({
  where: {
    id: calendar.managerId,
  },
  data: {
    contentWorkspacePlan: plan,
    contentWorkspaceBillingStatus: "ACTIVE",
    contentWorkspaceSubscriptionRenewsAt: oneMonthFromNow,
    contentWorkspaceWentOfflineAt: null,
    contentWorkspaceTrialEndsAt: null,
    contentWorkspacePendingSubscriptionRef: null,
  },
  select: {
    id: true,
    contentWorkspacePlan: true,
    contentWorkspaceBillingStatus: true,
    contentWorkspaceBillingCycle: true,
    contentWorkspaceSubscriptionRenewsAt: true,
    contentWorkspaceTrialEndsAt: true,
  },
});

return NextResponse.json({
  creator: updated,
  message:
    "One free month of Content Workspace access granted for the account.",
});
 

}

// ─────────────────────────────────────────────
// RESET BILLING
// ─────────────────────────────────────────────
//
// Resets the account-level Content Workspace billing
// state without deleting any workspace data.
//
// This does NOT delete:
// - client workspaces
// - posts
// - collaborators
// - business documents
// - AI history
// - publishing data
//
if (action === "reset_billing") {
const updated = await db.creator.update({
where: {
id: calendar.managerId,
},
data: {
contentWorkspaceBillingStatus: "PENDING_SETUP",
contentWorkspacePaystackCustomerCode: null,
contentWorkspacePaystackSubscriptionCode: null,
contentWorkspacePaystackEmailToken: null,
contentWorkspaceSubscriptionRenewsAt: null,
contentWorkspacePendingSubscriptionRef: null,
contentWorkspaceWentOfflineAt: null,
contentWorkspaceTrialEndsAt: null,
},
select: {
id: true,
contentWorkspacePlan: true,
contentWorkspaceBillingStatus: true,
contentWorkspaceBillingCycle: true,
contentWorkspaceSubscriptionRenewsAt: true,
contentWorkspaceTrialEndsAt: true,
},
});

 
return NextResponse.json({
  creator: updated,
  message:
    "Content Workspace billing has been reset for the account.",
});
 

}

return NextResponse.json(
{ error: "Unknown action" },
{ status: 400 }
);
}
