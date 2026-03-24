import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/novels/ongoing — ambil semua novel yang belum tamat
 */
export async function GET() {
  const { data, error } = await supabase
    .from("nu_novels")
    .select("id, title, nu_slug, cover_url, total_chapters, original_status, rating, genres, updated_at, source")
    .order("title", { ascending: true });

  if (error) {
    return NextResponse.json({ novels: [] }, { status: 500 });
  }

  // Filter: novel yang statusnya BUKAN "Completed" 
  // (ongoing, hiatus, atau status lainnya termasuk yang null)
  const ongoing = (data || []).filter((n) => {
    const status = (n.original_status || "").toLowerCase();
    return !status.includes("completed");
  });

  return NextResponse.json({ novels: ongoing });
}
