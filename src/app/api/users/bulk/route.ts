import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const BULK_ACTIONS = ["vip", "unvip", "freeze", "unfreeze", "ban", "unban", "delete"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id: any) => typeof id === "string" && id) : [];
    const action = body?.action;

    if (!ids.length) {
      return NextResponse.json({ error: "ids wajib diisi (minimal 1 user)" }, { status: 400 });
    }

    if (!BULK_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `action harus salah satu dari: ${BULK_ACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    if (action === "delete") {
      const { error, count } = await supabase
        .from("nu_users")
        .delete({ count: "exact" })
        .in("id", ids);

      if (error) throw error;

      // Also remove users from Supabase Auth
      for (const id of ids) {
        try {
          await supabase.auth.admin.deleteUser(id);
        } catch (authErr) {
          console.warn("[Bulk DELETE] Auth delete warning:", id, authErr);
        }
      }

      return NextResponse.json({ deleted: count || ids.length });
    }

    let updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (action === "vip") {
      const days = Number(body.durationDays);
      if (!Number.isFinite(days) || days <= 0) {
        return NextResponse.json({ error: "durationDays harus > 0 untuk status VIP" }, { status: 400 });
      }
      updateData = {
        ...updateData,
        role: "VIP",
        vip_until: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
      };
    } else if (action === "unvip") {
      updateData = { ...updateData, role: "USER", vip_until: null };
    } else if (action === "freeze") {
      updateData = { ...updateData, frozen: true };
    } else if (action === "unfreeze") {
      updateData = { ...updateData, frozen: false };
    } else if (action === "ban") {
      updateData = { ...updateData, banned: true };
    } else if (action === "unban") {
      updateData = { ...updateData, banned: false };
    }

    const { error, count } = await supabase
      .from("nu_users")
      .update(updateData, { count: "exact" })
      .in("id", ids);

    if (error) throw error;

    // Sync metadata to Supabase Auth in background
    for (const id of ids) {
      try {
        const authUpdates: Record<string, any> = {};
        if ("role" in updateData) authUpdates.role = updateData.role;
        if ("banned" in updateData) authUpdates.banned = updateData.banned;
        if ("frozen" in updateData) authUpdates.frozen = updateData.frozen;
        if (Object.keys(authUpdates).length > 0) {
          await supabase.auth.admin.updateUserById(id, { user_metadata: authUpdates });
        }
      } catch (authErr) {
        console.warn("[Bulk PATCH] Auth sync warning:", id, authErr);
      }
    }

    return NextResponse.json({ updated: count || ids.length });
  } catch (err: any) {
    console.error("User bulk action error:", err);
    return NextResponse.json({ error: err.message || "Gagal memproses aksi massal" }, { status: 500 });
  }
}
