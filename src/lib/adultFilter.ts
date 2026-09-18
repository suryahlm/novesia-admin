/**
 * adultFilter.ts
 * Utility sentral untuk klasifikasi konten dewasa / 18+ (NSFW / Mature / Smut / Ecchi / Erotica / Eroge / Hentai)
 * Digunakan untuk:
 * 1. Filter UI di Admin Panel (Tab khusus 18+ & Sub-filter per sumber)
 * 2. Deteksi otomatis saat scraper memasukkan novel baru
 * 3. Pemisahan alur translasi agar model AI mainstream tidak terkena sensor filter safety
 */

export const ADULT_GENRES_AND_TAGS = new Set([
  // Dewasa / Mature / NSFW / Erotica
  "adult",
  "mature",
  "smut",
  "erotica",
  "eroge",
  "r-18",
  "r18",
  "18+",
  "hentai",
  "netorare",
  "ntr",
  "netori",
  "ecchi",

  // Kriminal & Investigasi & Kekerasan / Gore (Sensitif untuk sensor AI)
  "crime",
  "criminal",
  "criminal investigation",
  "murder",
  "gore",
  "bloody",
  "torture",
  "serial killer",
  "homicide",
]);

export const ADULT_TITLE_REGEX = /\b(r-?18|18\+|hentai|eroge|erotic|cuckold|netorare|netori|smut|ecchi|sex(?:ual)?|incest|succubus|brothel|aphrodisiac|sensual|criminal\s+investigation|murder|killer(?!\s+whale)|corpse|autopsy|crime|homicide|serial\s+killer|slaughter|torture|bloody|gore)\b/i;

export const ADULT_SYNOPSIS_REGEX = /\b(r-?18|18\+|hentai|eroge|cuckold|netorare|netori|smut|sexually\s+explicit|erotic\s+novel|h-novel|criminal\s+investigation|murder\s+case|serial\s+killer|autopsy|corpse|brutal\s+murder|homicide|bloody\s+scene|torture)\b/i;

export function isAdultNovel(novel: {
  genres?: string[] | null;
  tags?: string[] | null;
  title?: string | null;
  synopsis?: string | null;
}): boolean {
  if (!novel) return false;

  // 1. Cek Genre
  if (Array.isArray(novel.genres)) {
    for (const g of novel.genres) {
      if (g && ADULT_GENRES_AND_TAGS.has(String(g).toLowerCase().trim())) {
        return true;
      }
    }
  } else if (typeof novel.genres === "string" && novel.genres) {
    const parts = (novel.genres as string).split(/[,|]/);
    for (const p of parts) {
      if (p && ADULT_GENRES_AND_TAGS.has(p.toLowerCase().trim())) {
        return true;
      }
    }
  }

  // 2. Cek Tags
  if (Array.isArray(novel.tags)) {
    for (const t of novel.tags) {
      if (t && ADULT_GENRES_AND_TAGS.has(String(t).toLowerCase().trim())) {
        return true;
      }
    }
  } else if (typeof novel.tags === "string" && novel.tags) {
    const parts = (novel.tags as string).split(/[,|]/);
    for (const p of parts) {
      if (p && ADULT_GENRES_AND_TAGS.has(p.toLowerCase().trim())) {
        return true;
      }
    }
  }

  // 3. Cek Judul
  if (novel.title && ADULT_TITLE_REGEX.test(novel.title)) {
    return true;
  }

  // 4. Cek Sinopsis (Khusus kata kunci eksplisit dengan kepastian tinggi)
  if (novel.synopsis && ADULT_SYNOPSIS_REGEX.test(novel.synopsis)) {
    return true;
  }

  return false;
}
