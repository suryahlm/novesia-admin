import { supabase } from "@/lib/supabase";
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
    const { data: novel } = await supabase
      .from("nu_novels")
      .select("nu_slug, source")
      .eq("id", id)
      .single();

    if (!novel) {
      return NextResponse.json({ error: "Novel not found" }, { status: 404 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${novel.source}/${novel.nu_slug}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadCoverToR2(buffer, filename);

    if (!result) {
      return NextResponse.json({ error: "R2 upload failed" }, { status: 500 });
    }

    // Update novel in DB
    const { error } = await supabase
      .from("nu_novels")
      .update({
        cover_url: result.publicUrl,
        cover_r2_key: result.r2Key,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      cover_url: result.publicUrl,
      cover_r2_key: result.r2Key,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
