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
      const hasSynopsis = Boolean(synopsis && synopsis.trim().length > 0);
      const hasSynopsisTrans = Boolean(
        synopsisTrans && synopsisTrans.trim().length > 0 && !isInvalidOrBrokenTranslation(synopsisTrans, synopsis)
      );
      const needsSynopsis = hasSynopsis && !hasSynopsisTrans;
      if (needsSynopsis) {
        totalPendingSynopsis++;
      }

      const novelSlug = novel.nu_slug || novel.nuSlug || novel.id;
      let pending = 0;

      if (novel.pending_chapters !== undefined && novel.pending_chapters !== null) {
        pending = Number(novel.pending_chapters);
      } else if (novel.pendingChapters !== undefined && novel.pendingChapters !== null) {
        pending = Number(novel.pendingChapters);
      } else {
        try {
          const chaptersRes = await apiGet<any>(`/api/chapters/${novelSlug}`, { pending: true, limit: 1 });
          if (chaptersRes?.pendingCount !== undefined && chaptersRes?.pendingCount !== null) {
            pending = Number(chaptersRes.pendingCount);
          } else if (chaptersRes?.total !== undefined && chaptersRes?.total !== null) {
            pending = Number(chaptersRes.total);
          } else {
            const total = Number(novel.total_with_content || novel.total_chapters || novel.totalChapters || 0);
            const trans = Number(novel.translated_chapters || novel.translatedChapters || 0);
            pending = Math.max(0, total - trans);
          }
        } catch {
          const total = Number(novel.total_with_content || novel.total_chapters || novel.totalChapters || 0);
          const trans = Number(novel.translated_chapters || novel.translatedChapters || 0);
          pending = Math.max(0, total - trans);
        }
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
      const pendingChapterCount = novelPendingMap.get(novel.id) || 0;
      const synopsis = novel.synopsis;
      const synopsisTrans = novel.synopsis_translated || novel.synopsisTranslated;
      const hasSynopsis = Boolean(synopsis && synopsis.trim().length > 0);
      const hasSynopsisTrans = Boolean(
        synopsisTrans && synopsisTrans.trim().length > 0 && !isInvalidOrBrokenTranslation(synopsisTrans, synopsis)
      );
      const hasPendingSynopsis = hasSynopsis && !hasSynopsisTrans;

      // Skip novel only if neither synopsis nor chapters need translation
      if (!hasPendingSynopsis && pendingChapterCount === 0) {
        job.logs.push({
          novelId: novel.id,
          novelTitle: novel.title,
          synopsisOk: hasSynopsisTrans,
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
      const allNovelInFlightPromises: Promise<void>[] = [];

      if (pendingChapterCount > 0 && !job.aborted) {
        job.phase = "chapter";

        // Query in batches to handle large novels safely
        while (!job.aborted) {
          // Check if turbo mode is applicable for this batch (only if primary key is OpenKey)
          let isTurboMode = false;
          try {
            const configResp = await apiGet<any>("/api/config");
            let keysRaw = configResp?.translation_api_keys || configResp?.data?.translation_api_keys;
            if (typeof keysRaw === "string") keysRaw = JSON.parse(keysRaw);
            let candidates = (keysRaw || []).filter((k: any) => k.roles?.includes("translate_chapter"));
            candidates.sort((a: any, b: any) => (b.roles.includes("primary") ? 1 : 0) - (a.roles.includes("primary") ? 1 : 0));
            if (candidates.length > 0 && candidates[0].name.toLowerCase().includes("openkey")) {
              isTurboMode = true;
            }
          } catch(e) {}

          const batchLimit = isTurboMode ? 200 : 50;

          const batchRes = await apiGet<any>(`/api/chapters/${novelSlug}`, {
            pending: true,
            includeContent: true,
            limit: batchLimit,
          }).catch(() => null);

          const rawBatch = batchRes?.chapters || [];
          // Exclude chapters already attempted in this run to avoid infinite loop on stubborn chapters
          const batch = rawBatch.filter((ch: any) => !attemptedChapterIds.has(ch.id));
          if (!batch || batch.length === 0) break;

          const processChapter = async (ch: any) => {
            if (job.aborted) return;
            attemptedChapterIds.add(ch.id);

            const chNumber = ch.chapter_number ?? ch.chapterNumber;
            const contentOrig = ch.content_original ?? ch.contentOriginal;
            const contentTrans = ch.content_translated ?? ch.contentTranslated;

            // Skip jika konten asli kosong
            if (!contentOrig || !contentOrig.trim()) {
              return;
            }

            // [TOKEN SAVER & DOUBLE PROTECTION]
            // Skip jika chapter ini ternyata sudah memiliki terjemahan valid di database
            if (
              contentTrans &&
              contentTrans.trim().length > 50 &&
              !isInvalidOrBrokenTranslation(contentTrans, contentOrig)
            ) {
              if (ch.translation_status !== "done") {
                await apiPatch(`/api/chapters/${ch.id}`, {
                  translation_status: "done",
                }).catch(() => {});
              }
              job.completedChapters++;
              novelTranslated++;
              return;
            }

            currentChIndex++;
            job.currentChapterNumber = chNumber;
            job.currentChapterIndex = currentChIndex;
            let chapterSuccess = false;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
              if (job.aborted) break;
              job.attempt = attempt;

              try {
                const translated = await translateText(contentOrig, "chapter", {
                  novelTitle: novel.title,
                  chapterNumber: chNumber,
                  chapterTitle: ch.chapter_title ?? ch.chapterTitle,
                });
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

            // Adaptive rate limit delay between chapters based on text length (Skip delay for Turbo Mode)
            if (!job.aborted && !isTurboMode) {
              const chLength = contentOrig.length;
              let delayMs = 3000;
              if (chLength > 25000) {
                delayMs = 8000; // Bab jumbo (>25k char)
              } else if (chLength > 15000) {
                delayMs = 4500;
              }
              await new Promise((r) => setTimeout(r, delayMs));
            }
          };

          if (isTurboMode) {
            // Turbo mode: Dispatch in waves of 40 chapters with 3s delay, wait for 80% completion before next batch
            const WAVE_SIZE = 40;
            const WAVE_DELAY_MS = 3000;
            const thresholdTarget = Math.max(1, Math.ceil(batch.length * 0.8));
            let completedInBatch = 0;
            let thresholdTriggered = false;
            let triggerThreshold: () => void = () => {};

            const thresholdPromise = new Promise<void>((resolve) => {
              triggerThreshold = resolve;
            });

            console.log(
              `[BackgroundTranslate] Turbo mode ON (OpenKey). Total batch: ${batch.length} bab. Mengirim per gelombang (${WAVE_SIZE} bab / ${WAVE_DELAY_MS / 1000}s), ambang batas 80% (${thresholdTarget}/${batch.length} bab)...`
            );

            const batchPromises: Promise<void>[] = [];

            for (let i = 0; i < batch.length; i += WAVE_SIZE) {
              if (job.aborted) break;

              const wave = batch.slice(i, i + WAVE_SIZE);
              const waveNumber = Math.floor(i / WAVE_SIZE) + 1;
              const totalWaves = Math.ceil(batch.length / WAVE_SIZE);
              console.log(`[BackgroundTranslate] Menembak Wave ${waveNumber}/${totalWaves} (${wave.length} bab)...`);

              for (const ch of wave) {
                const p = (async () => {
                  try {
                    await processChapter(ch);
                  } finally {
                    completedInBatch++;
                    if (completedInBatch >= thresholdTarget && !thresholdTriggered) {
                      thresholdTriggered = true;
                      triggerThreshold();
                    }
                  }
                })();
                batchPromises.push(p);
              }

              // Beri jeda 3 detik sebelum wave berikutnya jika masih ada wave tersisa di batch ini
              if (i + WAVE_SIZE < batch.length && !job.aborted) {
                await new Promise((r) => setTimeout(r, WAVE_DELAY_MS));
              }
            }

            allNovelInFlightPromises.push(...batchPromises);

            // Tunggu hingga minimal 80% dari batch saat ini selesai sebelum lanjut mengambil batch berikutnya
            await Promise.race([
              thresholdPromise,
              Promise.all(batchPromises),
            ]);
          } else {
            // Standard mode: execute sequentially
            for (let i = 0; i < batch.length; i++) {
              if (job.aborted) break;
              await processChapter(batch[i]);
            }
          }
        } // end while

        // Pastikan seluruh in-flight request dari semua wave/batch selesai sebelum menandai status novel
        if (allNovelInFlightPromises.length > 0) {
          await Promise.all(allNovelInFlightPromises);
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

