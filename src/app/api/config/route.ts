import { NextRequest, NextResponse } from "next/server";
import { apiGet, apiPut } from "@/lib/apiClient";

export interface AppConfigResponse {
  data?: Record<string, unknown>;
  configs?: Array<{ key: string; value: string }>;
  [key: string]: unknown;
}

// GET — Fetch all config
export async function GET() {
  try {
    const config = await apiGet<AppConfigResponse>("/api/config");
    return NextResponse.json(config?.data || config);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengambil konfigurasi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT — Update config
export async function PUT(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const result = await apiPut<{ success: boolean; updated: number }>("/api/config", body);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui konfigurasi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
