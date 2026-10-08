import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node"],
    "/api/calendars/*/posts/*/publish": ["./node_modules/ffprobe-static/bin/linux/x64/ffprobe"],
  },
  outputFileTracingExcludes: {
    "/**": ["./node_modules/.prisma/client/libquery_engine-darwin.dylib.node"],
  },
  webpack(config, { isServer }) {
    config.output.environment = { ...config.output.environment, asyncFunction: true };
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    if (!isServer) config.resolve.fallback = { ...config.resolve.fallback, fs: false, crypto: false, module: false, url: false };
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
    ],
  },
  // pdfkit reads its own font data files (Helvetica.afm, etc.) from disk
  // at runtime via fs.readFileSync. If webpack bundles it, those data
  // files don't get copied alongside the bundle and the paths break —
  // this tells Next.js to load pdfkit directly from node_modules
  // instead, where its data files actually live.
  serverExternalPackages: ["pdfkit"],
};
export default (phase) => ({
  ...nextConfig,
  // Keep production builds from overwriting a running dev server's assets.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
});
