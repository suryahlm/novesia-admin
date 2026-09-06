import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("nu_app_config")
      .select("value")
      .eq("key", "web_trending_ads")
      .maybeSingle();

    if (error) throw error;

    let items: any[] = [];
    if (data?.value) {
      try {
        items = JSON.parse(data.value);
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

