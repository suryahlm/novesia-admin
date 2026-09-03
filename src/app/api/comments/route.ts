import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);
    const q = (searchParams.get("q") || "").trim();

    const offset = (page - 1) * limit;

    let query = supabase
      .from("nu_comments")
      .select("*, novel:nu_novels(id, title, nu_slug)", { count: "exact" });

    if (q) {
      query = query.or(`content.ilike.%${q}%,user_name.ilike.%${q}%,user_email.ilike.%${q}%`);
    }

    const { data: rows, count: total, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      total: total || 0,
      page,
      limit,
      rows: rows || [],
    });
  } catch (err: any) {
    console.error("Comments list error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat komentar" }, { status: 500 });
  }
}
