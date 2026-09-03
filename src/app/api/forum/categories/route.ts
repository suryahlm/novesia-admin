import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data: categories, error } = await supabase
      .from("nu_forum_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    // Fetch thread counts per category
    const { data: threadCounts, error: countErr } = await supabase
      .from("nu_forum_threads")
      .select("category_id");

    const countsMap: Record<string, number> = {};
    if (!countErr && threadCounts) {
      threadCounts.forEach((t: any) => {
        countsMap[t.category_id] = (countsMap[t.category_id] || 0) + 1;
      });
    }

    const result = (categories || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      order: c.sort_order || 0,
      threadCount: countsMap[c.id] || 0,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Forum categories GET error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat kategori forum" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    }

    const slug = (body.slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const description = (body.description || "").trim() || null;
    const sort_order = Number.isFinite(Number(body.order)) ? Math.round(Number(body.order)) : 0;

    const { data, error } = await supabase
      .from("nu_forum_categories")
      .insert({
        name,
        slug,
        description,
        sort_order,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Kategori dengan nama/slug ini sudah ada" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("Forum category POST error:", err);
    return NextResponse.json({ error: err.message || "Gagal membuat kategori" }, { status: 500 });
  }
}
