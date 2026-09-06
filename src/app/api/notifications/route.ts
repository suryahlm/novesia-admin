import { NextRequest, NextResponse } from "next/server";
import { apiGet, apiPost } from "@/lib/apiClient";

// GET — list all notifications
export async function GET() {
  try {
    const data = await apiGet<any[]>("/api/notifications/all");
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: error.message || "Gagal mengambil notifikasi" }, { status: 500 });
  }
}

// POST — create new notification (auto-deactivate previous)
export async function POST(req: NextRequest) {
  try {
    const { title, message, type, target } = await req.json();

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Judul dan pesan wajib diisi" }, { status: 400 });
    }

    // Validate target: "all" | "web" | "app"
    const validTarget = ["all", "web", "app"].includes(target) ? target : "all";

    const data = await apiPost("/api/notifications", {
      title: title.trim(),
      message: message.trim(),
      type: type || "info",
      target: validTarget,
      is_active: true,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Notifications POST error:", error);
    return NextResponse.json({ error: error.message || "Gagal membuat notifikasi" }, { status: 500 });
  }
}
