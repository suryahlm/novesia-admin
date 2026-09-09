/**
 * Chapter Cleaner Utility (Admin & Translation Engine)
 * 
 * Membersihkan sampah navigasi situs sumber (Previous/Next Chapter, TOC, Bab Sebelumnya, dll.)
 * dan duplikasi judul bab/novel di awalan serta akhiran konten chapter.
 */

export interface ChapterCleanerMeta {
  novelTitle?: string | null;
  chapterNumber?: number | null;
  chapterTitle?: string | null;
}

const NAVIGATION_PATTERNS: RegExp[] = [
  /^(?:ch(?:apter)?\.?\s*\d*\s*)?(?:previous|prev)\s*(?:chapter|chap)?(?:\s*\(.*?\))?(?:\s*(?:table\s*of\s*)?contents?|\s*toc|\s*index)?$/i,
  /^(?:ch(?:apter)?\.?\s*\d*\s*)?(?:next)\s*(?:chapter|chap)?(?:\s*\(.*?\))?$/i,
  /^(?:table\s*of\s*contents?|contents?|toc|index)$/i,
  /^(?:bab\s*\d*\s*)?(?:bab\s*sebelumnya|sebelumnya)(?:\s*\(.*?\))?(?:\s*daftar\s*isi)?$/i,
  /^(?:bab\s*\d*\s*)?(?:bab\s*selanjutnya|selanjutnya)(?:\s*\(.*?\))?$/i,
  /^(?:daftar\s*isi|isi)$/i,
  /^(?:ch(?:apter)?\.?\s*\d*\s*)?(?:previous|prev)\s*chapter.*contents?$/i,
  /^(?:bab\s*\d*\s*)?(?:bab\s*sebelumnya).*daftar\s*isi$/i,
  /^(?:<<|<|«)\s*(?:prev|previous|sebelumnya)\s*(?:chapter|bab)?$/i,
  /^(?:next|selanjutnya)\s*(?:chapter|bab)?\s*(?:>>|>|»)$/i,
  /^(?:\[\s*)?(?:previous|next|contents?|toc|bab sebelumnya|bab selanjutnya|daftar isi)(?:\s*chapter|\s*bab)?\s*(?:\])?$/i,
  /^(?:<<\s*)?(?:previous|prev|bab sebelumnya)\s*[\|\/\-–—]\s*(?:next|selanjutnya|contents?|daftar isi)(?:\s*>>)?/i,
  /^click\s*here\s*for\s*(?:the\s*)?next\s*chapter$/i,
  /^klik\s*di\s*sini\s*untuk\s*bab\s*selanjutnya$/i,
  /^(?:home|homepage)\s*[\|\/]\s*(?:previous|next|toc)/i,
];

export function isNavigationLine(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 200) return false;
  return NAVIGATION_PATTERNS.some((p) => p.test(t));
}

export function isTitleOrHeaderLine(text: string, meta?: ChapterCleanerMeta): boolean {
  const t = text.trim();
  if (!t || t.length > 160) return false;

  const chNum = meta?.chapterNumber;
  const novelTitle = meta?.novelTitle;
  const chTitle = meta?.chapterTitle;

  // 1. Any line with Chapter/Bab + number + colon/dash/dot (even with novel name prefix without sentence punctuation)
  // e.g. 'Chapter 16: Exploding Fish', 'Bab 16: Ikan Meledak', 'Forced to take over...Chapter 16: Exploding Fish'
  if (/^(?:.*?\s*)?(?:chapter|bab)\s*\d+\s*[:\.\-·•—]/i.test(t)) {
    if (!/[.!?]$/.test(t) && t.length < 130) return true;
  }

  // 2. Standalone Chapter / Bab number, e.g. 'Chapter 16', 'Bab 16'
  if (/^(?:.*?\s*)?(?:chapter|bab)\s*\d+\s*$/i.test(t) && t.length < 80) {
    return true;
  }

  // 3. Starts with or matches novel title
  if (novelTitle && novelTitle.length > 3) {
    const cleanT = t.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const cleanNovel = novelTitle.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (cleanT.startsWith(cleanNovel) && t.length < novelTitle.length + 120) {
      return true;
    }
  }

  // 4. Matches chapter title
  if (chTitle && chTitle.length > 3) {
    const cleanT = t.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const cleanCh = chTitle.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (cleanT === cleanCh) return true;
  }

  // 5. Line contains Chapter/Bab X without sentence punctuation
  if (chNum !== undefined && chNum !== null) {
    try {
      const titleRegex = new RegExp(
        "^[^\n.?!]{0,100}\\b(?:chapter|bab)\\s*" +
          chNum +
          "(?:\\s*[:.·•—\\-]\\s*[^\n.?!]*)?$",
        "i"
      );
      if (titleRegex.test(t)) return true;
    } catch {
      // safe fallback
    }
  }

  return false;
}

export function cleanChapterParagraphs(
  paragraphs: string[],
  meta?: ChapterCleanerMeta
): string[] {
  if (!paragraphs || paragraphs.length === 0) return [];
  const list = [...paragraphs];

  // 1. Clean head (up to first 5 paragraphs)
  let headCheckLimit = Math.min(5, list.length);
  while (list.length > 0 && headCheckLimit > 0) {
    const first = list[0];
    if (isNavigationLine(first) || isTitleOrHeaderLine(first, meta)) {
      list.shift();
      headCheckLimit--;
    } else {
      break;
    }
  }

  // 2. Clean tail (up to last 5 paragraphs)
  let tailCheckLimit = Math.min(5, list.length);
  while (list.length > 0 && tailCheckLimit > 0) {
    const last = list[list.length - 1];
    if (isNavigationLine(last) || isTitleOrHeaderLine(last, meta)) {
      list.pop();
      tailCheckLimit--;
    } else {
      break;
    }
  }

  return list;
}

export function cleanChapterText(text: string, meta?: ChapterCleanerMeta): string {
  if (!text || typeof text !== "string") return "";
  const paras = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const cleaned = cleanChapterParagraphs(paras, meta);
  return cleaned.join("\n\n");
}
