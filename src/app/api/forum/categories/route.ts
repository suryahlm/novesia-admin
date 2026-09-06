import { NextRequest, NextResponse } from "next/server";
import { apiGet, apiPost } from "@/lib/apiClient";

export async function GET() {
  try {
    const categories = await apiGet<any[]>("/api/forum/categories");
    return NextResponse.json(categories || []);
  } catch (err: any) {
    console.error("Forum categories GET error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat kategori forum" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await apiPost("/api/forum/categories", body);
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("Forum category POST error:", err);
    return NextResponse.json({ error: err.message || "Gagal membuat kategori" }, { status: 500 });
  }
}
