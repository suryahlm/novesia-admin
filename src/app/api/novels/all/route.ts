import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET: Fetch all novels (for Edit Novel page)
export async function GET() {
  const { data, error } = await supabase
    .from("nu_novels")
    .select("id, title, nu_slug, cover_url, total_chapters, rating, genres, novel_type, original_status, source, status, author, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ novels: data || [] });
}
