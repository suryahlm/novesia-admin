import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET: Fetch chapters for a novel
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string }> }
) {
  const { novelId } = await params;

  const { data, error } = await supabase
    .from("nu_chapter_content")
    .select("id, chapter_number, chapter_title, content_original, content_translated, word_count_original, word_count_translated, translation_status")
    .eq("novel_id", novelId)
    .order("chapter_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ chapters: data || [] });
}
