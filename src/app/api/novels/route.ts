import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { uploadCoverToR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      nu_slug,
      author,
      synopsis,
      total_chapters,
      rating,
      novel_type,
      original_status,
      status,
      genres,
      coverBase64, // Format: data:image/jpeg;base64,...
    } = body;

    if (!title || !nu_slug) {
      return NextResponse.json({ error: "Judul dan Slug wajib diisi" }, { status: 400 });
    }

    let finalCoverUrl = null;

    // Handle base64 image upload
    if (coverBase64 && coverBase64.startsWith("data:image")) {
      const base64Data = coverBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      
      const fileName = `${nu_slug}.jpg`;
      // explicitly use "general" as prefix (folder)
      const uploadRes = await uploadCoverToR2(buffer, fileName, "general");
      
      if (uploadRes) {
        finalCoverUrl = uploadRes.publicUrl;
      }
    }

    // Insert metadata into nu_novels
    const novelData = {
      title,
      nu_slug,
      synopsis: synopsis || "",
      author: author || "Unknown",
      total_chapters: total_chapters ? parseInt(total_chapters) : 0,
      rating: rating ? parseFloat(rating) : 0,
      novel_type: novel_type || "Web Novel",
      original_status: original_status || "Ongoing",
      status: status || "active",
      genres: genres || [],
      source: "General",
      cover_url: finalCoverUrl,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("nu_novels")
      .insert(novelData)
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      // Delete from R2 if DB fails? Usually good practice, but skipping for simplicity
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, novel: data });

  } catch (error: any) {
    console.error("Create novel error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
