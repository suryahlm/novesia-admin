import { NextRequest, NextResponse } from "next/server";
import { apiGet, apiPut } from "@/lib/apiClient";

// GET — Fetch all config
export async function GET() {
  try {
    const config = await apiGet<any>("/api/config");
    return NextResponse.json(config?.data || config);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — Update config
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await apiPut<any>("/api/config", body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
