const { createReadStream, createWriteStream } = require('node:fs');
const { mkdir, stat, rm } = require('node:fs/promises');
const { join } = require('node:path');
const { createGzip } = require('node:zlib');
const { pipeline } = require('node:stream/promises');

async function packageMediaBinaries(root = process.cwd(), platform = process.platform, arch = process.arch) {
  const directory = join(root, '.media-bin');
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const suffix = platform === 'win32' ? '.exe' : '';
  const binaries = {
    ffprobe: join(root, 'node_modules', 'ffprobe-static', 'bin', platform, arch, `ffprobe${suffix}`),
    ffmpeg: join(root, 'node_modules', 'ffmpeg-static', `ffmpeg${suffix}`),
  };
  for (const [name, source] of Object.entries(binaries)) {
    const target = join(directory, `${name}-${platform}-${arch}.gz`);
    await pipeline(createReadStream(source), createGzip({ level: 9 }), createWriteStream(target));
    const original = (await stat(source)).size, compressed = (await stat(target)).size;
    console.log(`${name}: ${(original / 1024 ** 2).toFixed(1)} MB → ${(compressed / 1024 ** 2).toFixed(1)} MB`);
  }
}
module.exports = { packageMediaBinaries };
if (require.main === module) packageMediaBinaries().catch(error => { console.error(error.message); process.exitCode = 1; });
