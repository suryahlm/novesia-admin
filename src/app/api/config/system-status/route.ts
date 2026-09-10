import { NextResponse } from "next/server";
import { apiGet } from "@/lib/apiClient";

export interface SystemStatusResponse {
  firebase: {
    projectId: string;
    serviceAccountConfigured: boolean;
    ready: boolean;
  };
  stats: {
    totalPushTokens: number;
    totalUsers: number;
    totalNovels: number;
    lastBroadcastAt: string | null;
  };
}

// GET — Fetch system and Firebase integration status
export async function GET() {
  try {
    const status = await apiGet<SystemStatusResponse>("/api/config/system-status");
    return NextResponse.json(status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengambil status sistem";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
