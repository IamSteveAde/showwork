import { queueOfferEmails, scheduleBenefitEmailDelivery } from "@/lib/billingBenefitNotifications";
import { complimentaryAccessSelect, deliveryComplimentaryTier, workspaceComplimentaryPlan } from "@/lib/complimentaryAccess";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";
import { parseBillingOffer } from "@/lib/adminBillingOfferRules";
import { addCalendarMonths } from "@/lib/billingOfferRules";
import { refreshComplimentaryGrantsForAccounts } from "@/lib/complimentaryGrants";
import type { BillingCycle, SubscriptionTier, ContentWorkspacePlan } from "@prisma/client";

async function adminAccount() {
  const admin = await getCurrentCreator();
  return admin && isAdminEmail(admin.email) ? admin : null;
}
export async function GET(req: NextRequest) {
  if (!await adminAccount()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  const recipientFilter = req.nextUrl.searchParams.get("recipients") ?? "ALL";
  if (!["ALL", "PARTNERS"].includes(recipientFilter)) return NextResponse.json({ error: "Invalid recipient filter" }, { status: 400 });
  const accountSelect = { id: true, name: true, email: true, isComped: true, compedUntil: true, ...complimentaryAccessSelect,
    partnerProfile: { select: { status: true, isActive: true } } } as const;
  const [offers, creators, needsAttention, selectedCreator, emailStates] = await Promise.all([
    db.billingOffer.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: {
      _count: { select: { recipients: true, subscriptions: true } },
      recipients: { take: 5, include: { creator: { select: accountSelect } } },
    } }),
    db.creator.findMany({ where: { isDeactivated: false, ...(recipientFilter === "PARTNERS" ? { partnerProfile: { is: { status: "ACTIVE" } } } : {}), ...(q ? { OR: [
      { email: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } },
    ] } : {}) }, select: accountSelect, take: 50, orderBy: { email: "asc" } }),
    db.billingOfferSubscription.findMany({ where: { status: "RESTORE_PENDING" },
      select: { id: true, title: true, product: true, lastError: true, creator: { select: { email: true } } }, take: 50 }),
    req.nextUrl.searchParams.get("creator") ? db.creator.findFirst({ where: { id: req.nextUrl.searchParams.get("creator")!, isDeactivated: false }, select: accountSelect }) : Promise.resolve(null),
    db.billingBenefitNotification.groupBy({ by: ["offerId", "status"], _count: { _all: true } }),
  ]);
  const decorate = (account: typeof creators[number]) => ({ ...account,
    hasComplimentaryAccess: !!deliveryComplimentaryTier(account) || !!workspaceComplimentaryPlan(account) });
  return NextResponse.json({ offers, creators: creators.map(decorate), needsAttention,
    selectedCreator: selectedCreator ? decorate(selectedCreator) : null, emailStates });
}
export async function POST(req: NextRequest) {
  const admin = await adminAccount();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let input, requestId: string;
  let recipientFilter: string;
  try {
    const body = await req.json();
    input = parseBillingOffer(body);
    recipientFilter = body.recipientFilter ?? "ALL";
    if (!["ALL", "PARTNERS"].includes(recipientFilter)) throw new Error("Invalid recipient filter");
    if (recipientFilter === "PARTNERS" && input.audience !== "SELECTED") throw new Error("The partner filter requires selected recipients");
    requestId = body.requestId;
    if (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(requestId)) throw new Error("Invalid submission identifier");
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid offer" }, { status: 400 }); }
  const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  try {
    const existing = await db.billingOffer.findUnique({ where: { id: requestId } });
    if (existing && existing.requestHash === requestHash) scheduleBenefitEmailDelivery(existing.id);
    if (existing) return existing.requestHash === requestHash ? NextResponse.json({ offer: existing }) : NextResponse.json({ error: "This submission was already saved with different terms. Start a new offer." }, { status: 409 });
    const { creatorIds, ...details } = input;
    const validAccounts = await db.creator.count({ where: { id: { in: creatorIds }, isDeactivated: false, ...(recipientFilter === "PARTNERS" ? { partnerProfile: { is: { status: "ACTIVE" } } } : {}) } });
    if (validAccounts !== creatorIds.length) return NextResponse.json({ error: "Some selected accounts are unavailable or no longer match your partner filter. Refresh your selection." }, { status: 400 });
    const now = new Date();
    const offer = await db.$transaction(async tx => {
      const created = await tx.billingOffer.create({ data: {
        ...details, id: requestId, requestHash, createdBy: admin.email,
        deliveryTier: details.deliveryTier as SubscriptionTier | null,
        workspacePlan: details.workspacePlan as ContentWorkspacePlan | null,
        billingCycle: details.billingCycle as BillingCycle | null,
        recipients: { create: creatorIds.map(creatorId => ({ creatorId })) },
      } });
      if (details.percent === 100) {
        const products = details.product === "BOTH" ? ["DELIVERY", "CONTENT_WORKSPACE"] : [details.product];
        await tx.billingOfferSubscription.createMany({ data: creatorIds.flatMap(creatorId => products.map(product => ({
          offerId: created.id, creatorId, product,
          plan: product === "DELIVERY" ? details.deliveryTier! : details.workspacePlan!,
          billingCycle: "MONTHLY" as const, title: details.title, percent: 100, durationMonths: details.durationMonths,
          standardPriceNgn: 0, discountedPriceNgn: 0, status: "COMPLIMENTARY",
          activatedAt: now, discountEndsAt: addCalendarMonths(now, details.durationMonths),
        }))) });
        await refreshComplimentaryGrantsForAccounts(tx, creatorIds);
      }
      await queueOfferEmails(tx, created, "GRANTED", details.audience === "SELECTED" ? creatorIds : undefined);
      return created;
    }, { timeout: 30000, isolationLevel: "Serializable" });
    scheduleBenefitEmailDelivery(offer.id);
    return NextResponse.json({ offer, emailsQueued: true }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const offer = await db.billingOffer.findUnique({ where: { id: requestId } });
      if (offer) return offer.requestHash === requestHash ? NextResponse.json({ offer }) : NextResponse.json({ error: "This submission was already saved with different terms." }, { status: 409 });
    }
    console.error("Billing offer creation failed", error);
    return NextResponse.json({ error: "Could not save the offer. Please try again." }, { status: 500 });
  }
}
export async function PATCH(req: NextRequest) {
  const admin = await adminAccount();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let id: string;
  let creatorId: string | undefined;
  try { const body = await req.json(); id = body.id; creatorId = body.creatorId; if (creatorId !== undefined && (typeof creatorId !== "string" || !creatorId)) throw new Error(); if (typeof id !== "string" || !id) throw new Error(); }
  catch { return NextResponse.json({ error: "Invalid offer" }, { status: 400 }); }
  try {
    const offer = await db.billingOffer.findUnique({ where: { id }, include: { recipients: true } });
    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    if (creatorId && (offer.audience !== "SELECTED" || !offer.recipients.some(r => r.creatorId === creatorId))) return NextResponse.json({ error: "This user is not a selected recipient of the offer" }, { status: 400 });
    await db.$transaction(async tx => {
      if (creatorId) {
        const changed = await tx.billingOfferRecipient.updateMany({ where: { offerId: id, creatorId, revokedAt: null }, data: { revokedAt: new Date(), revokedBy: admin.email } });
        if (changed.count) {
          if (offer.percent === 100) {
            await tx.billingOfferSubscription.updateMany({ where: { offerId: id, creatorId, status: "COMPLIMENTARY" }, data: { status: "REVOKED" } });
            await refreshComplimentaryGrantsForAccounts(tx, [creatorId]);
          }
          await queueOfferEmails(tx, offer, "STOPPED", [creatorId]);
        }
      } else {
        const changed = await tx.billingOffer.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date(), revokedBy: admin.email } });
        if (changed.count) {
          if (offer.percent === 100) await refreshComplimentaryGrantsForAccounts(tx, offer.recipients.map(r => r.creatorId));
          await queueOfferEmails(tx, offer, "STOPPED", offer.audience === "SELECTED" ? offer.recipients.filter(r => !r.revokedAt).map(r => r.creatorId) : undefined);
        }
      }
    }, { timeout: 30000, isolationLevel: "Serializable" });
    scheduleBenefitEmailDelivery(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Billing offer revocation failed", error);
    return NextResponse.json({ error: "Could not stop the offer. Try again." }, { status: 500 });
  }
}


export async function PUT(req: NextRequest) {
  const admin = await adminAccount();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body;
  try { body = await req.json(); if (typeof body.offerId !== "string" || !body.offerId) throw new Error(); }
  catch { return NextResponse.json({ error: "Invalid offer" }, { status: 400 }); }
  await db.billingBenefitNotification.updateMany({ where: { offerId: body.offerId, status: "FAILED" },
    data: { status: "PENDING", nextAttemptAt: new Date(), attempts: 0, lastError: null } });
  scheduleBenefitEmailDelivery(body.offerId);
  return NextResponse.json({ ok: true });
}
