import { NextRequest, NextResponse } from "next/server";
import { apiGet, apiPost, apiDelete } from "@/lib/apiClient";

// GET: Ambil daftar blacklist (novel atau chapter)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "novel";
    const q = searchParams.get("q") || "";

    const data = await apiGet<{ items: any[] }>("/api/blacklist", { type, q });
    return NextResponse.json({ items: data?.items || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Tambahkan novel atau chapter ke blacklist
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      novel_id,
      nu_slug,
      title,
      source,
      reason,
      type = "novel",
      chapter_number,
    } = body;

    if (!nu_slug || !title) {
      return NextResponse.json(
        { error: "Slug dan judul novel wajib diisi." },
        { status: 400 }
      );
    }

    const data = await apiPost<any>("/api/blacklist", {
      novel_id,
      nu_slug,
      title,
      source,
      reason,
      type,
      chapter_number,
    });

    return NextResponse.json({ success: true, item: data?.item || data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menambah blacklist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Hapus dari blacklist (Un-blacklist)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const novel_id = searchParams.get("novel_id");
    const nu_slug = searchParams.get("nu_slug");
    const type = searchParams.get("type") || "novel";

    if (!id && !novel_id && !nu_slug) {
      return NextResponse.json(
        { error: "ID, novel_id, atau nu_slug diperlukan." },
        { status: 400 }
      );
    }

    const queryParams = new URLSearchParams();
    if (id) queryParams.set("id", id);
    if (novel_id) queryParams.set("novel_id", novel_id);
    if (nu_slug) queryParams.set("nu_slug", nu_slug);
    if (type) queryParams.set("type", type);

    const res = await apiDelete<any>(`/api/blacklist?${queryParams.toString()}`);
    return NextResponse.json({ success: true, message: res?.message || "Berhasil dihapus dari blacklist" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus blacklist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
