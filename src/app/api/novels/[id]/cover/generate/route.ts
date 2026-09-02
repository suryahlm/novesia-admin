import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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

    // 1. Fetch novel data from DB
    const { data: novel, error: fetchError } = await supabase
      .from("nu_novels")
      .select("id, title, nu_slug, source, genres, synopsis, author")
      .eq("id", id)
      .single();

    if (fetchError || !novel) {
      return NextResponse.json({ error: "Novel tidak ditemukan." }, { status: 404 });
    }

    // 2. Build Light Novel Aesthetic Prompt (Custom or AI-generated via Gemini 3.7 Flash)
    let finalPrompt = customPrompt;
    if (!finalPrompt || typeof finalPrompt !== "string" || !finalPrompt.trim()) {
      finalPrompt = await buildNovelCoverPrompt(
        novel.title,
        novel.genres || [],
        novel.synopsis || ""
      );
    }

    // 3. Generate Image Buffer using FLUX (512 x 680 - Hemat Token & Ukuran Ringan untuk App)
    const imageBuffer = await generateCoverImageBuffer(finalPrompt, 512, 680);

    // 4. Upload to Cloudflare R2
    const sourcePrefix = novel.source || "novelworld";
    const filename = `${sourcePrefix}/${novel.nu_slug}/cover.jpg`;
    const result = await uploadCoverToR2(imageBuffer, filename);

    if (!result) {
      return NextResponse.json({ error: "Gagal mengunggah cover hasil AI ke Cloudflare R2." }, { status: 500 });
    }

    const finalPublicUrl = `${result.publicUrl}?t=${Date.now()}`;

    // 5. Update DB
    const { error: updateError } = await supabase
      .from("nu_novels")
      .update({
        cover_url: finalPublicUrl,
        cover_r2_key: result.r2Key,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

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
