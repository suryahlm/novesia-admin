import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { data: novels, error } = await supabase
      .from("nu_novels")
      .select("id, title, nu_slug, cover_url, cover_landscape_url, rating, total_chapters, source, status, genres, author, updated_at")
      .eq("is_blacklisted", false)
      .in("status", ["active", "completed", "ongoing", "published"])
      .gt("total_chapters", 0)
      .order("rating", { ascending: false, nullsFirst: false })
      .order("total_chapters", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = novels || [];
    const withLandscape = items.filter((n) => Boolean(n.cover_landscape_url)).length;

    return NextResponse.json({
      novels: items,
      total: items.length,
      withLandscape,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
