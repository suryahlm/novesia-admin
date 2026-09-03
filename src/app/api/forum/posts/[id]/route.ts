import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find thread_id first to decrement post_count
    const { data: post } = await supabase
      .from("nu_forum_posts")
      .select("thread_id")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("nu_forum_posts")
      .delete()
      .eq("id", id);

    if (error) throw error;

    if (post?.thread_id) {
      // Recalculate post_count for thread
      const { count } = await supabase
        .from("nu_forum_posts")
        .select("*", { count: "exact", head: true })
        .eq("thread_id", post.thread_id);

      await supabase
        .from("nu_forum_threads")
        .update({ post_count: count || 0 })
        .eq("id", post.thread_id);
    }

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("Forum post DELETE error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus balasan" }, { status: 500 });
  }
}
