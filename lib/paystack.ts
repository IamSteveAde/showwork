import crypto from "crypto";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE_URL = "https://api.paystack.co";

// Flat ₦5,000 per project. Paystack amounts are in kobo (smallest unit),
// so ₦5,000 = 500,000 kobo.
export const PROJECT_PRICE_NGN = 5000;
export const PROJECT_PRICE_KOBO = PROJECT_PRICE_NGN * 100;

interface InitializeTransactionParams {
  email: string;       // the creator's email — Paystack requires this
  reference: string;   // a unique reference we generate, tied to the project
  callbackUrl: string; // where Paystack redirects after payment
  metadata?: Record<string, unknown>;
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

/**
 * Starts a Paystack transaction. Call this from your /api/payments/initialize
 * route, then redirect the creator's browser to `authorization_url`.
 */
export async function initializeTransaction({
  email,
  reference,
  callbackUrl,
  metadata,
}: InitializeTransactionParams): Promise<PaystackInitializeResponse> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: PROJECT_PRICE_KOBO,
      reference,
      callback_url: callbackUrl,
      currency: "NGN",
      metadata,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Paystack initialize failed: ${errText}`);
  }

  return res.json();
}

/**
 * Verifies that a webhook request actually came from Paystack, not
 * an attacker forging a "payment succeeded" call to your endpoint.
 * Paystack signs every webhook body with your secret key using HMAC-SHA512,
 * sent in the `x-paystack-signature` header.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;

  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  return hash === signatureHeader;
}

/**
 * Optional but recommended: re-confirm a transaction directly with Paystack's
 * API (rather than trusting the webhook payload alone) before marking a
 * project as paid. Cheap insurance against a spoofed or replayed webhook.
 */
export async function verifyTransaction(reference: string) {
  const res = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    }
  );
  if (!res.ok) {
    throw new Error(`Paystack verify failed: ${await res.text()}`);
  }
  return res.json();
}
