import { NextRequest, NextResponse } from "next/server";
import { apiPost } from "@/lib/apiClient";

// POST: Bulk update novels
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await apiPost<any>("/api/novels/bulk", body);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
