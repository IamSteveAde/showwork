/** @type {import('next').NextConfig} */
const nextConfig = {
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
export default nextConfig;
