import { NextRequest, NextResponse } from "next/server";
import { apiPatch, apiDelete } from "@/lib/apiClient";

// PATCH — toggle active/inactive
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { is_active } = await req.json();

    await apiPatch(`/api/notifications/${id}`, { is_active });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Notification PATCH error:", error);
    return NextResponse.json({ error: error.message || "Gagal memperbarui notifikasi" }, { status: 500 });
  }
}

// DELETE — delete notification
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await apiDelete(`/api/notifications/${id}`);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Notification DELETE error:", error);
    return NextResponse.json({ error: error.message || "Gagal menghapus notifikasi" }, { status: 500 });
  }
}
