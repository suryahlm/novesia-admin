import { NextRequest, NextResponse } from "next/server";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { deleteFileFromR2, deletePrefixFromR2 } from "@/lib/r2";

// DELETE: Hapus file RAW R2 (Cover / Assets) milik novel yang di-blacklist
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const id = searchParams.get("id");

    if (!slug && !id) {
      return NextResponse.json({ error: "Slug atau ID novel diperlukan." }, { status: 400 });
    }

    // 1. Cek apakah novel ada di database
    const novel = await apiGet<any>(`/api/novels/${encodeURIComponent(slug || id || "")}`).catch(() => null);

    if (!novel) {
      return NextResponse.json({ error: "Novel tidak ditemukan di database." }, { status: 404 });
    }

    // Pastikan status blacklist
    const nuSlug = novel.nuSlug || novel.nu_slug;
    const isBlData = await apiGet<any>("/api/blacklist", { q: nuSlug }).catch(() => ({ items: [] }));
    const isBl = (isBlData?.items || []).some((b: any) => (b.nuSlug || b.nu_slug) === nuSlug);

    if (!novel.isBlacklisted && !novel.is_blacklisted && !isBl) {
      return NextResponse.json(
        { error: "Hanya bisa menghapus file RAW R2 untuk novel yang sudah masuk daftar Blacklist!" },
        { status: 400 }
      );
    }

    let deletedCount = 0;

    // 2. Hapus Cover spesifik jika ada cover_r2_key
    const coverR2Key = novel.coverR2Key || novel.cover_r2_key;
    if (coverR2Key) {
      const ok = await deleteFileFromR2(coverR2Key);
      if (ok) deletedCount++;
    }

    // 3. Hapus kemungkinan prefix folder R2
    const prefixes = [
      `nu/covers/${novel.source || ""}/${nuSlug}`,
      `nu/covers/${nuSlug}`,
      `covers/${nuSlug}`,
      `novels/${nuSlug}`,
    ];

    for (const pfx of prefixes) {
      const res = await deletePrefixFromR2(pfx);
      deletedCount += res.deleted;
    }

    // 4. Update row DB novel: kosongkan cover dan total_chapters=0
    await apiPatch(`/api/novels/${novel.id}`, {
      cover_r2_key: null,
      total_chapters: 0,
      is_blacklisted: true,
      status: "dropped",
    });

    return NextResponse.json({
      success: true,
      deletedR2: deletedCount,
      title: novel.title,
      slug: nuSlug,
      message: `Berhasil menghapus ${deletedCount} file R2 untuk "${novel.title}". Judul novel tetap aman di Blacklist untuk mencegah scraper mengambil ulang.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus file RAW & Chapter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
