import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);
    const q = (searchParams.get("q") || "").trim();
    const role = searchParams.get("role") || "ALL";
    const banned = searchParams.get("banned") || "ALL";
    const frozen = searchParams.get("frozen") || "ALL";

    const offset = (page - 1) * limit;

    // Base query for filtered rows
    let query = supabase.from("nu_users").select("*", { count: "exact" });

    if (q) {
      query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
    }
    if (role && role !== "ALL") {
      query = query.eq("role", role);
    }
    if (banned === "true") {
      query = query.eq("banned", true);
    } else if (banned === "false") {
      query = query.eq("banned", false);
    }
    if (frozen === "true") {
      query = query.eq("frozen", true);
    } else if (frozen === "false") {
      query = query.eq("frozen", false);
    }

    const { data: rows, count: total, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Grand total (semua user tanpa filter)
    const { count: grandTotal } = await supabase
      .from("nu_users")
      .select("*", { count: "exact", head: true });

    // User baru 7 hari terakhir
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: newLast7Days } = await supabase
      .from("nu_users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    return NextResponse.json({
      total: total || 0,
      grandTotal: grandTotal || 0,
      newLast7Days: newLast7Days || 0,
      page,
      limit,
      rows: rows || [],
    });
  } catch (err: any) {
    console.error("Users list API error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat data pengguna" }, { status: 500 });
  }
}
