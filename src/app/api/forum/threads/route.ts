import { NextRequest, NextResponse } from "next/server";
import { apiGet } from "@/lib/apiClient";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);
    const q = (searchParams.get("q") || "").trim();
    const categoryId = searchParams.get("categoryId") || "";

    const data = await apiGet<any>("/api/forum/threads", { page, limit, q, categoryId });

    return NextResponse.json({
      total: data?.total || 0,
      page: data?.page || page,
      limit: data?.limit || limit,
      rows: (data?.rows || data?.threads || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        content: t.content,
        pinned: Boolean(t.pinned),
        locked: Boolean(t.locked),
        createdAt: t.createdAt || t.created_at,
        lastActivityAt: t.lastActivityAt || t.last_activity_at || t.createdAt || t.created_at,
        user: t.user || {
          id: t.userId || t.user_id,
          name: t.userName || t.user_name || "Pembaca",
          avatarUrl: t.userAvatar || t.user_avatar || null,
          role: t.userRole || t.user_role || "USER",
        },
        category: t.category || { name: "Umum", slug: "umum" },
        postCount: t.postCount ?? t.post_count ?? 0,
      })),
    });
  } catch (err: any) {
    console.error("Forum threads GET error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat thread forum" }, { status: 500 });
  }
}
