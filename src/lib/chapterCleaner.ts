/**
 * Chapter Cleaner Utility (Admin & Translation Engine)
 * 
 * Membersihkan sampah navigasi situs sumber (Previous/Next Chapter, TOC, Bab Sebelumnya, dll.),
 * link donasi / media sosial / promosi (Ko-fi, Patreon, Discord, Trakteer, dll.),
 * catatan penerjemah / credit translator, serta duplikasi judul bab/novel
 * di awalan dan akhiran konten chapter.
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

const PROMO_OR_SOCIAL_PATTERNS: RegExp[] = [
  /ko-fi(?:\.com)?/i,
  /buy\s*(?:me\s*)?(?:a\s*)?(?:coffee|ko-fi)/i,
  /patreon(?:\.com)?/i,
  /(?:paypal\.(?:me|com)|pay\s*pal|^paypal\b)/i,
  /(?:discord\.(?:gg|com)|(?:join|gabung|my|our)\s*(?:our|the)?\s*discord|^discord\b)/i,
  /\b(?:trakteer|saweria)\b/i,
  /\((?:opens?\s*in\s*(?:a\s*)?new\s*tab|terbuka\s*di\s*tab\s*baru|buka\s*di\s*tab\s*baru)\)/i,
  /support\s*(?:the\s*)?(?:translator|author|translation)/i,
  /dukung\s*(?:penerjemah|penulis)/i,
  /rate\s*(?:this\s*)?(?:novel|chapter)/i,
  /beri\s*nilai\s*(?:novel|bab)/i,
  /give\s*(?:the\s*)?novel\s*a\s*(?:decent\s*)?rating/i,
  /review\s*on\s*novelupdates/i,
  /read\s*(?:ahead|more)\s*on\s*(?:patreon|ko-fi)/i,
  /baca\s*lebih\s*cepat\s*di/i,
  /visit\s*.*scans/i,
  /kunjungi\s*.*scans/i,
  /gabung\s*discord/i,
];

const NOTE_CREDIT_PATTERNS: RegExp[] = [
  /^(?:catatan|note)\b.*?dari\s+[\w\s.-]{2,50}$/i,
  /^[\w\s.-]{1,50}?\s*(?:note|catatan)\s+from\s+[\w\s.-]{2,50}$/i,
  /^(?:tl(?:\/n)?\s*note|tl\/n|tn|translator(?:'s)?\s*note|catatan\s*penerjemah|editor(?:'s)?\s*note|catatan\s*editor|author(?:'s)?\s*note|catatan\s*penulis)\b/i,
  /^(?:translated\s*by|diterjemahkan\s*oleh|edited\s*by|disunting\s*oleh|proofread\s*by)\b/i,
  /^(?:translator|penerjemah|editor|proofreader)\s*[:\-–—]/i,
  /^(?:end\s*of\s*chapter|akhir\s*bab|chapter\s*\d+\s*end|bab\s*\d+\s*selesai)\b/i,
];

export function isNavigationLine(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 200) return false;
  return NAVIGATION_PATTERNS.some((p) => p.test(t));
}

export function isPromoOrNoteLine(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 250) return false;
  return PROMO_OR_SOCIAL_PATTERNS.some((p) => p.test(t)) || NOTE_CREDIT_PATTERNS.some((p) => p.test(t));
}

export function isTitleOrHeaderLine(text: string, meta?: ChapterCleanerMeta): boolean {
  const t = text.trim();
  if (!t || t.length > 160) return false;

  const chNum = meta?.chapterNumber;
  const novelTitle = meta?.novelTitle;
  const chTitle = meta?.chapterTitle;

  // 1. Any line with Chapter/Bab + number + colon/dash/dot (even with novel name prefix without sentence punctuation)
  if (/^(?:.*?\s*)?(?:chapter|bab)\s*\d+\s*[:\.\-·•—]/i.test(t)) {
    if (!/[.!?]$/.test(t) && t.length < 130) return true;
  }

  // 2. Standalone Chapter / Bab number
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

  // 1. Clean head (up to first 6 paragraphs)
  let headCheckLimit = Math.min(6, list.length);
  while (list.length > 0 && headCheckLimit > 0) {
    const first = list[0];
    if (isNavigationLine(first) || isTitleOrHeaderLine(first, meta) || isPromoOrNoteLine(first)) {
      list.shift();
      headCheckLimit--;
    } else {
      break;
    }
  }

  // 2. Clean tail (up to last 10 paragraphs)
  let tailCheckLimit = Math.min(10, list.length);
  while (list.length > 0 && tailCheckLimit > 0) {
    const last = list[list.length - 1];
    if (isNavigationLine(last) || isTitleOrHeaderLine(last, meta) || isPromoOrNoteLine(last)) {
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
