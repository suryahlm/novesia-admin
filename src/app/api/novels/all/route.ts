import { apiGet } from "@/lib/apiClient";
import { NextResponse } from "next/server";

// GET: Fetch all novels with translation stats (for Edit Novel page)
export async function GET() {
  try {
    const data = await apiGet<any>("/api/novels/all");
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
