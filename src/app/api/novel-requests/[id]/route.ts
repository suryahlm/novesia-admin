import { NextRequest, NextResponse } from "next/server";
import { apiPatch, apiDelete } from "@/lib/apiClient";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const data = await apiPatch(`/api/novel-requests/${id}`, body);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error(`[novel-requests API] PATCH Error:`, err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Gagal memperbarui status request novel" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const data = await apiDelete(`/api/novel-requests/${id}`);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error(`[novel-requests API] DELETE Error:`, err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Gagal menghapus request novel" },
      { status: 500 }
    );
  }
}
