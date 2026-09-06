import { NextRequest, NextResponse } from "next/server";
import { apiDelete } from "@/lib/apiClient";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await apiDelete(`/api/comments/${id}`);
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("Comment delete error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus komentar" }, { status: 500 });
  }
}
