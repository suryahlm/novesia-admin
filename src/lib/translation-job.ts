import { supabase } from "@/lib/supabase";
import { translateText } from "@/lib/translator";

export interface TranslationLogEntry {
  novelId: string;
  novelTitle: string;
  synopsisOk: boolean;
  translated: number;
  failed: number;
  skipped?: boolean;
}

export interface TranslationJobState {
  id: string;
  status: "idle" | "running" | "completed" | "stopped" | "error";
  novelIds: string[];
  sourceLabel?: string;
  startTime: number;
  endTime?: number;
  totalNovels: number;
  totalChapters: number;
  totalSynopsis: number;
  completedChapters: number;
  failedChapters: number;
  synopsisTranslated: number;
  currentNovelTitle: string;
  currentNovelId: string;
  currentChapterNumber: number;
  currentChapterIndex: number;
  currentChapterTotal: number;
  phase: "synopsis" | "chapter" | "idle";
  attempt: number;
  logs: TranslationLogEntry[];
  aborted: boolean;
  error?: string;
}

// In-memory singleton across Next.js API requests
declare global {
  // eslint-disable-next-line no-var
  var __bgTranslationJob: TranslationJobState | undefined;
}

function getInitialState(): TranslationJobState {
  return {
    id: "",
    status: "idle",
    novelIds: [],
    startTime: 0,
    totalNovels: 0,
    totalChapters: 0,
    totalSynopsis: 0,
    completedChapters: 0,
    failedChapters: 0,
    synopsisTranslated: 0,
    currentNovelTitle: "",
    currentNovelId: "",
    currentChapterNumber: 0,
    currentChapterIndex: 0,
    currentChapterTotal: 0,
    phase: "idle",
    attempt: 1,
    logs: [],
    aborted: false,
  };
}

export function getTranslationJob(): TranslationJobState {
  if (!globalThis.__bgTranslationJob) {
    globalThis.__bgTranslationJob = getInitialState();
  }
  return globalThis.__bgTranslationJob;
}

export function stopTranslationJob(): { ok: boolean; message: string; job: TranslationJobState } {
  const job = getTranslationJob();
  if (job.status !== "running") {
    return { ok: false, message: "Tidak ada proses translate yang sedang berjalan.", job };
  }
  job.aborted = true;
  job.status = "stopped";
  job.endTime = Date.now();
  return { ok: true, message: "Proses translate berhasil dihentikan.", job };
}

export async function startTranslationJob(
  novelIds: string[],
  sourceLabel?: string
): Promise<{ ok: boolean; message: string; job: TranslationJobState }> {
  const job = getTranslationJob();

  if (job.status === "running") {
    return {
      ok: false,
      message: "Translate latar belakang sedang berjalan. Harap tunggu atau klik Berhenti terlebih dahulu.",
      job,
    };
  }

  if (!novelIds || novelIds.length === 0) {
    return { ok: false, message: "novelIds array tidak boleh kosong.", job };
  }

  // Reset job state
  const newJob: TranslationJobState = {
    id: `job_${Date.now()}`,
    status: "running",
    novelIds,
    sourceLabel,
    startTime: Date.now(),
    totalNovels: novelIds.length,
    totalChapters: 0,
    totalSynopsis: 0,
    completedChapters: 0,
    failedChapters: 0,
    synopsisTranslated: 0,
    currentNovelTitle: "Menyiapkan...",
    currentNovelId: "",
    currentChapterNumber: 0,
    currentChapterIndex: 0,
    currentChapterTotal: 0,
    phase: "idle",
    attempt: 1,
    logs: [],
    aborted: false,
  };

  globalThis.__bgTranslationJob = newJob;

  // Run in background WITHOUT awaiting
  runBackgroundLoop(newJob).catch((err) => {
    console.error("[BackgroundTranslation] Fatal error:", err);
    newJob.status = "error";
    newJob.error = String(err);
    newJob.endTime = Date.now();
  });

  return { ok: true, message: "Background translate berhasil diluncurkan!", job: newJob };
}

