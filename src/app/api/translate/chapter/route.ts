import { NextRequest, NextResponse } from "next/server";
import { translateToIndonesian } from "@/lib/groq";
import { supabase } from "@/lib/supabase";

export const maxDuration = 120;

/**
 * Extract teks bersih dari HTML chapter.
 * Hapus script, style, nav, header, footer — ambil hanya konten utama.
 */
function extractCleanText(html: string): string {
  // Hapus script, style, nav, header, footer, sidebar
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Cari konten utama: elemen entry-content, chapter-content, text-left, dll
  const contentPatterns = [
    /class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /class="[^"]*chapter-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /class="[^"]*text-left[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /class="[^"]*reading-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /class="[^"]*content-area[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
  ];

  let mainContent = "";
  for (const pattern of contentPatterns) {
    const match = clean.match(pattern);
    if (match && match[1].length > 200) {
      mainContent = match[1];
      break;
    }
  }

  // Fallback: gunakan body
  if (!mainContent) {
    const bodyMatch = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    mainContent = bodyMatch?.[1] || clean;
  }

  // HTML → plain text
  const text = mainContent
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

export async function POST(req: NextRequest) {
  try {
    const { novelId, chapterNumber, sourceUrl } = await req.json();

    if (!novelId || !chapterNumber || !sourceUrl) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // 1. Update status → translating
    await supabase.from("nu_chapter_content").upsert({
      novel_id: novelId,
      chapter_number: chapterNumber,
      source_url: sourceUrl,
      translation_status: "translating",
    }, { onConflict: "novel_id,chapter_number" });

    // 2. Fetch halaman chapter (langsung, tanpa ScraperAPI — translator sites umumnya tidak pakai CF)
    const resp = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      await supabase.from("nu_chapter_content")
        .update({ translation_status: "failed" })
        .eq("novel_id", novelId)
        .eq("chapter_number", chapterNumber);
      return NextResponse.json({ success: false, error: `Gagal fetch halaman: HTTP ${resp.status}` }, { status: 502 });
    }

    const html = await resp.text();

    // 3. Extract teks bersih
    const originalText = extractCleanText(html);
    if (originalText.length < 100) {
      await supabase.from("nu_chapter_content")
        .update({ translation_status: "failed", content_original: originalText })
        .eq("novel_id", novelId)
        .eq("chapter_number", chapterNumber);
      return NextResponse.json({ success: false, error: "Konten terlalu pendek — mungkin halaman salah atau ada proteksi" }, { status: 422 });
    }

    // 4. Terjemahkan via Groq
    const translatedText = await translateToIndonesian(originalText);
    if (!translatedText) {
      await supabase.from("nu_chapter_content")
        .update({ translation_status: "failed", content_original: originalText })
        .eq("novel_id", novelId)
        .eq("chapter_number", chapterNumber);
      return NextResponse.json({ success: false, error: "Groq translation gagal" }, { status: 502 });
    }

    // 5. Simpan ke database
    const wordCountOrig = originalText.split(/\s+/).length;
    const wordCountTrans = translatedText.split(/\s+/).length;

    await supabase.from("nu_chapter_content")
      .update({
        content_original: originalText,
        content_translated: translatedText,
        word_count_original: wordCountOrig,
        word_count_translated: wordCountTrans,
        translation_status: "done",
        translated_at: new Date().toISOString(),
      })
      .eq("novel_id", novelId)
      .eq("chapter_number", chapterNumber);

    return NextResponse.json({
      success: true,
      chapterNumber,
      wordCount: wordCountTrans,
      originalLength: originalText.length,
      translatedLength: translatedText.length,
    });

  } catch (error) {
    console.error("Translate error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
