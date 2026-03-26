import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

/**
 * Upload cover image ke Cloudflare R2.
 * Return { r2Key, publicUrl } atau null jika gagal.
 */
export async function uploadCoverToR2(
  imageBuffer: Buffer,
  filename: string
): Promise<{ r2Key: string; publicUrl: string } | null> {
  const r2Key = `nu/covers/${filename}`;
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: r2Key,
        Body: imageBuffer,
        ContentType: "image/jpeg",
        CacheControl: "public, max-age=31536000",
      })
    );
    return { r2Key, publicUrl: `${PUBLIC_URL}/${r2Key}` };
  } catch (err) {
    console.error("R2 upload error:", err);
    return null;
  }
}

/**
 * Hapus objek dari Cloudflare R2.
 */
export async function deleteFileFromR2(r2Key: string): Promise<boolean> {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: r2Key,
      })
    );
    return true;
  } catch (err) {
    console.error("R2 delete error:", err);
    return false;
  }
}
