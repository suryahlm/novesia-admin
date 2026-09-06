import { NextResponse } from "next/server";
import { apiGet } from "@/lib/apiClient";

// GET /api/novels/ongoing — ambil semua novel yang belum tamat
export async function GET() {
  try {
    const data = await apiGet<any>("/api/novels/ongoing");
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ novels: [] }, { status: 500 });
  }
}
