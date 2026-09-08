import { NextRequest, NextResponse } from "next/server";
import { generateNovelGenres } from "@/lib/genre-generator";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { title, synopsis } = await req.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    const genres = await generateNovelGenres(title, synopsis);
    return NextResponse.json({ genres });
  } catch (error: any) {
    console.error("Generate Genre Error:", error);
    return NextResponse.json({ error: error?.message || "Gagal generate genre" }, { status: 500 });
  }
}

