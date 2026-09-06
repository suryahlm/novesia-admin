import { NextResponse } from "next/server";
import { apiGet } from "@/lib/apiClient";

export async function GET() {
  try {
    const banners = await apiGet<any[]>("/api/banners", { all: true });

    return NextResponse.json(
      (banners || []).map((b: any) => ({
        id: b.id,
        slot: b.slot,
        title: b.title,
        imageKey: b.imageKey || b.image_key,
        imageUrl: b.imageUrl || b.image_url,
        targetUrl: b.targetUrl || b.target_url,
        active: Boolean(b.active),
        startAt: b.startAt || b.start_at,
        expiresAt: b.expiresAt || b.expires_at,
        createdAt: b.createdAt || b.created_at,
        updatedAt: b.updatedAt || b.updated_at,
      }))
    );
  } catch (err: any) {
    console.error("Banners GET error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat banner beranda" }, { status: 500 });
  }
}
