import { NextRequest, NextResponse } from "next/server";
import { apiPost } from "@/lib/apiClient";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await apiPost<any>("/api/users/bulk", body);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("User bulk action error:", err);
    return NextResponse.json({ error: err.message || "Gagal memproses aksi massal" }, { status: 500 });
  }
}
