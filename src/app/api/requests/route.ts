import { NextRequest, NextResponse } from "next/server";
import { apiGet, apiPatch, apiDelete } from "@/lib/apiClient";

// GET: Ambil daftar request terjemahan & statistik
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ALL";
    const search = searchParams.get("search") || "";
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "50";

    const data = await apiGet<{
      items: any[];
      pagination: any;
      counts: any;
    }>("/api/translation-requests", {
      status,
      search,
      page,
      limit,
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Update status request terjemahan
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "ID dan status wajib diisi" }, { status: 400 });
    }

    const data = await apiPatch<any>(`/api/translation-requests/${id}`, { status });
    return NextResponse.json({ success: true, item: data?.item || data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengupdate status request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Hapus request terjemahan
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID wajib disertakan" }, { status: 400 });
    }

    const res = await apiDelete<any>(`/api/translation-requests/${id}`);
    return NextResponse.json({ success: true, message: res?.message || "Berhasil dihapus" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
