import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: thread, error: threadErr } = await supabase
      .from("nu_forum_threads")
      .select("*, category:nu_forum_categories(id, name, slug)")
      .eq("id", id)
      .single();

    if (threadErr || !thread) {
      return NextResponse.json({ error: "Thread tidak ditemukan" }, { status: 404 });
    }

    // Get all posts / replies for this thread
    const { data: posts, error: postErr } = await supabase
      .from("nu_forum_posts")
      .select("*")
      .eq("thread_id", id)
      .order("created_at", { ascending: true });

    if (postErr) throw postErr;

    return NextResponse.json({
      id: thread.id,
      title: thread.title,
      content: thread.content,
      pinned: Boolean(thread.pinned),
      locked: Boolean(thread.locked),
      createdAt: thread.created_at,
      lastActivityAt: thread.last_activity_at,
      user: {
        id: thread.user_id,
        name: thread.user_name,
        avatarUrl: thread.user_avatar,
        role: thread.user_role,
      },
      category: thread.category,
      postCount: posts?.length || thread.post_count || 0,
      posts: (posts || []).map((p: any) => ({
        id: p.id,
        content: p.content,
        createdAt: p.created_at,
        user: {
          id: p.user_id,
          name: p.user_name || "Pembaca",
          avatarUrl: p.user_avatar || null,
          role: p.user_role || "USER",
        },
      })),
    });
  } catch (err: any) {
    console.error("Forum thread detail GET error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat detail thread" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: Record<string, any> = {};
    if ("pinned" in body) updateData.pinned = Boolean(body.pinned);
    if ("locked" in body) updateData.locked = Boolean(body.locked);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Tidak ada field untuk diupdate" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("nu_forum_threads")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Forum thread PATCH error:", err);
    return NextResponse.json({ error: err.message || "Gagal memperbarui thread" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete posts in thread first
    await supabase.from("nu_forum_posts").delete().eq("thread_id", id);

    const { error } = await supabase
      .from("nu_forum_threads")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("Forum thread DELETE error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus thread" }, { status: 500 });
  }
}
