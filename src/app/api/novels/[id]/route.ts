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

  // Chapters cascade-delete via FK
  const { error } = await supabase.from("nu_novels").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
