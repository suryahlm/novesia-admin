import { NextRequest, NextResponse } from "next/server";
import { apiDelete } from "@/lib/apiClient";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await apiDelete(`/api/forum/posts/${id}`);
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("Forum post DELETE error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus balasan" }, { status: 500 });
  }
}
