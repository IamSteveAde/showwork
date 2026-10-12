// Packages the single restricted diagnostic without credentials, scheduled jobs,
// publishing workers, acknowledgement workers, or automatic telemetry loaders.
import fs from 'node:fs';
import { X509Certificate } from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const target = process.argv[2] || '/tmp/showwork-readonly-diagnostic-package';
const certificate = path.join(root, 'scripts/diagnostics/prod-ca-2021.crt');
if (!fs.existsSync(certificate)) throw new Error('Trusted Supabase CA certificate required before packaging the read-only diagnostic');
// Pinned after downloading from the HTTPS URL used by Supabase's official dashboard.
const ca = new X509Certificate(fs.readFileSync(certificate));
if (ca.fingerprint256 !== '80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA' || Date.now() < Date.parse(ca.validFrom) || Date.now() >= Date.parse(ca.validTo)) {
  throw new Error('Supabase CA identity or validity mismatch');
}
let cliRoot = path.dirname(fs.realpathSync(execFileSync('which', ['netlify'], { encoding: 'utf8' }).trim()));
while (!fs.existsSync(path.join(cliRoot, 'package.json')) || JSON.parse(fs.readFileSync(path.join(cliRoot, 'package.json'), 'utf8')).name !== 'netlify-cli') {
  const parent = path.dirname(cliRoot); if (parent === cliRoot) throw new Error('Netlify CLI installation not found'); cliRoot = parent;
}
const { zipFunction } = await import(pathToFileURL(path.join(cliRoot, 'node_modules/@netlify/zip-it-and-ship-it/dist/main.js')).href);
const archive = await zipFunction(path.join(root, 'scripts/diagnostics/publishing-runtime.ts'), target, {
  basePath: root,
  featureFlags: { zisi_add_instrumentation_loader: false },
  config: { 'publishing-runtime': { nodeBundler: 'esbuild', includedFiles: [
    'node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
    'scripts/diagnostics/prod-ca-2021.crt',
    '!node_modules/.prisma/client/libquery_engine-darwin.dylib.node',
  ] } },
});
console.log(JSON.stringify({ name: archive.name, path: archive.path, schedule: archive.schedule, credentialsIncluded: false, automaticTelemetryDisabled: true }));
