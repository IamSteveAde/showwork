import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  forcePathStyle: true,
});

try {
  const result = await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: "test-upload.txt",
    Body: "hello from spotlite presenter test",
    ContentType: "text/plain",
  }));
  console.log("SUCCESS:", result);
} catch (err) {
  console.error("FAILED:", err);
}
