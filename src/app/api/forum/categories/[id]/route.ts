import { NextRequest, NextResponse } from "next/server";
import { apiPatch, apiDelete } from "@/lib/apiClient";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data = await apiPatch(`/api/forum/categories/${id}`, body);
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
    await apiDelete(`/api/forum/categories/${id}`);
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("Forum category DELETE error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus kategori" }, { status: 500 });
  }
}
