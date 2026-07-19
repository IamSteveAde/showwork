import crypto from "crypto";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE_URL = "https://api.paystack.co";

// Flat ₦5,000 per project. Paystack amounts are in kobo (smallest unit),
// so ₦5,000 = 500,000 kobo.
export const PROJECT_PRICE_NGN = 5000;
export const PROJECT_PRICE_KOBO = PROJECT_PRICE_NGN * 100;

// Explicit whitelist of payment methods shown at checkout. Paystack's
// OPay option has been causing a stuck "please close this page"
// dead-end for customers on mobile (a known app-switch + browser
// redirect issue, not specific to this integration). OPay isn't a
// documented standalone channel type — it's shown either under "bank"
// or "mobile_money" depending on Paystack's current checkout version —
// so rather than guess which one to exclude, we whitelist only the
// channels we actually want. Anything not listed here simply won't
// appear as an option.
const ALLOWED_CHANNELS = ["card", "bank_transfer", "ussd", "qr"];

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
      channels: ALLOWED_CHANNELS,
      metadata,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Paystack initialize failed: ${errText}`);
  }

  return res.json();
}

// ─────────────────────────────────────────────
// SUBSCRIPTIONS
// ─────────────────────────────────────────────
// Each tier's plan is created once, manually, in the Paystack dashboard —
// not something the app creates repeatedly. Their codes are stored as
// env vars and looked up via lib/subscriptionTiers.ts.

/**
 * Starts a subscription checkout for a specific tier's plan. Passing
 * `plan` determines what actually gets charged (the plan's own
 * configured price) — but Paystack's API still requires a valid,
 * non-zero `amount` field to be present for the request to validate at
 * all, even though it isn't what the customer ends up being charged.
 */
export async function initializeSubscription({
  email,
  reference,
  callbackUrl,
  planCode,
  amount,
}: {
  email: string;
  reference: string;
  callbackUrl: string;
  planCode: string;
  amount: number;
}): Promise<PaystackInitializeResponse> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount,
      reference,
      callback_url: callbackUrl,
      currency: "NGN",
      channels: ALLOWED_CHANNELS,
      plan: planCode,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Paystack subscription initialize failed: ${errText}`);
  }

  return res.json();
}

/**
 * Creates a new Paystack Plan on the fly. Used specifically for
 * discounts — Paystack's recurring billing charges whatever a plan's
 * own configured price is, so giving one specific creator (or everyone,
 * for a platform-wide discount) a genuinely discounted recurring price
 * means creating a real plan at that discounted amount rather than just
 * showing a different number on screen.
 */
export async function createPlan({
  name,
  amountNgn,
}: {
  name: string;
  amountNgn: number;
}): Promise<{ status: boolean; data: { plan_code: string } }> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/plan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      amount: amountNgn * 100,
      interval: "monthly",
      currency: "NGN",
    }),
  });

  if (!res.ok) {
    throw new Error(`Paystack create plan failed: ${await res.text()}`);
  }

  return res.json();
}
 /* fallback right after checkout — the webhook is the normal path for
 * getting subscription_code/email_token, but webhooks can't reach
 * localhost during local development, and can occasionally be delayed
 * even in production. This lets us confirm and store everything
 * immediately instead of waiting.
 */
export async function fetchCustomerSubscriptions(customerCode: string) {
  const res = await fetch(`${PAYSTACK_BASE_URL}/subscription?customer=${encodeURIComponent(customerCode)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`Paystack fetch subscriptions failed: ${await res.text()}`);
  }
  return res.json();
}

/**
 * Cancels a subscription. Requires both the subscription_code and the
 * email_token Paystack returned when the subscription was created —
 * both get saved on the Creator row from the `subscription.create`
 * webhook, specifically so this can be called later without needing to
 * look anything up from Paystack first.
 */
export async function cancelSubscription(subscriptionCode: string, emailToken: string) {
  const res = await fetch(`${PAYSTACK_BASE_URL}/subscription/disable`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
  });

  if (!res.ok) {
    throw new Error(`Paystack cancel subscription failed: ${await res.text()}`);
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