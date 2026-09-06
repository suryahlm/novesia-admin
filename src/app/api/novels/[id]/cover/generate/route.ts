import { NextRequest, NextResponse } from "next/server";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { uploadCoverToR2 } from "@/lib/r2";
import { generateCoverImageBuffer, buildNovelCoverPrompt } from "@/lib/cloudflare-image";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const customPrompt = body?.prompt;

    // 1. Fetch novel data from API
    const novel = await apiGet<any>(`/api/novels/${id}`);

    if (!novel) {
      return NextResponse.json({ error: "Novel tidak ditemukan." }, { status: 404 });
    }

    // 2. Build Light Novel Aesthetic Prompt
    let finalPrompt = customPrompt;
    if (!finalPrompt || typeof finalPrompt !== "string" || !finalPrompt.trim()) {
      finalPrompt = await buildNovelCoverPrompt(
        novel.title,
        novel.genres || [],
        novel.synopsis || ""
      );
    }

    // 3. Generate Image Buffer using FLUX
    const imageBuffer = await generateCoverImageBuffer(finalPrompt, 512, 680);

    // 4. Upload to Cloudflare R2
    const sourcePrefix = novel.source || "general";
    const slug = novel.nu_slug || novel.nuSlug;
    const filename = `${sourcePrefix}/${slug}/cover.jpg`;
    const result = await uploadCoverToR2(imageBuffer, filename);

    if (!result) {
      return NextResponse.json({ error: "Gagal mengunggah cover hasil AI ke Cloudflare R2." }, { status: 500 });
    }

    const finalPublicUrl = `${result.publicUrl}?t=${Date.now()}`;

    // 5. Update DB via apiClient
    await apiPatch(`/api/novels/${novel.id || id}`, {
      cover_url: finalPublicUrl,
      cover_r2_key: result.r2Key,
    });

    return NextResponse.json({
      success: true,
      cover_url: finalPublicUrl,
      cover_r2_key: result.r2Key,
      prompt: finalPrompt,
    });

  } catch (err: any) {
    console.error("Cover generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal generate cover AI." },
      { status: 500 }
    );
  }
}