async function runBackgroundLoop(job: TranslationJobState) {
  const MAX_RETRIES = 3;
  const DELAY_BETWEEN_CHAPTERS_MS = 1850;

  try {
    // 1. Fetch novel metadata
    const { data: novels, error: novelsErr } = await supabase
      .from("nu_novels")
      .select("id, title, nu_slug, synopsis, synopsis_translated")
      .in("id", job.novelIds);

    if (novelsErr || !novels) {
      job.status = "error";
      job.error = novelsErr?.message || "Gagal mengambil data novel";
      job.endTime = Date.now();
      return;
    }

    // 2. Count pending items per novel
    let totalPendingChapters = 0;
    let totalPendingSynopsis = 0;
    const novelPendingMap = new Map<string, number>();

    for (const novel of novels) {
      if (job.aborted) break;

      if (novel.synopsis?.trim() && !novel.synopsis_translated?.trim()) {
        totalPendingSynopsis++;
      }

      const { count } = await supabase
        .from("nu_chapter_content")
        .select("id", { count: "exact", head: true })
        .eq("novel_id", novel.id)
        .not("content_original", "is", null)
        .neq("content_original", "")
        .or("content_translated.is.null,content_translated.eq.");

      const pending = count || 0;
      novelPendingMap.set(novel.id, pending);
      totalPendingChapters += pending;
    }

    job.totalChapters = totalPendingChapters;
    job.totalSynopsis = totalPendingSynopsis;

    // 3. Process each novel
    for (const novel of novels) {
      if (job.aborted) break;

      const pendingChapterCount = novelPendingMap.get(novel.id) || 0;
      const hasPendingSynopsis = !!novel.synopsis?.trim() && !novel.synopsis_translated?.trim();

      // Skip novel with nothing to translate
      if (!hasPendingSynopsis && pendingChapterCount === 0) {
        job.logs.push({
          novelId: novel.id,
          novelTitle: novel.title,
          synopsisOk: !!novel.synopsis_translated?.trim(),
          translated: 0,
          failed: 0,
          skipped: true,
        });
        continue;
      }

      job.currentNovelId = novel.id;
      job.currentNovelTitle = novel.title;
      job.currentChapterIndex = 0;
      job.currentChapterTotal = pendingChapterCount;

      let synopsisSuccess = false;

      // === TRANSLATE SYNOPSIS ===
      if (hasPendingSynopsis && !job.aborted) {
        job.phase = "synopsis";

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          if (job.aborted) break;
          job.attempt = attempt;

          try {
            const translated = await translateText(novel.synopsis!, "synopsis");
            if (translated?.trim()) {
              await supabase
                .from("nu_novels")
                .update({
                  synopsis_translated: translated,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", novel.id);

              job.synopsisTranslated++;
              synopsisSuccess = true;
              break;
            }
          } catch (err) {
            console.warn(`[BackgroundTranslate] Synopsis ${novel.title} attempt ${attempt}:`, err);
            if (attempt < MAX_RETRIES && !job.aborted) {
              await new Promise((r) => setTimeout(r, attempt * 2500));
            }
          }
        }

        if (!job.aborted) {
          await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CHAPTERS_MS));
        }
      }

      // === TRANSLATE CHAPTERS (BATCHED) ===
      let novelTranslated = 0;
      let novelFailed = 0;
      let currentChIndex = 0;

      if (pendingChapterCount > 0 && !job.aborted) {
        job.phase = "chapter";

        // Query in batches of 100 to handle large novels (e.g. >1000 chapters) safely
        while (!job.aborted) {
          const { data: batch } = await supabase
            .from("nu_chapter_content")
            .select("id, chapter_number, chapter_title, content_original")
            .eq("novel_id", novel.id)
            .not("content_original", "is", null)
            .neq("content_original", "")
            .or("content_translated.is.null,content_translated.eq.")
            .order("chapter_number", { ascending: true })
            .limit(100);

          if (!batch || batch.length === 0) break;

          for (let i = 0; i < batch.length; i++) {
            if (job.aborted) break;

            const ch = batch[i];
            currentChIndex++;
            job.currentChapterNumber = ch.chapter_number;
            job.currentChapterIndex = currentChIndex;
            let chapterSuccess = false;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
              if (job.aborted) break;
              job.attempt = attempt;

              try {
                const translated = await translateText(ch.content_original!, "chapter");
                if (translated?.trim()) {
                  const wordCount = translated.split(/\s+/).filter(Boolean).length;

                  await supabase
                    .from("nu_chapter_content")
                    .update({
                      content_translated: translated,
                      word_count_translated: wordCount,
                      translation_status: "done",
                      translated_at: new Date().toISOString(),
                    })
                    .eq("id", ch.id);

                  job.completedChapters++;
                  novelTranslated++;
                  chapterSuccess = true;
                  break;
                } else {
                  if (attempt < MAX_RETRIES && !job.aborted) {
                    await new Promise((r) => setTimeout(r, attempt * 3000));
                  }
                }
              } catch (err) {
                console.warn(`[BackgroundTranslate] Ch ${ch.chapter_number} attempt ${attempt}:`, err);
                if (attempt < MAX_RETRIES && !job.aborted) {
                  await new Promise((r) => setTimeout(r, attempt * 3000));
                }
              }
            }

            if (!chapterSuccess && !job.aborted) {
              novelFailed++;
              job.failedChapters++;
            }

            // Rate limit delay between chapters
            if (!job.aborted) {
              await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CHAPTERS_MS));
            }
          }
        }

        // Mark novel as having Indonesian translation
        if (novelTranslated > 0) {
          await supabase
            .from("nu_novels")
            .update({
              translation_status: "id_translated",
              updated_at: new Date().toISOString(),
            })
            .eq("id", novel.id);
        }
      }

      // Record log for this novel
      if (hasPendingSynopsis || pendingChapterCount > 0) {
        job.logs.push({
          novelId: novel.id,
          novelTitle: novel.title,
          synopsisOk: hasPendingSynopsis ? synopsisSuccess : true,
          translated: novelTranslated,
          failed: novelFailed,
        });
      }

      // Small pause between novels
      if (!job.aborted) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (job.aborted) {
      job.status = "stopped";
    } else {
      job.status = "completed";
      job.phase = "idle";
    }
    job.endTime = Date.now();
  } catch (err) {
    console.error("[BackgroundTranslation] Loop error:", err);
    job.status = "error";
    job.error = String(err);
    job.endTime = Date.now();
  }
}
