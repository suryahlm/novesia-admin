import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { coverLandscapeKey, uploadBuffer, publicUrlFor, deleteFileFromR2 } from "@/lib/r2";
import { generateLandscapeFromPortrait } from "@/lib/landscape-generator";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Cari novel berdasarkan UUID atau slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase
      .from("nu_novels")
      .select("id, title, nu_slug, source, genres, cover_url, cover_landscape_r2_key")
      .eq(isUuid ? "id" : "nu_slug", id)
      .maybeSingle();

    let { data: novel, error: fetchError } = await query;

    if (!novel && isUuid) {
      // Coba fallback dengan slug
      const { data: novelBySlug } = await supabase
        .from("nu_novels")
        .select("id, title, nu_slug, source, genres, cover_url, cover_landscape_r2_key")
        .eq("nu_slug", id)
        .maybeSingle();
      novel = novelBySlug;
    }

    if (fetchError || !novel) {
      return NextResponse.json({ error: "Novel tidak ditemukan" }, { status: 404 });
    }

    // 2. Pastikan novel memiliki cover portrait sebagai sumber pelebaran
    if (!novel.cover_url || typeof novel.cover_url !== "string" || !novel.cover_url.trim()) {
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
    const landscapeBuffer = await generateLandscapeFromPortrait(novel.cover_url, {
      title: novel.title,
      genres: novel.genres || [],
      customPrompt,
    });

    // 4. Upload ke Cloudflare R2
    const r2Key = coverLandscapeKey(novel.source || "general", novel.nu_slug, "webp");
    await uploadBuffer(r2Key, landscapeBuffer, "image/webp");

    const finalPublicUrl = `${publicUrlFor(r2Key)}?t=${Date.now()}`;

    // 5. Bersihkan file R2 landscape lama jika key berbeda (misal sebelumnya .jpg)
    const oldKey = novel.cover_landscape_r2_key;
    if (oldKey && oldKey !== r2Key) {
      deleteFileFromR2(oldKey).catch(() => {});
    }

    // 6. Update database
    const { error: updateError } = await supabase
      .from("nu_novels")
      .update({
        cover_landscape_url: finalPublicUrl,
        cover_landscape_r2_key: r2Key,
        updated_at: new Date().toISOString(),
      })
      .eq("id", novel.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

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
