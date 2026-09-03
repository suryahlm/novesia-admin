import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET: Cari novel untuk dimasukkan ke blacklist
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!q.trim()) {
      return NextResponse.json({ novels: [] });
    }

    const { data: novels, error } = await supabase
      .from("nu_novels")
      .select("id, title, nu_slug, source, cover_url, total_chapters, status, original_status, is_blacklisted, created_at")
      .or(`title.ilike.%${q.trim()}%,nu_slug.ilike.%${q.trim()}%`)
      .order("total_chapters", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ novels: novels || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan pencarian";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
