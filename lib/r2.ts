import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
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
// to your bucket via a stolen/guessed presigned URL. Covers all four
// upload categories the product supports: images, videos, PDFs, and
// Word documents.
const ALLOWED_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  // Videos
  "video/mp4",
  "video/quicktime", // .mov
  "video/webm",
  // Documents
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

export function isAllowedContentType(contentType: string) {
  return ALLOWED_TYPES.includes(contentType);
}

/**
 * Generates a signed URL the browser can PUT a file to directly — the file
 * bytes never pass through your Next.js server. Only usable for files up
 * to R2's own hard ceiling for a single-part PUT (~5.37GB) — anything
 * larger has to go through the multipart functions below instead, since
 * R2 will reject a single PUT above that regardless of what this URL says.
 * 8 hours gives even a large file real headroom to finish on a slow
 * connection — a 5GB file at ~2Mbps upload can genuinely take hours.
 */
export async function getPresignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2, command, { expiresIn: 28800 }); // 8 hours
}

// ─────────────────────────────────────────────
// MULTIPART UPLOAD — R2's real mechanism for files beyond what a
// single PUT can handle. A file gets split into chunks client-side;
// each chunk is uploaded independently via its own presigned URL, and
// a final "complete" call stitches every chunk into one real object.
// The genuine benefit beyond raw size support: if one chunk fails
// partway through a 10GB upload, only that chunk (not the whole file)
// needs retrying.
// ─────────────────────────────────────────────

/**
 * Starts a multipart upload session. Returns an uploadId that ties
 * every subsequent part, and the final completion call, back to this
 * same in-progress file — nothing is a real, readable object in the
 * bucket until completeMultipartUpload is called.
 */
export async function createMultipartUpload(key: string, contentType: string): Promise<string> {
  const command = new CreateMultipartUploadCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const result = await r2.send(command);
  if (!result.UploadId) throw new Error("R2 did not return an upload ID");
  return result.UploadId;
}

/**
 * A signed URL for exactly one chunk of a multipart upload — the
 * browser PUTs that specific chunk's bytes directly to this URL, the
 * same way a whole small file does via getPresignedUploadUrl above.
 * partNumber must be 1-indexed (R2/S3 convention, not 0-indexed) and
 * match whatever's later reported back in completeMultipartUpload.
 */
export async function getPresignedPartUploadUrl(
  key: string,
  uploadId: string,
  partNumber: number
): Promise<string> {
  const command = new UploadPartCommand({
    Bucket: BUCKET,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  return getSignedUrl(r2, command, { expiresIn: 28800 }); // 8 hours, same as the single-part URL
}

/**
 * Stitches every uploaded chunk into the final, real object. Each
 * part's ETag (returned by R2 the moment that specific chunk's PUT
 * succeeds — the browser needs to hold onto these) has to be reported
 * back here in the correct part-number order. This call is what
 * actually makes the file exist as one complete, readable object —
 * before this, it's just a pile of separate uploaded chunks R2 hasn't
 * assembled into anything yet.
 */
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[]
): Promise<void> {
  const command = new CompleteMultipartUploadCommand({
    Bucket: BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts
        .sort((a, b) => a.partNumber - b.partNumber)
        .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
    },
  });
  await r2.send(command);
}

/**
 * Cancels an in-progress multipart upload and tells R2 to discard
 * whatever chunks were already uploaded. Without ever calling this on
 * a genuinely abandoned upload, those partial chunks sit in the
 * bucket as billed, invisible dead storage forever — they were never
 * "completed" into a real object, so nothing in your normal delete
 * logic (which only ever knows about finished Media rows) would ever
 * find or clean them up.
 */
export async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  const command = new AbortMultipartUploadCommand({
    Bucket: BUCKET,
    Key: key,
    UploadId: uploadId,
  });
  await r2.send(command);
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