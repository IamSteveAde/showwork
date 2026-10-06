import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";
import { refreshComplimentaryGrantsForAccounts } from "@/lib/complimentaryGrants";
import { queueOfferEmails, scheduleBenefitEmailDelivery } from "@/lib/billingBenefitNotifications";

// Stop only this user's complimentary grants; other recipients and paid plans retain their terms.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentCreator();
  if (!admin || !isAdminEmail(admin.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let requestId: string;
  try { const body = await req.json(); requestId = body.requestId; if (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(requestId)) throw new Error(); }
  catch { return NextResponse.json({ error: "Invalid submission identifier" }, { status: 400 }); }
  try {
    const result = await db.$transaction(async tx => {
      const creator = await tx.creator.findUnique({ where: { id } });
      if (!creator) return null;
      const grants = await tx.billingOfferSubscription.findMany({ where: { creatorId: id, status: "COMPLIMENTARY", discountEndsAt: { gt: new Date() }, offer: { revokedAt: null } }, include: { offer: true } });
      const offers = [...new Map(grants.filter(g => g.offer).map(g => [g.offerId!, g.offer!])).values()];
      for (const offer of offers) {
        await tx.billingOfferRecipient.updateMany({ where: { offerId: offer.id, creatorId: id, revokedAt: null }, data: { revokedAt: new Date(), revokedBy: admin.email } });
        await queueOfferEmails(tx, offer, "STOPPED", [id]);
      }
      await tx.billingOfferSubscription.updateMany({ where: { creatorId: id, status: "COMPLIMENTARY" }, data: { status: "REVOKED" } });
      if (creator.isComped) {
        await tx.creator.update({ where: { id }, data: { isComped: false, compedUntil: null } });
        if (!creator.compedUntil || creator.compedUntil > new Date()) await tx.billingBenefitNotification.createMany({ data: [{
          id: `legacy-stop:${id}:${requestId}`, creatorId: id, event: "STOPPED", payload: {
            to: creator.email, name: creator.name, title: "Complimentary Content Workspace access", event: "STOPPED", product: "CONTENT_WORKSPACE", workspacePlan: "STUDIO", deliveryTier: null,
            percent: 100, durationMonths: 1, billingCycle: null, availableUntil: null, endsAt: null,
          },
        }], skipDuplicates: true });
      }
      await refreshComplimentaryGrantsForAccounts(tx, [id]);
      return { stopped: grants.length, legacyStopped: creator.isComped };
    }, { isolationLevel: "Serializable", timeout: 30000 });
    if (!result) return NextResponse.json({ error: "User not found" }, { status: 404 });
    scheduleBenefitEmailDelivery();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const conflict = (error as { code?: string }).code === "P2034";
    return NextResponse.json({ error: conflict ? "The user's benefits changed. Refresh and try again." : "Could not stop complimentary access. Try again." }, { status: conflict ? 409 : 500 });
  }
}
