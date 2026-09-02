import { NextRequest, NextResponse } from "next/server";
import { translateText } from "@/lib/translator";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { text, type = "chapter" } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { success: false, error: "Teks original tidak boleh kosong." },
        { status: 400 }
      );
    }

    const translatedText = await translateText(text, type);

    if (!translatedText) {
      return NextResponse.json(
        { success: false, error: "AI tidak menghasilkan terjemahan." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      translatedText,
    });
  } catch (error: any) {
    console.error("API /api/translate error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal menerjemahkan teks" },
      { status: 500 }
    );
  }
}
