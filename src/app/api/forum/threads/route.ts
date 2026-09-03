import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);
    const q = (searchParams.get("q") || "").trim();
    const categoryId = searchParams.get("categoryId") || "";

    const offset = (page - 1) * limit;

    let query = supabase
      .from("nu_forum_threads")
      .select("*, category:nu_forum_categories(id, name, slug)", { count: "exact" });

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (q) {
      query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%,user_name.ilike.%${q}%`);
    }

    const { data: rows, count: total, error } = await query
      .order("last_activity_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      total: total || 0,
      page,
      limit,
      rows: (rows || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        content: t.content,
        pinned: Boolean(t.pinned),
        locked: Boolean(t.locked),
        createdAt: t.created_at,
        lastActivityAt: t.last_activity_at || t.created_at,
        user: {
          id: t.user_id,
          name: t.user_name || "Pembaca",
          avatarUrl: t.user_avatar || null,
          role: t.user_role || "USER",
        },
        category: t.category || { name: "Umum", slug: "umum" },
        postCount: t.post_count || 0,
      })),
    });
  } catch (err: any) {
    console.error("Forum threads GET error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat thread forum" }, { status: 500 });
  }
}
