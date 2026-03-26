import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// PUT: Update novel metadata
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const allowedFields = [
    "title", "synopsis", "genres", "tags", "author", "status",
    "original_status", "language", "rating", "cover_url", "cover_r2_key"
  ];

  const updates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("nu_novels")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, novel: data });
}

// DELETE: Delete novel and all its chapters
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Get novel data to check for R2 cover
  const { data: novel } = await supabase
    .from("nu_novels")
    .select("cover_r2_key")
    .eq("id", id)
    .single();

  // 2. Delete from R2 if key exists
  if (novel?.cover_r2_key) {
    const { deleteFileFromR2 } = await import("@/lib/r2");
    await deleteFileFromR2(novel.cover_r2_key);
  }

  // 3. Delete from Supabase (Chapters cascade-delete via FK)
  const { error } = await supabase.from("nu_novels").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
