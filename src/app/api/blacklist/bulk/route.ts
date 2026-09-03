import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST: Blacklist massal (misal: novel-novel mati yang terdeteksi)
export async function POST(req: NextRequest) {
  try {
    const { novels, reason = "Novel mati / stagnan lama di sumber asli" } = await req.json();

    if (!Array.isArray(novels) || novels.length === 0) {
      return NextResponse.json({ error: "Daftar novel kosong." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const blacklistRows = novels.map((n) => ({
      novel_id: n.id || null,
      nu_slug: n.nu_slug,
      title: n.title,
      source: n.source || null,
      reason: n.reason || reason,
      type: "novel",
      blacklisted_at: now,
      updated_at: now,
    }));

    // 1. Insert ke nu_blacklist
    const { error: insertErr } = await supabase
      .from("nu_blacklist")
      .upsert(blacklistRows, { onConflict: "nu_slug,type" });

    if (insertErr) {
      console.warn("Bulk insert warn, trying batch inserts:", insertErr.message);
      await supabase.from("nu_blacklist").insert(blacklistRows);
    }

    // 2. Update status di nu_novels
    const novelIds = novels.map((n) => n.id).filter(Boolean);
    if (novelIds.length > 0) {
      await supabase
        .from("nu_novels")
        .update({
          is_blacklisted: true,
          blacklist_reason: reason,
          blacklisted_at: now,
          status: "dropped",
        })
        .in("id", novelIds);
    }

    return NextResponse.json({
      success: true,
      count: novels.length,
      message: `Berhasil menambahkan ${novels.length} novel ke daftar blacklist.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal blacklist massal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
