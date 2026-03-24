import { NextRequest, NextResponse } from "next/server";
import { scraperGet } from "@/lib/scraper";
import { parseNovelHtml } from "@/lib/parser";
import { uploadCoverToR2 } from "@/lib/r2";
import { supabase } from "@/lib/supabase";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { url } = await req.json();
    if (!url || !url.includes("novelupdates.com/series/")) {
      return NextResponse.json({ success: false, error: "URL tidak valid. Gunakan URL NovelUpdates." }, { status: 400 });
    }

    // 1. Fetch halaman via ScraperAPI
    const html = await scraperGet(url);
    if (!html) {
      return NextResponse.json({ success: false, error: "Gagal mengambil halaman (ScraperAPI error)" }, { status: 502 });
    }

    // 2. Parse metadata
    const info = parseNovelHtml(html, url);
    if (!info.postId || info.title === "Unknown Title") {
      // Log gagal
      await supabase.from("nu_scrape_log").insert({
        nu_slug: info.slug || "unknown",
        status: "failed",
        error_message: "Metadata tidak ditemukan (kemungkinan Cloudflare challenge)",
        duration_sec: (Date.now() - startTime) / 1000,
      });
      return NextResponse.json({ success: false, error: "Halaman tidak bisa di-parse" }, { status: 422 });
    }

    // 3. Cover: gunakan URL CDN NU langsung (tidak dilindungi CF)
    // R2 upload dilakukan sebagai backup saja
    let coverUrl = info.coverSrc || "";
    let r2Key = "";
    if (info.coverSrc) {
      try {
        const coverResp = await fetch(info.coverSrc, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0" },
        });
        if (coverResp.ok) {
          const buffer = Buffer.from(await coverResp.arrayBuffer());
          const filename = `${info.postId || info.slug}.jpg`;
          const upload = await uploadCoverToR2(buffer, filename);
          if (upload) {
            r2Key = upload.r2Key;
            // Tetap gunakan coverSrc (CDN NU) sebagai display URL
            // R2 hanya sebagai backup storage
          }
        }
      } catch (e) {
        console.warn("Cover backup to R2 error:", e);
      }
    }

    // 4. Upsert ke Supabase
    const { data: novelData, error: upsertError } = await supabase
      .from("nu_novels")
      .upsert({
        nu_slug: info.slug,
        nu_post_id: info.postId,
        title: info.title,
        synopsis: info.synopsis,
        cover_url: coverUrl || null,
        cover_r2_key: r2Key || null,
        total_chapters: info.totalChapters,
        novel_type: info.novelType || null,
        author: info.author || null,
        artist: info.artist || null,
        genres: info.genres,
        tags: info.tags,
        original_status: info.originalStatus || null,
        translation_status: info.translationStatus || null,
        rating: info.rating,
        year: info.year,
        associated_names: info.associatedNames,
        publisher: info.publisher || null,
        language: info.language || null,
      }, { onConflict: "nu_slug" })
      .select()
      .single();

    if (upsertError) {
      console.error("Supabase upsert error:", upsertError);
      return NextResponse.json({ success: false, error: `Database error: ${upsertError.message}` }, { status: 500 });
    }

    // 5. Log sukses
    const duration = (Date.now() - startTime) / 1000;
    await supabase.from("nu_scrape_log").insert({
      novel_id: novelData?.id,
      nu_slug: info.slug,
      status: "success",
      chapters_found: info.totalChapters,
      duration_sec: duration,
    });

    return NextResponse.json({
      success: true,
      title: info.title,
      slug: info.slug,
      genres: info.genres,
      rating: info.rating,
      totalChapters: info.totalChapters,
      coverUrl,
      author: info.author,
      novelType: info.novelType,
      duration,
    });

  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
