import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET: Fetch all novels (for Edit Novel page) with translation stats
export async function GET() {
  const { data, error } = await supabase
    .from("nu_novels")
    .select("id, title, nu_slug, cover_url, total_chapters, rating, genres, novel_type, original_status, source, status, author, updated_at, synopsis, synopsis_translated")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const novels = data || [];

  // Batch-fetch translation stats for all novels
  // Get counts of chapters with content_original and content_translated
  if (novels.length > 0) {
    const novelIds = novels.map((n) => n.id);

    // Get all chapter counts in one query (chapters with content_original)
    const { data: chapterStats } = await supabase
      .from("nu_chapter_content")
      .select("novel_id, content_original, content_translated, translation_status")
      .in("novel_id", novelIds);

    // Build stats map
    const statsMap: Record<string, { total_with_content: number; translated: number; pending: number }> = {};
    for (const ch of chapterStats || []) {
      if (!statsMap[ch.novel_id]) {
        statsMap[ch.novel_id] = { total_with_content: 0, translated: 0, pending: 0 };
      }
      const hasOriginal = !!ch.content_original?.trim();
      const hasTranslated = !!ch.content_translated?.trim();

      if (hasOriginal) {
        statsMap[ch.novel_id].total_with_content++;
        if (hasTranslated || ch.translation_status === "done") {
          statsMap[ch.novel_id].translated++;
        } else {
          statsMap[ch.novel_id].pending++;
        }
      }
    }

    // Enrich novels with stats (strip full synopsis text to save bandwidth)
    const enriched = novels.map((n) => {
      const stats = statsMap[n.id] || { total_with_content: 0, translated: 0, pending: 0 };
      return {
        ...n,
        synopsis: undefined, // Don't send full text to list page
        has_synopsis: !!n.synopsis?.trim(),
        has_synopsis_translated: !!n.synopsis_translated?.trim(),
        synopsis_translated: undefined, // Don't send full text
        translated_chapters: stats.translated,
        pending_chapters: stats.pending,
        total_with_content: stats.total_with_content,
      };
    });

    return NextResponse.json({ novels: enriched });
  }

  return NextResponse.json({ novels: [] });
}
