import { apiPatch } from "@/lib/apiClient";
import { NextRequest, NextResponse } from "next/server";
import { isInvalidOrBrokenTranslation } from "@/lib/translation-validator";

// PUT: Update chapter content (original or translated)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string; chapterId: string }> }
) {
  const { chapterId } = await params;
  const body = await req.json();

  const updates: Record<string, any> = {};

  if (body.content_original !== undefined) {
    updates.content_original = body.content_original;
    updates.word_count_original = body.content_original.split(/\s+/).filter(Boolean).length;
  }

  if (body.content_translated !== undefined) {
    const isBroken = isInvalidOrBrokenTranslation(body.content_translated, body.content_original);
    if (isBroken && body.content_translated && body.content_translated.trim().length > 0) {
      return NextResponse.json(
        { error: "Konten terjemahan terdeteksi sebagai error HTML / halaman proxy rusak dan ditolak." },
        { status: 400 }
      );
    }
    updates.content_translated = body.content_translated;
    updates.word_count_translated = body.content_translated ? body.content_translated.split(/\s+/).filter(Boolean).length : 0;
    updates.translation_status = body.content_translated && body.content_translated.trim() ? "done" : "pending";
    if (body.content_translated && body.content_translated.trim()) {
      updates.translated_at = new Date().toISOString();
    }
  }

  if (body.chapter_title !== undefined) {
    updates.chapter_title = body.chapter_title;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const data = await apiPatch<any>(`/api/chapters/by-id/${chapterId}`, updates);
    return NextResponse.json({ success: true, chapter: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
