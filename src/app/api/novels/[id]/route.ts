import { apiGet, apiPatch, apiDelete } from "@/lib/apiClient";
import { NextRequest, NextResponse } from "next/server";

// PUT / PATCH: Update novel metadata
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const allowedFields = [
    "title", "synopsis", "synopsis_translated", "genres", "tags", "author", "artist", "status",
    "novel_type", "novelType", "original_status", "translation_status", "translationStatus",
    "language", "rating", "year", "cover_url", "cover_r2_key",
    "cover_landscape_url", "cover_landscape_r2_key", "is_blacklisted", "blacklist_reason",
    "associated_names", "associatedNames", "publisher", "source",
  ];

  const updates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }
  updates.updated_at = new Date().toISOString();

  try {
    const data = await apiPatch<any>(`/api/novels/${id}`, updates);
    return NextResponse.json({ success: true, novel: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE: Delete novel and all its chapters
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // API akan handle R2 cleanup dan cascade delete
    await apiDelete(`/api/novels/${id}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
