import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAIN = "useshowwork.com";

/**
 * Subdomain-based portfolio routing. A visit to
 * spotlite-africa.useshowwork.com should show exactly what
 * useshowwork.com/p/spotlite-africa shows — this rewrites the request
 * internally to that route without changing what's in the address
 * bar. The root domain itself, www, and normal localhost dev traffic
 * are left completely alone.
 *
 * Local dev note: modern browsers resolve *.localhost to 127.0.0.1
 * automatically (no hosts-file editing needed), so
 * spotlite-africa.localhost:3000 works the same way locally as the
 * real subdomain does in production.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0]; // strip the port for local dev

  const isRootDomain = hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`;
  const isPlainLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  if (isRootDomain || isPlainLocalhost) {
    return NextResponse.next();
  }

  let subdomain: string | null = null;
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    subdomain = hostname.slice(0, -(ROOT_DOMAIN.length + 1));
  } else if (hostname.endsWith(".localhost")) {
    subdomain = hostname.slice(0, -".localhost".length);
  }

  if (subdomain) {
    const url = req.nextUrl.clone();
    url.pathname = `/portfolio/${subdomain}${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next's internals, API routes, and static files — only real
  // page requests need the subdomain check.
  matcher: ["/((?!_next|api|favicon.ico|images).*)"],
};