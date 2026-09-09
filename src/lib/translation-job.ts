import { apiGet, apiPost, apiPatch } from "@/lib/apiClient";
import { translateText } from "@/lib/translator";
import { isInvalidOrBrokenTranslation } from "@/lib/translation-validator";

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
  novelId?: string; // novel tunggal yang sedang diproses (untuk NovelEditor)
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

  // Jika hanya 1 novel, set novelId untuk NovelEditor bisa polling per-novel
  if (novelIds.length === 1) {
    newJob.novelId = novelIds[0];
  }

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
    // 1. Fetch novel metadata via API
    let novels: any[] = [];
    try {
      novels = await apiPost<any[]>("/api/novels/bulk", { ids: job.novelIds });
    } catch (novelsErr: any) {
      job.status = "error";
      job.error = novelsErr?.message || "Gagal mengambil data novel";
      job.endTime = Date.now();
      return;
    }

    if (!novels || novels.length === 0) {
      job.status = "error";
      job.error = "Data novel tidak ditemukan";
      job.endTime = Date.now();
      return;
    }

    // 2. Count pending items per novel
    let totalPendingChapters = 0;
    let totalPendingSynopsis = 0;
    const novelPendingMap = new Map<string, number>();

    for (const novel of novels) {
      if (job.aborted) break;

      const synopsis = novel.synopsis;
      const synopsisTrans = novel.synopsis_translated || novel.synopsisTranslated;
      const needsSynopsis = !!synopsis?.trim() && (!synopsisTrans?.trim() || isInvalidOrBrokenTranslation(synopsisTrans, synopsis));
      if (needsSynopsis) {
        totalPendingSynopsis++;
      }

      const novelSlug = novel.nu_slug || novel.nuSlug || novel.id;
      let pending = 0;
      try {
        const chaptersRes = await apiGet<any>(`/api/chapters/${novelSlug}`, { pending: true, limit: 1 });
        if (chaptersRes?.pendingCount !== undefined && chaptersRes?.pendingCount !== null) {
          pending = Number(chaptersRes.pendingCount);
        } else {
          const total = Number(novel.total_with_content || novel.total_chapters || novel.totalChapters || 0);
          const trans = Number(novel.translated_chapters || 0);
          pending = Math.max(0, total - trans);
        }
      } catch {
        const total = Number(novel.total_with_content || novel.total_chapters || novel.totalChapters || 0);
        const trans = Number(novel.translated_chapters || 0);
        pending = Math.max(0, total - trans);
      }

      // Robust fallback: if pending is 0, but total > 0 and translated is 0, pending is total
      const total = Number(novel.total_with_content || novel.total_chapters || novel.totalChapters || 0);
      const trans = Number(novel.translated_chapters || 0);
      if (pending === 0 && total > 0 && trans === 0) {
        pending = total;
      }

      novelPendingMap.set(novel.id, pending);
      totalPendingChapters += pending;
    }

    job.totalChapters = totalPendingChapters;
    job.totalSynopsis = totalPendingSynopsis;

    // 3. Process each novel
    for (const novel of novels) {
      if (job.aborted) break;

      const novelSlug = novel.nu_slug || novel.nuSlug || novel.id;
      let pendingChapterCount = novelPendingMap.get(novel.id) || 0;
      const synopsis = novel.synopsis;
      const synopsisTrans = novel.synopsis_translated || novel.synopsisTranslated;
      const hasPendingSynopsis = !!synopsis?.trim() && (!synopsisTrans?.trim() || isInvalidOrBrokenTranslation(synopsisTrans, synopsis));

      // Re-verify pendingChapterCount from metadata if 0
      if (pendingChapterCount === 0) {
        const total = Number(novel.total_with_content || novel.total_chapters || novel.totalChapters || 0);
        const trans = Number(novel.translated_chapters || 0);
        if (total > trans) {
          pendingChapterCount = total - trans;
        }
      }

      // Skip novel only if neither synopsis nor chapters need translation
      if (!hasPendingSynopsis && pendingChapterCount === 0) {
        job.logs.push({
          novelId: novel.id,
          novelTitle: novel.title,
          synopsisOk: !!synopsisTrans?.trim() && !isInvalidOrBrokenTranslation(synopsisTrans, synopsis),
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
            const translated = await translateText(synopsis!, "synopsis");
            const isBroken = isInvalidOrBrokenTranslation(translated, synopsis);

            if (translated?.trim() && !isBroken) {
              await apiPatch(`/api/novels/${novel.id}`, {
                synopsis_translated: translated,
              });

              job.synopsisTranslated++;
              synopsisSuccess = true;
              break;
            } else {
              console.warn(`[BackgroundTranslate] Synopsis ${novel.title} attempt ${attempt} returned broken translation.`);
              if (attempt < MAX_RETRIES && !job.aborted) {
                await new Promise((r) => setTimeout(r, attempt * 2500));
              }
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

      // === TRANSLATE CHAPTERS (BATCHED & PROTECTED AGAINST INFINITE LOOPS) ===
      let novelTranslated = 0;
      let novelFailed = 0;
      let currentChIndex = 0;
      const attemptedChapterIds = new Set<string>();

      if (pendingChapterCount > 0 && !job.aborted) {
        job.phase = "chapter";

        // Query in batches to handle large novels safely
        while (!job.aborted) {
          const batchRes = await apiGet<any>(`/api/chapters/${novelSlug}`, {
            pending: true,
            includeContent: true,
            limit: 50,
          }).catch(() => null);

          const rawBatch = batchRes?.chapters || [];
          // Exclude chapters already attempted in this run to avoid infinite loop on stubborn chapters
          const batch = rawBatch.filter((ch: any) => !attemptedChapterIds.has(ch.id));
          if (!batch || batch.length === 0) break;

          for (let i = 0; i < batch.length; i++) {
            if (job.aborted) break;

            const ch = batch[i];
            attemptedChapterIds.add(ch.id);

            const chNumber = ch.chapter_number ?? ch.chapterNumber;
            const contentOrig = ch.content_original ?? ch.contentOriginal;

            if (!contentOrig || !contentOrig.trim()) {
              continue;
            }

            currentChIndex++;
            job.currentChapterNumber = chNumber;
            job.currentChapterIndex = currentChIndex;
            let chapterSuccess = false;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
              if (job.aborted) break;
              job.attempt = attempt;

              try {
                const translated = await translateText(contentOrig, "chapter");
                const isBroken = isInvalidOrBrokenTranslation(translated, contentOrig);

                if (translated?.trim() && !isBroken) {
                  const wordCount = translated.split(/\s+/).filter(Boolean).length;

                  await apiPatch(`/api/chapters/${ch.id}`, {
                    content_translated: translated,
                    word_count_translated: wordCount,
                    translation_status: "done",
                    translated_at: new Date().toISOString(),
                  });

                  job.completedChapters++;
                  novelTranslated++;
                  chapterSuccess = true;
                  break;
                } else {
                  console.warn(`[BackgroundTranslate] Ch ${chNumber} attempt ${attempt} returned broken translation.`);
                  if (attempt < MAX_RETRIES && !job.aborted) {
                    await new Promise((r) => setTimeout(r, attempt * 2500));
                  }
                }
              } catch (err) {
                console.warn(`[BackgroundTranslate] Ch ${chNumber} attempt ${attempt}:`, err);
                if (attempt < MAX_RETRIES && !job.aborted) {
                  await new Promise((r) => setTimeout(r, attempt * 2500));
                }
              }
            }

            if (!chapterSuccess && !job.aborted) {
              novelFailed++;
              job.failedChapters++;
              // Mark as failed in DB cleanly without saving broken HTML
              await apiPatch(`/api/chapters/${ch.id}`, {
                translation_status: "failed",
              }).catch(() => {});
            }

            // Adaptive rate limit delay between chapters based on text length
            if (!job.aborted) {
              const chLength = contentOrig.length;
              let delayMs = 3000;
              if (chLength > 25000) {
                delayMs = 8000; // Bab jumbo (>25k char): beri jeda agar jendela TPM Guts AI pulih
              } else if (chLength > 15000) {
                delayMs = 4500;
              }
              await new Promise((r) => setTimeout(r, delayMs));
            }
          }
        }

        // Mark novel as having Indonesian translation if any chapter was translated
        if (novelTranslated > 0) {
          await apiPatch(`/api/novels/${novel.id}`, {
            translation_status: "id_translated",
          }).catch(() => {});
        }

        // Auto-mark translation request for this novel as COMPLETED if no more pending chapters
        await apiPatch(`/api/translation-requests/by-novel/${novel.id}`, {
          status: "COMPLETED",
        }).catch(() => {});
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

