import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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

    // 1. Cek apakah novel ada di database dan SUDAH DI-BLACKLIST (Safety Rail Komiku)
    let query = supabase
      .from("nu_novels")
      .select("id, title, nu_slug, source, cover_r2_key, is_blacklisted");

    if (id) {
      query = query.eq("id", id);
    } else if (slug) {
      query = query.eq("nu_slug", slug);
    }

    const { data: novel, error: novelErr } = await query.maybeSingle();

    if (novelErr || !novel) {
      return NextResponse.json({ error: "Novel tidak ditemukan di database." }, { status: 404 });
    }

    // Pastikan status blacklist
    const { data: isBl } = await supabase
      .from("nu_blacklist")
      .select("id")
      .eq("nu_slug", novel.nu_slug)
      .maybeSingle();

    if (!novel.is_blacklisted && !isBl) {
      return NextResponse.json(
        { error: "Hanya bisa menghapus file RAW R2 untuk novel yang sudah masuk daftar Blacklist!" },
        { status: 400 }
      );
    }

    let deletedCount = 0;

    // 2. Hapus Cover spesifik jika ada cover_r2_key
    if (novel.cover_r2_key) {
      const ok = await deleteFileFromR2(novel.cover_r2_key);
      if (ok) deletedCount++;
    }

    // 3. Hapus kemungkinan prefix folder R2 (misal nu/covers/source/slug atau covers/slug)
    const prefixes = [
      `nu/covers/${novel.source || ""}/${novel.nu_slug}`,
      `nu/covers/${novel.nu_slug}`,
      `covers/${novel.nu_slug}`,
      `novels/${novel.nu_slug}`,
    ];

    for (const pfx of prefixes) {
      const res = await deletePrefixFromR2(pfx);
      deletedCount += res.deleted;
    }

    // 4. Hapus seluruh isi chapter di nu_chapter_content untuk menghemat kapasitas database
    const { data: deletedChapters } = await supabase
      .from("nu_chapter_content")
      .delete()
      .eq("novel_id", novel.id)
      .select("id");

    const chapterCountDeleted = deletedChapters?.length || 0;

    // 5. Update row DB nu_novels: kosongkan cover dan total_chapters=0
    // Baris data novel TETAP ADA di nu_novels & nu_blacklist sebagai penangkal agar scraper TIDAK mengambilnya lagi!
    await supabase
      .from("nu_novels")
      .update({
        cover_r2_key: null,
        total_chapters: 0,
        is_blacklisted: true,
        status: "dropped",
      })
      .eq("id", novel.id);

    return NextResponse.json({
      success: true,
      deletedR2: deletedCount,
      deletedChapters: chapterCountDeleted,
      title: novel.title,
      slug: novel.nu_slug,
      message: `Berhasil menghapus ${deletedCount} file R2 dan ${chapterCountDeleted} chapter DB untuk "${novel.title}". Judul novel tetap aman di Blacklist untuk mencegah scraper mengambil ulang.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus file RAW & Chapter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
