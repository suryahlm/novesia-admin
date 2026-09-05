import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data: rows, error } = await supabase
      .from("nu_banners")
      .select("*")
      .gte("slot", 1)
      .lte("slot", 6)
      .order("slot", { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      (rows || []).map((b: any) => ({
        id: b.id,
        slot: b.slot,
        title: b.title,
        imageKey: b.image_key,
        imageUrl: b.image_url,
        targetUrl: b.target_url,
        active: Boolean(b.active),
        startAt: b.start_at,
        expiresAt: b.expires_at,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      }))
    );
  } catch (err: any) {
    console.error("Banners GET error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat banner beranda" }, { status: 500 });
  }
}
