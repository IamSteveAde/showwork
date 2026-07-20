/**
 * Validates a Nigerian phone number in international format:
 * +234 followed by exactly 10 digits (e.g. +2348012345678).
 * Not tied to specific carrier prefixes — just the overall shape —
 * so it doesn't reject valid numbers on newer/less common prefixes.
 */
export function isValidNigerianPhone(phone: string): boolean {
  return /^\+234\d{10}$/.test(phone.trim());
}

/**
 * Builds a WhatsApp "click to chat" link for a phone number. WhatsApp's
 * wa.me links take the number with no "+" or other punctuation — just
 * the country code and digits run together.
 */
export function whatsappLinkFor(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, "");
  return `https://wa.me/${digitsOnly}`;
}