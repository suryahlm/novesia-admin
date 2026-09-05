import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function parseTitleData(rawTitle: string): { title: string; subtitle: string; badge: string } {
  if (!rawTitle) return { title: "", subtitle: "", badge: "" };
  try {
    if (rawTitle.startsWith("{") && rawTitle.endsWith("}")) {
      const parsed = JSON.parse(rawTitle);
      return {
        title: parsed.title || "",
        subtitle: parsed.subtitle || "",
        badge: parsed.badge || "",
      };
    }
  } catch {
    // fallback to string
  }
  return { title: rawTitle, subtitle: "", badge: "" };
}

export async function GET() {
  try {
    const { data: rows, error } = await supabase
      .from("nu_banners")
      .select("*")
      .gte("slot", 11)
      .lte("slot", 16)
      .order("slot", { ascending: true });

    if (error) throw error;

    const formatted = (rows || []).map((b: any) => {
      const slotNumber = b.slot - 10; // 11->1, 12->2, 13->3
      const { title, subtitle, badge } = parseTitleData(b.title);

      return {
        id: b.id,
        slot: slotNumber,
        dbSlot: b.slot,
        title,
        subtitle,
        badge,
        imageKey: b.image_key,
        imageUrl: b.image_url,
        targetUrl: b.target_url,
        active: Boolean(b.active),
        startAt: b.start_at,
        expiresAt: b.expires_at,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      };
    });

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error("Trending Ads GET error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal memuat iklan trending" },
      { status: 500 }
    );
  }
}
