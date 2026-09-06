import { apiGet } from "@/lib/apiClient";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await apiGet<any>("/api/novels/trending");
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
