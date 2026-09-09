/**
 * Isomorphic Translation Validation & Quality Detection
 * Safe for both Client Components and Server-Side execution.
 */

/**
 * Deteksi apakah teks terjemahan rusak, berupa error HTML / Cloudflare / 502 / 504,
 * atau merupakan JSON pesan error AI.
 */
export function isInvalidOrBrokenTranslation(
  translated: string | null | undefined,
  originalText?: string | null
): boolean {
  if (!translated || !translated.trim()) return true;

  const t = translated.trim();

  // 1. Deteksi halaman error HTML mentah / proxy crash / Cloudflare / Nginx
  if (
    /<!doctype\s+html/i.test(t) ||
    /<html[\s>]/i.test(t) ||
    /<head[\s>]/i.test(t) ||
    /<body[\s>]/i.test(t) ||
    /<title>.*(502|503|504|error|bad gateway|time-?out).*<\/title>/i.test(t) ||
    /502\s+bad\s+gateway/i.test(t) ||
    /504\s+gateway\s+time-?out/i.test(t) ||
    /503\s+service\s+temporarily\s+unavailable/i.test(t) ||
    /cloudflare\s+ray\s+id/i.test(t) ||
    /attention\s+required!\s*\|\s*cloudflare/i.test(t) ||
    /error\s+1015/i.test(t) ||
    /error\s+1020/i.test(t) ||
    /internal\s+server\s+error/i.test(t) ||
    /<center>nginx/i.test(t)
  ) {
    return true;
  }

  // 2. Deteksi pesan kegagalan / dump JSON dari AI
  if (
    /^gagal\s+menerjemahkan/i.test(t) ||
    /^{"error":/i.test(t) ||
    /^{\s*"message":/i.test(t) ||
    /^error:\s*/i.test(t) ||
    /^rate\s+limit\s+exceeded/i.test(t) ||
    /^too\s+many\s+requests/i.test(t) ||
    /resource\s+has\s+been\s+exhausted/i.test(t) ||
    /model\s+is\s+overloaded/i.test(t)
  ) {
    return true;
  }

  // 3. Deteksi hasil yang terpotong secara ekstrem jika teks asli panjang
  if (originalText && originalText.trim().length > 300 && t.length < 40) {
    return true;
  }

  return false;
}

/**
 * Cek apakah sebuah chapter membutuhkan terjemahan (Pending).
 * Menangani kasus:
 * - content_translated kosong / null
 * - content_translated berupa HTML error / rusak dari kegagalan sebelumnya
 * - translation_status bernilai "pending", "failed", atau "error"
 * - word_count_translated bernilai 0
 */
export function isChapterPending(chapter: {
  content_translated?: string | null;
  contentTranslated?: string | null;
  translation_status?: string | null;
  translationStatus?: string | null;
  word_count_translated?: number;
  wordCountTranslated?: number;
  content_original?: string | null;
  contentOriginal?: string | null;
}): boolean {
  const trans = chapter.content_translated ?? chapter.contentTranslated;
  const status = (chapter.translation_status ?? chapter.translationStatus ?? "").toLowerCase();
  const wordCount = chapter.word_count_translated ?? chapter.wordCountTranslated ?? 0;
  const orig = chapter.content_original ?? chapter.contentOriginal;

  // 1. Jika status secara eksplisit pending / failed / error
  if (status === "pending" || status === "failed" || status === "error") {
    return true;
  }

  // 2. Jika konten terjemahan ada di memori objek (sudah di-fetch)
  if (trans !== undefined) {
    if (!trans || !trans.trim()) return true;
    if (isInvalidOrBrokenTranslation(trans, orig)) return true;
    if (wordCount === 0 && (!orig || orig.length > 50)) return true;
    return false;
  }

  // 3. Jika hanya metadata (konten teks belum di-load ke memori):
  // Andalkan translation_status dan word_count_translated dari database
  if (status === "done" && wordCount > 0) {
    return false;
  }

  return wordCount === 0;
}
