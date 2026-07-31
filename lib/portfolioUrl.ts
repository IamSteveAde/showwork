/**
 * Builds a portfolio's public subdomain URL — e.g.
 * https://spotlite-africa.useshowwork.com in production, or
 * http://spotlite-africa.localhost:3000 in local dev — from whatever
 * NEXT_PUBLIC_APP_URL is already set to, so it never needs a second
 * environment variable to stay in sync with.
 */
export function portfolioUrl(slug: string): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? "https://useshowwork.com").replace(/\/+$/, "");
  const match = raw.match(/^(https?:\/\/)(.+)$/);
  const protocol = match?.[1] ?? "https://";
  const hostAndPort = match?.[2] ?? "useshowwork.com";
  return `${protocol}${slug}.${hostAndPort}`;
}