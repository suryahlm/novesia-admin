import { NextResponse } from "next/server";
import { apiGet } from "@/lib/apiClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configData = await apiGet<any>("/api/config/web_trending_ads").catch(() => null);

    let items: any[] = [];
    if (configData?.data) {
      items = Array.isArray(configData.data) ? configData.data : [];
    } else if (configData?.value) {
      try {
        const parsed = JSON.parse(configData.value);
        items = Array.isArray(parsed) ? parsed : [];
      } catch {
        items = [];
      }
    }

    const formatted = items.map((b: any) => ({
      id: b.id || `ad-slot-${b.slot}`,
      slot: Number(b.slot),
      dbSlot: Number(b.slot),
      title: b.title || "",
      subtitle: b.subtitle || "",
      badge: b.badge || "",
      imageKey: b.imageKey || "",
      imageUrl: b.imageUrl || "",
      targetUrl: b.targetUrl || null,
      active: Boolean(b.active),
      startAt: b.startAt || null,
      expiresAt: b.expiresAt || null,
      createdAt: b.createdAt || new Date().toISOString(),
      updatedAt: b.updatedAt || new Date().toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error("Trending Ads GET error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal memuat iklan trending" },
      { status: 500 }
    );
  }
}
