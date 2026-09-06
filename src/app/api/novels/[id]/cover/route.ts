import { apiGet, apiPatch } from "@/lib/apiClient";
import { uploadCoverToR2 } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const formData = await req.formData();
    const file = formData.get("cover") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    // Get novel slug for filename
    const novel = await apiGet<any>(`/api/novels/${id}`);

    if (!novel) {
      return NextResponse.json({ error: "Novel not found" }, { status: 404 });
    }

    const sourcePrefix = novel.source || "general";
    const slug = novel.nu_slug || novel.nuSlug;
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${sourcePrefix}/${slug}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadCoverToR2(buffer, filename);

    if (!result) {
      return NextResponse.json({ error: "R2 upload failed" }, { status: 500 });
    }

    // Update novel in DB
    await apiPatch(`/api/novels/${novel.id || id}`, {
      cover_url: result.publicUrl,
      cover_r2_key: result.r2Key,
    });

    return NextResponse.json({
      success: true,
      cover_url: result.publicUrl,
      cover_r2_key: result.r2Key,
    });
  } catch (e: any) {
    console.error("Cover upload error:", e);
    return NextResponse.json({ error: e.message || "Failed to upload cover" }, { status: 500 });
  }
}
