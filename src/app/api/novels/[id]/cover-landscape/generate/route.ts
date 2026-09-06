import { NextRequest, NextResponse } from "next/server";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { coverLandscapeKey, uploadBuffer, publicUrlFor, deleteFileFromR2 } from "@/lib/r2";
import { generateLandscapeFromPortrait } from "@/lib/landscape-generator";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Cari novel via apiClient
    const novel = await apiGet<any>(`/api/novels/${id}`);

    if (!novel) {
      return NextResponse.json({ error: "Novel tidak ditemukan" }, { status: 404 });
    }

    const coverUrl = novel.cover_url || novel.coverUrl;

    // 2. Pastikan novel memiliki cover portrait sebagai sumber pelebaran
    if (!coverUrl || typeof coverUrl !== "string" || !coverUrl.trim()) {
      return NextResponse.json(
        {
          error: `Novel "${novel.title}" belum memiliki cover portrait. Cover portrait dibutuhkan untuk dilebarkan ke landscape.`,
        },
        { status: 400 }
      );
    }

    // Baca custom prompt jika ada di body
    let customPrompt: string | undefined;
    try {
      const body = await req.json();
      if (body?.prompt && typeof body.prompt === "string" && body.prompt.trim()) {
        customPrompt = body.prompt.trim();
      }
    } catch {}

    // 3. Generate cover landscape (800x500 WebP ~40-80KB) dengan AI Outpainting
    const landscapeBuffer = await generateLandscapeFromPortrait(coverUrl, {
      title: novel.title,
      genres: novel.genres || [],
      customPrompt,
    });

    // 4. Upload ke Cloudflare R2
    const sourcePrefix = novel.source || "general";
    const slug = novel.nu_slug || novel.nuSlug;
    const r2Key = coverLandscapeKey(sourcePrefix, slug, "webp");
    await uploadBuffer(r2Key, landscapeBuffer, "image/webp");

    const finalPublicUrl = `${publicUrlFor(r2Key)}?t=${Date.now()}`;

    // 5. Bersihkan file R2 landscape lama jika key berbeda (misal sebelumnya .jpg)
    const oldKey = novel.cover_landscape_r2_key || novel.coverLandscapeR2Key;
    if (oldKey && oldKey !== r2Key) {
      deleteFileFromR2(oldKey).catch(() => {});
    }

    // 6. Update database via apiClient
    await apiPatch(`/api/novels/${novel.id || id}`, {
      cover_landscape_url: finalPublicUrl,
      cover_landscape_r2_key: r2Key,
    });

    return NextResponse.json({
      success: true,
      cover_landscape_url: finalPublicUrl,
      cover_landscape_r2_key: r2Key,
      title: novel.title,
      size_kb: Math.round(landscapeBuffer.length / 1024),
    });
  } catch (err: any) {
    console.error("Generate landscape cover error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal men-generate cover landscape" },
      { status: 500 }
    );
  }
}
