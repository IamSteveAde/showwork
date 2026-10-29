const { createReadStream, createWriteStream, existsSync } = require('node:fs');
const { mkdir, stat, rm } = require('node:fs/promises');
const { join } = require('node:path');
const { createGzip } = require('node:zlib');
const { pipeline } = require('node:stream/promises');
const { execSync } = require('node:child_process');

async function packageMediaBinaries(root = process.cwd(), platform = process.platform, arch = process.arch) {
  const directory = join(root, '.media-bin');
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const suffix = platform === 'win32' ? '.exe' : '';
  const binaries = {
    ffprobe: join(root, 'node_modules', 'ffprobe-static', 'bin', platform, arch, `ffprobe${suffix}`),
    ffmpeg: join(root, 'node_modules', 'ffmpeg-static', `ffmpeg${suffix}`),
  };

  // If ffmpeg binary is not yet downloaded, run its install script automatically
  if (!existsSync(binaries.ffmpeg)) {
    const installScript = join(root, 'node_modules', 'ffmpeg-static', 'install.js');
    if (existsSync(installScript)) {
      console.log('ffmpeg binary not found. Running ffmpeg-static install.js to download binary...');
      try {
        execSync(`node "${installScript}"`, { stdio: 'inherit' });
      } catch (err) {
        console.warn('Failed to auto-download ffmpeg binary:', err.message);
      }
    }
  }

  for (const [name, source] of Object.entries(binaries)) {
    if (!existsSync(source)) {
      console.warn(`[packageMediaBinaries] Warning: ${name} binary not found at ${source}. Skipping packaging for ${name}.`);
      continue;
    }
    const target = join(directory, `${name}-${platform}-${arch}.gz`);
    await pipeline(createReadStream(source), createGzip({ level: 9 }), createWriteStream(target));
    const original = (await stat(source)).size, compressed = (await stat(target)).size;
    console.log(`${name}: ${(original / 1024 ** 2).toFixed(1)} MB → ${(compressed / 1024 ** 2).toFixed(1)} MB`);
  }
}
module.exports = { packageMediaBinaries };
if (require.main === module) packageMediaBinaries().catch(error => { console.error(error.message); process.exitCode = 1; });

