import { NextRequest, NextResponse } from "next/server";
import { apiGet, apiPatch, apiDelete } from "@/lib/apiClient";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const data = await apiGet<{ thread: any; posts: any[] }>(`/api/forum/threads/${id}`);
    const thread = data?.thread;
    const posts = data?.posts || [];

    if (!thread) {
      return NextResponse.json({ error: "Thread tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      id: thread.id,
      title: thread.title,
      content: thread.content,
      pinned: Boolean(thread.pinned),
      locked: Boolean(thread.locked),
      createdAt: thread.createdAt || thread.created_at,
      lastActivityAt: thread.lastActivityAt || thread.last_activity_at,
      user: {
        id: thread.userId || thread.user_id,
        name: thread.userName || thread.user_name,
        avatarUrl: thread.userAvatar || thread.user_avatar,
        role: thread.userRole || thread.user_role,
      },
      category: {
        id: thread.categoryId || thread.category_id,
        name: thread.category_name,
        slug: thread.category_slug,
      },
      postCount: posts.length || thread.postCount || thread.post_count || 0,
      posts: posts.map((p: any) => ({
        id: p.id,
        content: p.content,
        createdAt: p.createdAt || p.created_at,
        user: {
          id: p.userId || p.user_id,
          name: p.userName || p.user_name || "Pembaca",
          avatarUrl: p.userAvatar || p.user_avatar || null,
          role: p.userRole || p.user_role || "USER",
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

    const data = await apiPatch(`/api/forum/threads/${id}`, updateData);
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
    await apiDelete(`/api/forum/threads/${id}`);
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("Forum thread DELETE error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus thread" }, { status: 500 });
  }
}
