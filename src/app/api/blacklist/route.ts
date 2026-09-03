import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET: Ambil daftar blacklist (novel atau chapter)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "novel";
    const q = searchParams.get("q") || "";

    let query = supabase
      .from("nu_blacklist")
      .select(`
        id,
        novel_id,
        nu_slug,
        title,
        source,
        reason,
        type,
        chapter_number,
        blacklisted_at,
        created_at
      `)
      .eq("type", type)
      .order("blacklisted_at", { ascending: false });

    if (q.trim()) {
      query = query.or(`title.ilike.%${q.trim()}%,nu_slug.ilike.%${q.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ambil detail novel (cover, total chapters) untuk memperkaya tampilan
    if (type === "novel" && data && data.length > 0) {
      const novelIds = data.map((d) => d.novel_id).filter(Boolean);
      if (novelIds.length > 0) {
        const { data: novelDetails } = await supabase
          .from("nu_novels")
          .select("id, cover_url, total_chapters, status, original_status")
          .in("id", novelIds);

        const detailMap = new Map((novelDetails || []).map((n) => [n.id, n]));
        const enriched = data.map((d) => ({
          ...d,
          novel: d.novel_id ? detailMap.get(d.novel_id) || null : null,
        }));
        return NextResponse.json({ items: enriched });
      }
    }

    return NextResponse.json({ items: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Tambahkan novel atau chapter ke blacklist
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      novel_id,
      nu_slug,
      title,
      source,
      reason,
      type = "novel",
      chapter_number,
    } = body;

    if (!nu_slug || !title) {
      return NextResponse.json(
        { error: "Slug dan judul novel wajib diisi." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 1. Insert ke nu_blacklist
    const { data: inserted, error: insertErr } = await supabase
      .from("nu_blacklist")
      .upsert(
        {
          novel_id: novel_id || null,
          nu_slug,
          title,
          source: source || null,
          reason: reason ? reason.trim() : null,
          type,
          chapter_number: chapter_number || null,
          blacklisted_at: now,
          updated_at: now,
        },
        { onConflict: "nu_slug,type" }
      )
      .select()
      .single();

    if (insertErr) {
      // Jika tidak ada constraint onConflict gabungan, fallback insert biasa
      const { data: fallbackInsert, error: fbErr } = await supabase
        .from("nu_blacklist")
        .insert({
          novel_id: novel_id || null,
          nu_slug,
          title,
          source: source || null,
          reason: reason ? reason.trim() : null,
          type,
          chapter_number: chapter_number || null,
          blacklisted_at: now,
        })
        .select()
        .single();

      if (fbErr) {
        console.error("Blacklist insert error:", fbErr);
        return NextResponse.json({ error: fbErr.message }, { status: 500 });
      }
    }

    // 2. Tandai di tabel nu_novels
    if (type === "novel") {
      if (novel_id) {
        await supabase
          .from("nu_novels")
          .update({
            is_blacklisted: true,
            blacklist_reason: reason ? reason.trim() : null,
            blacklisted_at: now,
            status: "dropped", // Ubah status agar tidak muncul di feed aktif pembaca
          })
          .eq("id", novel_id);
      } else if (nu_slug) {
        await supabase
          .from("nu_novels")
          .update({
            is_blacklisted: true,
            blacklist_reason: reason ? reason.trim() : null,
            blacklisted_at: now,
            status: "dropped",
          })
          .eq("nu_slug", nu_slug);
      }
    }

    // 3. Jika chapter
    if (type === "chapter" && novel_id && chapter_number) {
      await supabase
        .from("nu_chapter_content")
        .update({
          is_blacklisted: true,
          blacklist_reason: reason ? reason.trim() : null,
        })
        .eq("novel_id", novel_id)
        .eq("chapter_number", chapter_number);
    }

    return NextResponse.json({ success: true, item: inserted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menambah blacklist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Hapus dari blacklist (Un-blacklist)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const novel_id = searchParams.get("novel_id");
    const nu_slug = searchParams.get("nu_slug");
    const type = searchParams.get("type") || "novel";

    if (!id && !novel_id && !nu_slug) {
      return NextResponse.json(
        { error: "ID, novel_id, atau nu_slug diperlukan." },
        { status: 400 }
      );
    }

    // 1. Hapus dari nu_blacklist
    if (id) {
      await supabase.from("nu_blacklist").delete().eq("id", id);
    } else if (nu_slug) {
      await supabase.from("nu_blacklist").delete().eq("nu_slug", nu_slug);
    }

    // 2. Kembalikan status di nu_novels
    if (type === "novel") {
      if (novel_id) {
        await supabase
          .from("nu_novels")
          .update({
            is_blacklisted: false,
            blacklist_reason: null,
            blacklisted_at: null,
            status: "active",
          })
          .eq("id", novel_id);
      } else if (nu_slug) {
        await supabase
          .from("nu_novels")
          .update({
            is_blacklisted: false,
            blacklist_reason: null,
            blacklisted_at: null,
            status: "active",
          })
          .eq("nu_slug", nu_slug);
      }
    }

    return NextResponse.json({ success: true, message: "Berhasil dihapus dari blacklist" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus blacklist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
