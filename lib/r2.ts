import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 is S3-compatible, so the standard AWS SDK works against it —
// you just point it at R2's endpoint instead of AWS's.
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  // R2 doesn't support the AWS SDK's newer default checksum behavior —
  // without this, presigned PUT uploads fail with 403 Forbidden.
  requestChecksumCalculation: "WHEN_REQUIRED",
  // R2 expects path-style addressing (endpoint/bucket/key), not the
  // virtual-hosted-style (bucket.endpoint/key) the AWS SDK defaults to.
  forcePathStyle: true,
});

const BUCKET = process.env.R2_BUCKET_NAME!;

// Allowed upload types — keeps randoms from uploading arbitrary files
// to your bucket via a stolen/guessed presigned URL.
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
];

export function isAllowedContentType(contentType: string) {
  return ALLOWED_TYPES.includes(contentType);
}

/**
 * Generates a signed URL the browser can PUT a file to directly — the file
 * bytes never pass through your Next.js server. 30 minutes gives a large
 * (up to ~2GB) video enough time to finish uploading even on a slow
 * connection, rather than the signature expiring mid-upload.
 */
export async function getPresignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2, command, { expiresIn: 1800 });
}

/**
 * Public URL for a file once uploaded. Assumes the bucket is connected to a
 * public R2.dev URL or a custom domain — set R2_PUBLIC_URL accordingly, e.g.
 * "https://media.yourproduct.com" or the default
 * "https://pub-xxxxxx.r2.dev"
 */
export function publicUrlFor(key: string) {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

/**
 * Builds the storage key/path for a piece of media within a project.
 * Keeping this in one place avoids path mismatches between upload and read.
 */
export function buildMediaKey(projectId: string, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  return `projects/${projectId}/${Date.now()}-${safeName}`;
}

/**
 * Deletes a file from the bucket. Used when a creator uploads a revised
 * version — the old file is no longer referenced by anything, so we
 * clean it up rather than leaving it as dead storage.
 */
export async function deleteObject(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }));
}