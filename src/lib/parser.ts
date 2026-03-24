/**
 * parser.ts — Parse metadata novel dari HTML NovelUpdates
 */

interface NovelInfo {
  title: string;
  synopsis: string;
  postId: number | null;
  slug: string;
  coverSrc: string | null;
  genres: string[];
  tags: string[];
  novelType: string;
  author: string;
  artist: string;
  year: number | null;
  originalStatus: string;
  translationStatus: string;
  rating: number | null;
  associatedNames: string[];
  publisher: string;
  language: string;
  totalChapters: number;
}

/**
 * Parse HTML NovelUpdates dan extract metadata novel.
 * Digunakan server-side di API route.
 */

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function parseNovelHtml(html: string, pageUrl: string): NovelInfo {
  // Gunakan regex-based parsing (tidak perlu jsdom dependency)
  const text = (selector: string, attr?: string): string => {
    if (attr) {
      const regex = new RegExp(`id="${selector}"[^>]*${attr}="([^"]*)"`, "i");
      const match = html.match(regex);
      return match?.[1]?.trim() || "";
    }
    // innerText via regex
    const regex = new RegExp(`id="${selector}"[^>]*>([\\s\\S]*?)<\\/`, "i");
    const match = html.match(regex);
    return match?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
  };

  // Title
  const titleMatch = html.match(/class="seriestitlenu"[^>]*>([^<]+)/);
  const title = decodeHtmlEntities(titleMatch?.[1]?.trim() || "Unknown Title");

  // Synopsis
  const synopsisMatch = html.match(/id="editdescription"[^>]*>([\s\S]*?)<\/div>/i);
  let synopsis = "";
  if (synopsisMatch) {
    synopsis = synopsisMatch[1]
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim();
  }

  // Post ID
  let postId: number | null = null;
  const postIdMatch = html.match(/id="mypostid"[^>]*value="(\d+)"/);
  if (postIdMatch) postId = parseInt(postIdMatch[1]);

  // Slug
  let slug = "";
  const slugMatch = pageUrl.match(/\/series\/([^/]+)\/?/);
  if (slugMatch) slug = slugMatch[1];

  // Cover
  let coverSrc: string | null = null;
  const coverMatch = html.match(/class="seriesimg"[\s\S]*?<img[^>]+src="([^"]+)"/);
  if (coverMatch) coverSrc = coverMatch[1];
  if (!coverSrc) {
    const coverMatch2 = html.match(/class="serieseditimg"[\s\S]*?<img[^>]+src="([^"]+)"/);
    if (coverMatch2) coverSrc = coverMatch2[1];
  }

  // Genre
  const genres: string[] = [];
  const genreMatches = html.matchAll(/id="seriesgenre"[\s\S]*?<a[^>]*class="genre"[^>]*>([^<]+)/gi);
  // Simpler approach: find all genre links
  const genreSection = html.match(/id="seriesgenre"[^>]*>([\s\S]*?)<\/div>/i);
  if (genreSection) {
    const genreLinks = genreSection[1].matchAll(/>([^<]+)<\/a>/g);
    for (const m of genreLinks) {
      const g = m[1].trim();
      if (g) genres.push(g);
    }
  }

  // Tags
  const tags: string[] = [];
  const tagSection = html.match(/id="showtags"[^>]*>([\s\S]*?)<\/div>/i);
  if (tagSection) {
    const tagLinks = tagSection[1].matchAll(/>([^<]+)<\/a>/g);
    for (const m of tagLinks) {
      const t = m[1].trim();
      if (t && t !== "Search for series with same tag") tags.push(t);
    }
  }

  // Type
  const typeMatch = html.match(/class="stype"[^>]*>([^<]+)/);
  const novelType = typeMatch?.[1]?.trim() || "";

  // Author
  const authorMatch = html.match(/id="(?:authtag|showauth)"[^>]*>[\s\S]*?<a[^>]*>([^<]+)/i);
  const author = authorMatch?.[1]?.trim() || "";

  // Artist
  const artistMatch = html.match(/id="(?:artiststag|showartists)"[^>]*>[\s\S]*?<a[^>]*>([^<]+)/i);
  const artist = artistMatch?.[1]?.trim() || "";

  // Year
  let year: number | null = null;
  const yearMatch = html.match(/id="edityear"[^>]*>(\d{4})/);
  if (yearMatch) year = parseInt(yearMatch[1]);

  // Status
  const statusMatch = html.match(/id="editstatus"[^>]*>([\s\S]*?)<\/div>/i);
  const originalStatus = statusMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || "";

  // Translation status
  const transMatch = html.match(/id="showtranslated"[^>]*>([\s\S]*?)<\/div>/i);
  const translationStatus = transMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || "";

  // Rating
  let rating: number | null = null;
  const ratingMatch = html.match(/class="uvotes"[^>]*>[^(]*\((\d+\.?\d*)/);
  if (ratingMatch) rating = parseFloat(ratingMatch[1]);

  // Associated Names
  const associatedNames: string[] = [];
  const assocMatch = html.match(/id="editassociated"[^>]*>([\s\S]*?)<\/div>/i);
  if (assocMatch) {
    const names = assocMatch[1].split(/<br\s*\/?>/i);
    for (const n of names) {
      const clean = n.replace(/<[^>]+>/g, "").trim();
      if (clean) associatedNames.push(clean);
    }
  }

  // Publisher
  const pubMatch = html.match(/id="showopublisher"[^>]*>[\s\S]*?<a[^>]*>([^<]+)/i);
  const publisher = pubMatch?.[1]?.trim() || "";

  // Language
  const langMatch = html.match(/id="showlang"[^>]*>([\s\S]*?)<\/div>/i);
  const language = langMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || "";

  // Total chapters from status text
  let totalChapters = 0;
  const chMatch = originalStatus.match(/(\d+)\s*Chapters?/i);
  if (chMatch) totalChapters = parseInt(chMatch[1]);
  // Fallback: from table
  if (totalChapters === 0) {
    const tableMatches = html.matchAll(/\bc(\d+)\b/g);
    let maxCh = 0;
    for (const m of tableMatches) {
      const n = parseInt(m[1]);
      if (n > maxCh) maxCh = n;
    }
    totalChapters = maxCh;
  }

  return {
    title, synopsis, postId, slug, coverSrc,
    genres, tags, novelType, author, artist, year,
    originalStatus, translationStatus, rating,
    associatedNames, publisher, language, totalChapters,
  };
}
