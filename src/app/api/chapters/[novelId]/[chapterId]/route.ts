import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// PUT: Update chapter content (original or translated)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string; chapterId: string }> }
) {
  const { chapterId } = await params;
  const body = await req.json();

  const updates: Record<string, any> = {};

  if (body.content_original !== undefined) {
    updates.content_original = body.content_original;
    updates.word_count_original = body.content_original.split(/\s+/).filter(Boolean).length;
  }

  if (body.content_translated !== undefined) {
    updates.content_translated = body.content_translated;
    updates.word_count_translated = body.content_translated.split(/\s+/).filter(Boolean).length;
    updates.translation_status = body.content_translated.trim() ? "done" : "pending";
    if (body.content_translated.trim()) {
      updates.translated_at = new Date().toISOString();
    }
  }

  if (body.chapter_title !== undefined) {
    updates.chapter_title = body.chapter_title;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("nu_chapter_content")
    .update(updates)
    .eq("id", chapterId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, chapter: data });
}
