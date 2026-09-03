import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: Record<string, any> = {};

    if ("name" in body) {
      const name = (body.name || "").trim();
      if (!name) return NextResponse.json({ error: "Nama kategori tidak boleh kosong" }, { status: 400 });
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    }

    if ("description" in body) {
      updateData.description = body.description ? String(body.description).trim() : null;
    }

    if ("order" in body) {
      updateData.sort_order = Number.isFinite(Number(body.order)) ? Math.round(Number(body.order)) : 0;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Tidak ada field untuk diupdate" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("nu_forum_categories")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Kategori dengan nama ini sudah ada" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Forum category PATCH error:", err);
    return NextResponse.json({ error: err.message || "Gagal memperbarui kategori" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from("nu_forum_categories")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("Forum category DELETE error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus kategori" }, { status: 500 });
  }
}
