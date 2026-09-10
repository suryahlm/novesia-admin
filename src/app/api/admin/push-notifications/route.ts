import { NextRequest, NextResponse } from "next/server";
import { apiGet, apiPost, apiDelete } from "@/lib/apiClient";

interface PushDataResponse {
  logs: Array<{
    id: string;
    title: string;
    message: string;
    target: string;
    deepLinkSlug?: string | null;
    sentCount: number;
    createdAt: string;
  }>;
  totalDevices: number;
}

export async function GET() {
  try {
    const data = await apiGet<PushDataResponse>("/api/admin/push-notifications");
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil data push notifikasi";
    console.error("[Admin API] Push Notifications GET error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await apiPost("/api/admin/push-notifications", body);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengirim push notifikasi";
    console.error("[Admin API] Push Notifications POST error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const endpoint = id ? `/api/admin/push-notifications?id=${encodeURIComponent(id)}` : "/api/admin/push-notifications";
    const data = await apiDelete(endpoint);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus riwayat push notifikasi";
    console.error("[Admin API] Push Notifications DELETE error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
