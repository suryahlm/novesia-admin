import { NextRequest, NextResponse } from "next/server";
import { apiPost, apiPatch } from "@/lib/apiClient";
import { generateNovelGenres } from "@/lib/genre-generator";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid array of IDs" }, { status: 400 });
    }

    // 1. Fetch novel data from API
    const novels = await apiPost<any[]>("/api/novels/bulk", { ids });

    if (!novels || novels.length === 0) {
      return NextResponse.json({ error: "Novels not found" }, { status: 404 });
    }

    let updatedCount = 0;

    // 2. Process each novel using Groq AI
    for (const novel of novels) {
      const generatedGenres = await generateNovelGenres(novel.title, novel.synopsis);

      // 3. Update DB via apiClient
      try {
        await apiPatch(`/api/novels/${novel.id}`, { genres: generatedGenres });
        updatedCount++;
      } catch (updateError) {
        console.error(`Gagal update genre untuk novel ID ${novel.id}:`, updateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil meng-generate genre untuk ${updatedCount} dari ${novels.length} novel.`,
      updated: updatedCount,
    });
  } catch (error: any) {
    console.error("Bulk Generate Genre Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
