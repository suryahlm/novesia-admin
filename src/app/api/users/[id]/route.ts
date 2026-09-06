import { NextRequest, NextResponse } from "next/server";
import { apiPatch, apiDelete } from "@/lib/apiClient";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data = await apiPatch(`/api/users/${id}`, body);
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
    await apiDelete(`/api/users/${id}`);
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("User delete error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus user" }, { status: 500 });
  }
}
