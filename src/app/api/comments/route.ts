import { NextRequest, NextResponse } from "next/server";
import { apiGet } from "@/lib/apiClient";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);
    const q = (searchParams.get("q") || "").trim();

    const data = await apiGet<any>("/api/comments", { page, limit, q });

    return NextResponse.json({
      total: data?.total || 0,
      page: data?.page || page,
      limit: data?.limit || limit,
      rows: data?.rows || data?.comments || [],
    });
  } catch (err: any) {
    console.error("Comments list error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat komentar" }, { status: 500 });
  }
}
