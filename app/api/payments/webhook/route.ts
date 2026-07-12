import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature, verifyTransaction } from "@/lib/paystack";

// Paystack calls this URL directly (server-to-server) when a transaction's
// status changes. Configure this URL in your Paystack dashboard under
// Settings → API Keys & Webhooks → Webhook URL:
//   https://yourproduct.com/api/payments/webhook
export async function POST(req: NextRequest) {
  // IMPORTANT: read the raw body text for signature verification —
  // req.json() would parse it first and break the exact-byte-match
  // that the HMAC signature depends on.
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("Paystack webhook: invalid signature, rejecting");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    const reference: string = event.data.reference;

    // Don't fully trust the webhook payload alone — re-verify directly
    // with Paystack's API before mutating anything. Cheap insurance
    // against a replayed or spoofed webhook slipping past signature checks.
    const verification = await verifyTransaction(reference);
    const isActuallySuccessful =
      verification?.data?.status === "success" &&
      verification?.data?.reference === reference;

    if (!isActuallySuccessful) {
      console.warn("Paystack webhook: verification mismatch for", reference);
      return NextResponse.json({ received: true });
    }

    const project = await db.project.findUnique({
      where: { paystackRef: reference },
    });

    if (project && !project.paid) {
      await db.project.update({
        where: { id: project.id },
        data: {
          paid: true,
          paidAt: new Date(),
          badgeVisible: false, // paying removes the Spotlite badge
        },
      });
    }
  }

  // Always respond 200 quickly so Paystack doesn't retry unnecessarily.
  return NextResponse.json({ received: true });
}
