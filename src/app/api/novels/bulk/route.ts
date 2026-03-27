import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// DELETE: Bulk delete novels by IDs
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const ids: string[] = body.ids;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "IDs array is required" }, { status: 400 });
  }

  // 1. Get all novels to clean up R2 covers
  const { data: novels } = await supabase
    .from("nu_novels")
    .select("id, cover_r2_key")
    .in("id", ids);

  // 2. Delete covers from R2
  if (novels && novels.length > 0) {
    const { deleteFileFromR2 } = await import("@/lib/r2");
    for (const novel of novels) {
      if (novel.cover_r2_key) {
        try {
          await deleteFileFromR2(novel.cover_r2_key);
        } catch (e) {
          // Continue even if R2 delete fails
          console.error(`Failed to delete R2 cover for ${novel.id}:`, e);
        }
      }
    }
  }

  // 3. Delete chapter content first (if not cascade)
  await supabase.from("nu_chapter_content").delete().in("novel_id", ids);

  // 4. Delete chapters
  await supabase.from("nu_chapters").delete().in("novel_id", ids);

  // 5. Delete novels
  const { error } = await supabase.from("nu_novels").delete().in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, deleted: ids.length });
}
