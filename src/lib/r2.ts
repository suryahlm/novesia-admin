import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://cdn.novesia.cc";

export function publicUrlFor(key: string): string {
  const base = PUBLIC_URL.replace(/\/$/, "");
  return `${base}/${key.replace(/^\//, "")}`;
}

export function adKey(id: string, ext: string): string {
  return `ads/${id}/creative.${ext}`;
}

export function bannerKey(slot: number, ext: string): string {
  return `banners/slot-${slot}/banner.${ext}`;
}

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  json: "application/json",
  txt: "text/plain",
};

export function contentTypeFor(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() || "";
  return CONTENT_TYPES[ext] || "application/octet-stream";
}

/**
 * Upload buffer langsung ke R2
 */
export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType?: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType || contentTypeFor(key),
      CacheControl: "public, max-age=31536000",
    })
  );
  return key;
}

/**
 * Upload cover image ke Cloudflare R2 (kompatibilitas kode lama)
 */
export async function uploadCoverToR2(
  imageBuffer: Buffer,
  filename: string,
  prefix?: string
): Promise<{ r2Key: string; publicUrl: string } | null> {
  const r2Key = prefix ? `${prefix}/${filename}` : filename;
  try {
    await uploadBuffer(r2Key, imageBuffer, "image/jpeg");
    return { r2Key, publicUrl: publicUrlFor(r2Key) };
  } catch (err) {
    console.error("R2 upload error:", err);
    return null;
  }
}

/**
 * Presign GET URL untuk preview/unduh
 */
export async function presignGet(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    s3 as any,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }) as any,
    { expiresIn }
  );
}

/**
 * List folders & objects under prefix (1 level dengan delimiter '/')
 */
export async function listObjects(
  prefix = "",
  continuationToken?: string,
  maxKeys = 200
) {
  const input: any = {
    Bucket: BUCKET,
    Prefix: prefix || "",
    Delimiter: "/",
    MaxKeys: maxKeys,
  };
  if (continuationToken) {
    input.ContinuationToken = continuationToken;
  }

  const out = await s3.send(new ListObjectsV2Command(input));
  return {
    folders: (out.CommonPrefixes || []).map((p) => p.Prefix || "").filter(Boolean),
    objects: (out.Contents || [])
      .map((o) => ({
        key: o.Key || "",
        size: o.Size || 0,
        lastModified: o.LastModified?.toISOString() || new Date().toISOString(),
      }))
      .filter((o) => o.key !== prefix), // filter placeholder folder
    isTruncated: Boolean(out.IsTruncated),
    nextToken: out.NextContinuationToken,
  };
}

/**
 * Hapus single file dari Cloudflare R2.
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

/**
 * Hapus multi objects (batch DeleteObjectsCommand maks 1000)
 */
export async function deleteObjects(keys: string[]): Promise<{ deleted: number; errors: any[] }> {
  if (!keys.length) return { deleted: 0, errors: [] };
  let deleted = 0;
  const errors: any[] = [];

  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    try {
      const out = await s3.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: { Objects: batch.map((k) => ({ Key: k })) },
        })
      );
      deleted += (out.Deleted || []).length;
      if (out.Errors && out.Errors.length > 0) {
        errors.push(...out.Errors);
      }
    } catch (e: any) {
      errors.push(e);
    }
  }

  return { deleted, errors };
}

/**
 * List SEMUA key di bawah prefix (rekursif, tanpa delimiter)
 */
export async function listAllKeysUnderPrefix(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined = undefined;
  do {
    const out: any = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      })
    );
    (out.Contents || []).forEach((o: any) => {
      if (o.Key) keys.push(o.Key);
    });
    token = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

/**
 * Hapus semua objek di bawah prefix tertentu dari Cloudflare R2.
 */
export async function deletePrefixFromR2(prefix: string): Promise<{ deleted: number }> {
  try {
    const keys = await listAllKeysUnderPrefix(prefix);
    if (keys.length === 0) return { deleted: 0 };
    const res = await deleteObjects(keys);
    return { deleted: res.deleted };
  } catch (err) {
    console.error("R2 delete prefix error:", err);
    return { deleted: 0 };
  }
}
