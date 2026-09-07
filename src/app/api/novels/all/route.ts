import { apiGet } from "@/lib/apiClient";
import { NextResponse } from "next/server";

// GET: Fetch all novels with translation stats (for Edit Novel page)
export async function GET() {
  try {
    const data = await apiGet<any>("/api/novels/all");
    const rawList: any[] = Array.isArray(data) ? data : (data?.novels || data?.data || []);

    const novels = rawList.map((n: any) => ({
      ...n,
      has_synopsis: Boolean(n.synopsis || n.has_synopsis),
      has_synopsis_translated: Boolean(n.synopsis_translated || n.synopsisTranslated || n.has_synopsis_translated),
      translated_chapters: n.translated_chapters ?? 0,
      pending_chapters: n.pending_chapters ?? 0,
      total_with_content: n.total_with_content ?? n.total_chapters ?? n.totalChapters ?? 0,
    }));

    return NextResponse.json({ novels });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
