import { apiGet } from "@/lib/apiClient";
import { NextResponse } from "next/server";

// GET: Fetch all novels with translation stats (for Edit Novel page)
export async function GET() {
  try {
    const data = await apiGet<any>("/api/novels/all");
    const rawList: any[] = Array.isArray(data) ? data : (data?.novels || data?.data || []);

    const novels = rawList.map((n: any) => {
      const total = Number(n.total_with_content ?? n.total_chapters ?? n.totalChapters ?? 0);
      const translated = Number(n.translated_chapters ?? 0);
      let pending = n.pending_chapters !== undefined && n.pending_chapters !== null && Number(n.pending_chapters) > 0
        ? Number(n.pending_chapters)
        : Math.max(0, total - translated);

      return {
        id: n.id,
        title: n.title,
        nu_slug: n.nu_slug || n.nuSlug,
        cover_url: n.cover_url || n.coverUrl,
        total_chapters: Number(n.total_chapters ?? n.totalChapters ?? 0),
        rating: n.rating !== undefined && n.rating !== null ? Number(n.rating) : null,
        genres: Array.isArray(n.genres) ? n.genres : [],
        novel_type: n.novel_type || n.novelType || null,
        original_status: n.original_status || n.originalStatus || null,
        source: n.source || "general",
        status: n.status || "active",
        author: n.author || null,
        updated_at: n.updated_at || n.updatedAt || null,
        has_synopsis: Boolean(n.synopsis || n.has_synopsis || n.hasSynopsis),
        has_synopsis_translated: Boolean(n.synopsis_translated || n.synopsisTranslated || n.has_synopsis_translated || n.hasSynopsisTranslated),
        translated_chapters: translated,
        pending_chapters: pending,
        total_with_content: total,
      };
    });

    return NextResponse.json({ novels });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
