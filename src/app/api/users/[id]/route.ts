import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if ("role" in body) {
      if (!["USER", "VIP"].includes(body.role)) {
        return NextResponse.json({ error: "Role harus USER atau VIP" }, { status: 400 });
      }
      updateData.role = body.role;
      if (body.role === "VIP") {
        const days = Number(body.vipDurationDays);
        if (!Number.isFinite(days) || days <= 0) {
          return NextResponse.json(
            { error: "vipDurationDays wajib diisi angka > 0 untuk status VIP" },
            { status: 400 }
          );
        }
        updateData.vip_until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      } else {
        updateData.vip_until = null;
      }
    }

    if ("banned" in body) {
      updateData.banned = Boolean(body.banned);
    }

    if ("frozen" in body) {
      updateData.frozen = Boolean(body.frozen);
    }

    const { data, error } = await supabase
      .from("nu_users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("User patch error:", err);
    return NextResponse.json({ error: err.message || "Gagal memperbarui data user" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from("nu_users")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("User delete error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus user" }, { status: 500 });
  }
}
