import { apiGet, apiPatch } from "@/lib/apiClient";
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

    // Ambil data novel
    const novel = await apiGet<any>(`/api/novels/${id}`);

    if (!novel) {
      return NextResponse.json({ error: "Novel tidak ditemukan" }, { status: 404 });
    }

    const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const ext = rawExt === "jpeg" ? "jpg" : rawExt;
    const sourcePrefix = novel.source || "general";
    const slug = novel.nu_slug || novel.nuSlug;
    const r2Key = coverLandscapeKey(sourcePrefix, slug, ext);
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadBuffer(r2Key, buffer, file.type);
    const publicUrl = publicUrlFor(r2Key);

    // Hapus key lama jika nama/ekstensi berbeda
    const oldKey = novel.cover_landscape_r2_key || novel.coverLandscapeR2Key;
    if (oldKey && oldKey !== r2Key) {
      deleteFileFromR2(oldKey).catch(() => {});
    }

    // Update database
    await apiPatch(`/api/novels/${novel.id || id}`, {
      cover_landscape_url: publicUrl,
      cover_landscape_r2_key: r2Key,
    });

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
    const novel = await apiGet<any>(`/api/novels/${id}`);

    if (!novel) {
      return NextResponse.json({ error: "Novel tidak ditemukan" }, { status: 404 });
    }

    const oldKey = novel.cover_landscape_r2_key || novel.coverLandscapeR2Key;
    if (oldKey) {
      await deleteFileFromR2(oldKey);
    }

    await apiPatch(`/api/novels/${novel.id || id}`, {
      cover_landscape_url: null,
      cover_landscape_r2_key: null,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Cover landscape delete error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
