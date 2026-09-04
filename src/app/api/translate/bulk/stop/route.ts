import { NextResponse } from "next/server";
import { stopTranslationJob } from "@/lib/translation-job";

export async function POST() {
  const result = stopTranslationJob();
  return NextResponse.json(result);
}
