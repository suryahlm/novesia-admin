import { NextRequest, NextResponse } from "next/server";
import { apiGet, apiPost } from "@/lib/apiClient";

// GET: Ambil daftar request novel baru & statistik
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ALL";
    const search = searchParams.get("search") || searchParams.get("q") || "";
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "50";

    const data = await apiGet<{
      items: any[];
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
      counts: {
        total: number;
        pending: number;
        in_progress: number;
        approved: number;
        rejected: number;
      };
    }>("/api/novel-requests", {
      status,
      q: search,
      page,
      limit,
    });

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[novel-requests API] GET Error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Gagal memuat data request novel" },
      { status: 500 }
    );
  }
}

// POST: Buat request novel baru dari admin (opsional)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await apiPost("/api/novel-requests", body);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[novel-requests API] POST Error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Gagal membuat request novel" },
      { status: 500 }
    );
  }
}
