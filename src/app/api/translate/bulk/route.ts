import { NextRequest, NextResponse } from "next/server";
import { getTranslationJob, startTranslationJob } from "@/lib/translation-job";

export const maxDuration = 300;

/**
 * GET /api/translate/bulk
 * Get current background translation job status
 */
export async function GET() {
  const job = getTranslationJob();
  return NextResponse.json({ job });
}

/**
 * POST /api/translate/bulk
 * Launch autonomous background translation for selected novel IDs.
 * The job continues running in background even if the browser/tab is closed.
 * 
 * Body: { novelIds: string[], sourceLabel?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { novelIds, sourceLabel } = body || {};

    if (!novelIds || !Array.isArray(novelIds) || novelIds.length === 0) {
      return NextResponse.json(
        { error: "novelIds array diperlukan dan tidak boleh kosong" },
        { status: 400 }
      );
    }

    const result = await startTranslationJob(novelIds, sourceLabel);

    if (!result.ok) {
      return NextResponse.json({ error: result.message, job: result.job }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      job: result.job,
    });
  } catch (err: any) {
    console.error("[POST /api/translate/bulk] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
