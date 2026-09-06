import { NextRequest, NextResponse } from "next/server";
import { apiGet } from "@/lib/apiClient";

// GET: Cari novel untuk dimasukkan ke blacklist
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!q.trim()) {
      return NextResponse.json({ novels: [] });
    }

    const data = await apiGet<any>("/api/novels", { q: q.trim(), limit });
    const novels = (data?.novels || data?.data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      nu_slug: n.nuSlug || n.nu_slug,
      source: n.source,
      cover_url: n.coverUrl || n.cover_url,
      total_chapters: n.totalChapters || n.total_chapters,
      status: n.status,
      original_status: n.originalStatus || n.original_status,
      is_blacklisted: n.isBlacklisted || n.is_blacklisted,
      created_at: n.createdAt || n.created_at,
    }));

    return NextResponse.json({ novels });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan pencarian";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
