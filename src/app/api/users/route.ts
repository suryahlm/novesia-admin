import { NextRequest, NextResponse } from "next/server";
import { apiGet } from "@/lib/apiClient";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);
    const q = (searchParams.get("q") || "").trim();
    const role = searchParams.get("role") || "ALL";
    const banned = searchParams.get("banned") || "ALL";
    const frozen = searchParams.get("frozen") || "ALL";
    const platform = (searchParams.get("platform") || "ALL").toUpperCase();

    const data = await apiGet<any>("/api/users", {
      page,
      limit,
      q,
      role: role !== "ALL" ? role : undefined,
      banned: banned !== "ALL" ? banned : undefined,
      frozen: frozen !== "ALL" ? frozen : undefined,
      platform,
    });

    return NextResponse.json({
      total: data?.total || 0,
      grandTotal: data?.grandTotal || data?.total || 0,
      totalWeb: data?.totalWeb || 0,
      totalApp: data?.totalApp || 0,
      newLast7Days: data?.newLast7Days || 0,
      page: data?.page || page,
      limit: data?.limit || limit,
      rows: data?.rows || data?.users || [],
    });
  } catch (err: any) {
    console.error("Users list API error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat data pengguna" }, { status: 500 });
  }
}
