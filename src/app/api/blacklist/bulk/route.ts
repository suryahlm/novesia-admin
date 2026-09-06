import { NextRequest, NextResponse } from "next/server";
import { apiPost } from "@/lib/apiClient";

// POST: Blacklist massal (misal: novel-novel mati yang terdeteksi)
export async function POST(req: NextRequest) {
  try {
    const { novels, reason = "Novel mati / stagnan lama di sumber asli" } = await req.json();

    if (!Array.isArray(novels) || novels.length === 0) {
      return NextResponse.json({ error: "Daftar novel kosong." }, { status: 400 });
    }

    const data = await apiPost<any>("/api/blacklist/bulk", { novels, reason });

    return NextResponse.json({
      success: true,
      count: data?.count || novels.length,
      message: data?.message || `Berhasil menambahkan ${novels.length} novel ke daftar blacklist.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal blacklist massal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
