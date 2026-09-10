import { NextRequest, NextResponse } from "next/server";
import { apiGet, apiPost, apiDelete } from "@/lib/apiClient";

export async function GET() {
  try {
    const data = await apiGet<{ templates: unknown[] }>("/api/admin/push-notifications/templates");
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil template notifikasi";
    console.error("[Admin API] Push Templates GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await apiPost("/api/admin/push-notifications/templates", body);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan template notifikasi";
    console.error("[Admin API] Push Templates POST error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID template wajib diisi" }, { status: 400 });
    }
    const data = await apiDelete(`/api/admin/push-notifications/templates/${encodeURIComponent(id)}`);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus template notifikasi";
    console.error("[Admin API] Push Templates DELETE error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
