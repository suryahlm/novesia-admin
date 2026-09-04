import { supabase } from "@/lib/supabase";
import { coverLandscapeKey, uploadBuffer, publicUrlFor, deleteFileFromR2 } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const formData = await req.formData();
    const file = (formData.get("cover") || formData.get("cover_landscape") || formData.get("file")) as File | null;

    if (!file) {
      return NextResponse.json({ error: "File cover landscape wajib diupload" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar (JPEG, PNG, WebP)" }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file terlalu besar (maksimal 10MB)" }, { status: 400 });
    }

    // Ambil data novel berdasarkan id atau nu_slug
    let query = supabase
      .from("nu_novels")
      .select("id, nu_slug, source, cover_landscape_r2_key")
      .eq("id", id)
      .maybeSingle();

    let { data: novel } = await query;
    if (!novel) {
      // Coba fallback via nu_slug
      const { data: novelBySlug } = await supabase
        .from("nu_novels")
        .select("id, nu_slug, source, cover_landscape_r2_key")
        .eq("nu_slug", id)
        .maybeSingle();
      novel = novelBySlug;
    }

    if (!novel) {
      return NextResponse.json({ error: "Novel tidak ditemukan" }, { status: 404 });
    }

    const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const ext = rawExt === "jpeg" ? "jpg" : rawExt;
    const r2Key = coverLandscapeKey(novel.source || "general", novel.nu_slug, ext);
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadBuffer(r2Key, buffer, file.type);
    const publicUrl = publicUrlFor(r2Key);

    // Hapus key lama jika nama/ekstensi berbeda
    const oldKey = novel.cover_landscape_r2_key;
    if (oldKey && oldKey !== r2Key) {
      deleteFileFromR2(oldKey).catch(() => {});
    }

    // Update database
    const { error: updateError } = await supabase
      .from("nu_novels")
      .update({
        cover_landscape_url: publicUrl,
        cover_landscape_r2_key: r2Key,
        updated_at: new Date().toISOString(),
      })
      .eq("id", novel.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      cover_landscape_url: publicUrl,
      cover_landscape_r2_key: r2Key,
    });
  } catch (err: any) {
    console.error("Cover landscape upload error:", err);
    return NextResponse.json({ error: err.message || "Gagal mengupload cover landscape" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Ambil novel
    let { data: novel } = await supabase
      .from("nu_novels")
      .select("id, cover_landscape_r2_key")
      .eq("id", id)
      .maybeSingle();

    if (!novel) {
      const { data: novelBySlug } = await supabase
        .from("nu_novels")
        .select("id, cover_landscape_r2_key")
        .eq("nu_slug", id)
        .maybeSingle();
      novel = novelBySlug;
    }

    if (!novel) {
      return NextResponse.json({ error: "Novel tidak ditemukan" }, { status: 404 });
    }

    if (novel.cover_landscape_r2_key) {
      await deleteFileFromR2(novel.cover_landscape_r2_key);
    }

    await supabase
      .from("nu_novels")
      .update({
        cover_landscape_url: null,
        cover_landscape_r2_key: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", novel.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
