/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
    ],
    unoptimized: true,
  },
  // pdfkit reads its own font data files (Helvetica.afm, etc.) from disk
  // at runtime via fs.readFileSync. If webpack bundles it, those data
  // files don't get copied alongside the bundle and the paths break —
  // this tells Next.js to load pdfkit directly from node_modules
  // instead, where its data files actually live.
  serverExternalPackages: ["pdfkit"],
};
export default nextConfig;