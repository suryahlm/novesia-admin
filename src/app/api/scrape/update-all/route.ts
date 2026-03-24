import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const maxDuration = 300; // 5 menit max

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch HTML dari Novelib
 */
async function fetchNovelibHtml(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

/**
 * Extract chapter slugs dari halaman story Novelib
 */
function extractChapterSlugs(html: string, novelibSlug: string): string[] {
  const allSlugs: string[] = [];

  // Pattern: /story/{slug}/{chapter-slug}/
  const linkRegex = new RegExp(`/story/${novelibSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([^"/#\\s]+)`, 'gi');
  const matches = [...html.matchAll(linkRegex)];
  allSlugs.push(...matches.map((m) => m[1]));

  // Deduplicate
  const unique = [...new Set(allSlugs)];

  // Filter out non-chapter slugs
  const skipWords = ['feed', 'comments', 'review', 'bookmark', 'report', 'edit', 'wp-', 'admin', 'login', 'page', 'attachment'];
  return unique.filter((s) => {
    const lower = s.toLowerCase();
    return !skipWords.some((w) => lower.includes(w)) && s.length > 1;
  });
}

/**
 * Extract chapter content dari HTML Novelib (Fictioneer theme)
 */
function extractChapterContent(html: string): string | null {
  // Strategy 1: Extract <p> tags with data-paragraph-id
  const paragraphs = [...html.matchAll(/<p[^>]*data-paragraph-id=['"][^'"]*['"][^>]*>([\s\S]*?)<\/p>/gi)];

  if (paragraphs.length > 0) {
    const texts = paragraphs
      .map((m) => cleanHtml(m[1]))
      .filter((t) => t.length > 0 && !isJunkParagraph(t));

    // Trim trailing junk
    while (texts.length > 0 && texts[texts.length - 1].length < 30) {
      const last = texts[texts.length - 1].toLowerCase();
      if (last === '***' || last === '* * *' || last.startsWith('"') || last.startsWith('\u201C')) break;
      texts.pop();
    }

    if (texts.length > 0) return texts.join('\n\n');
  }

  // Strategy 2: section.chapter__content
  const sectionMatch = html.match(/<section[^>]*class="[^"]*chapter__content[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
  if (sectionMatch) {
    const pTags = [...sectionMatch[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
    const texts = pTags.map((m) => cleanHtml(m[1])).filter((t) => t.length > 0);
    if (texts.length > 0) return texts.join('\n\n');
  }

  return null;
}

function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(?:button|a)[^>]*(?:fictioneer|data-controller|data-action)[^>]*>[\s\S]*?<\/(?:button|a)>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function isJunkParagraph(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const junkPatterns = [
    'read at novelib', 'ko-fi', 'kofi', 'support the author', 'support the translator',
    'fictioneer', 'data-fictioneer', 'data-controller', 'data-action',
    'togglemodal', 'previousnext', 'chapter-formatting', 'help support site costs',
  ];
  return junkPatterns.some((p) => lower.includes(p));
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * POST /api/scrape/update-all
 *
 * Untuk setiap novel ongoing (Novelib):
 * 1. Derive novelib_slug dari existing chapter source_url
 * 2. Fetch halaman story Novelib → extract chapter list
 * 3. Bandingkan dengan chapter yang sudah ada di DB
 * 4. Insert chapter baru → scrape content langsung
 */
export async function POST() {
  const startTime = Date.now();

  // 1. Ambil semua novel ongoing
  const { data: novels } = await supabase
    .from("nu_novels")
    .select("id, title, nu_slug, total_chapters, original_status, cover_url, source")
    .order("title", { ascending: true });

  if (!novels || novels.length === 0) {
    return NextResponse.json({ results: [], message: "Tidak ada novel" });
  }

  // Filter ongoing + novelib only
  const ongoingNovels = novels.filter((n) => {
    const status = (n.original_status || "").toLowerCase();
    const source = n.source || "novelib";
    return !status.includes("completed") && source === "novelib";
  });

  const results = [];

  for (const novel of ongoingNovels) {
    try {
      // 2. Derive novelib slug dari existing chapter source_url
      const { data: sampleChapter } = await supabase
        .from("nu_chapter_content")
        .select("source_url")
        .eq("novel_id", novel.id)
        .not("source_url", "is", null)
        .limit(1)
        .single();

      if (!sampleChapter?.source_url) {
        results.push({
          slug: novel.nu_slug,
          title: novel.title,
          oldChapters: novel.total_chapters || 0,
          newChapters: novel.total_chapters || 0,
          status: "no_change" as const,
          scraped: 0,
        });
        continue;
      }

      // Extract novelib slug: https://novelib.com/story/{slug}/{chapter}/
      const urlMatch = sampleChapter.source_url.match(/\/story\/([^/]+)\//);
      if (!urlMatch) {
        results.push({
          slug: novel.nu_slug,
          title: novel.title,
          oldChapters: novel.total_chapters || 0,
          newChapters: novel.total_chapters || 0,
          status: "error" as const,
          error: "Tidak bisa derive novelib slug",
          scraped: 0,
        });
        continue;
      }

      const novelibSlug = urlMatch[1];

      // 3. Fetch halaman story Novelib
      const storyUrl = `https://novelib.com/story/${novelibSlug}/`;
      const html = await fetchNovelibHtml(storyUrl);

      if (!html) {
        results.push({
          slug: novel.nu_slug,
          title: novel.title,
          oldChapters: novel.total_chapters || 0,
          newChapters: novel.total_chapters || 0,
          status: "error" as const,
          error: "Gagal fetch Novelib",
          scraped: 0,
        });
        continue;
      }

      // 4. Extract chapter slugs dari halaman
      const chapterSlugs = extractChapterSlugs(html, novelibSlug);

      // 5. Ambil chapter yang sudah ada di DB
      const { data: existingChapters } = await supabase
        .from("nu_chapter_content")
        .select("chapter_number, source_url")
        .eq("novel_id", novel.id);

      const existingUrls = new Set(
        (existingChapters || []).map((c) => c.source_url).filter(Boolean)
      );
      const existingCount = existingChapters?.length || 0;

      // 6. Filter chapter baru yang belum ada di DB
      const newChapterSlugs = chapterSlugs.filter((slug) => {
        const url = `https://novelib.com/story/${novelibSlug}/${slug}/`;
        return !existingUrls.has(url);
      });

      if (newChapterSlugs.length === 0) {
        results.push({
          slug: novel.nu_slug,
          title: novel.title,
          oldChapters: existingCount,
          newChapters: existingCount,
          status: "no_change" as const,
          scraped: 0,
        });
        // Delay sebelum novel berikutnya
        await sleep(2000 + Math.random() * 2000);
        continue;
      }

      // 7. Insert chapter baru ke DB + scrape content
      let scrapedCount = 0;
      const startNumber = existingCount + 1;

      for (let i = 0; i < newChapterSlugs.length; i++) {
        const chSlug = newChapterSlugs[i];
        const chUrl = `https://novelib.com/story/${novelibSlug}/${chSlug}/`;
        const chNumber = startNumber + i;
        const chTitle = chSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

        // Insert chapter row
        const { data: inserted, error: insertErr } = await supabase
          .from("nu_chapter_content")
          .upsert({
            novel_id: novel.id,
            chapter_number: chNumber,
            chapter_title: chTitle,
            source_url: chUrl,
          }, { onConflict: "novel_id,chapter_number" })
          .select("id")
          .single();

        if (insertErr || !inserted) continue;

        // Scrape chapter content
        try {
          const chHtml = await fetchNovelibHtml(chUrl);
          if (chHtml) {
            const content = extractChapterContent(chHtml);
            if (content && content.length > 50) {
              const wc = wordCount(content);
              await supabase
                .from("nu_chapter_content")
                .update({ content_original: content, word_count_original: wc })
                .eq("id", inserted.id);
              scrapedCount++;
            }
          }
        } catch {
          // Skip failed chapter, continue
        }

        // Rate limit
        await sleep(1500);
      }

      // 8. Update total_chapters di novel
      const newTotal = existingCount + newChapterSlugs.length;
      await supabase
        .from("nu_novels")
        .update({
          total_chapters: newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", novel.id);

      // 9. Log ke scrape_log
      await supabase.from("nu_scrape_log").insert({
        novel_id: novel.id,
        nu_slug: novel.nu_slug,
        status: "success",
        chapters_found: newChapterSlugs.length,
        duration_sec: 0,
      });

      results.push({
        slug: novel.nu_slug,
        title: novel.title,
        oldChapters: existingCount,
        newChapters: newTotal,
        status: "updated" as const,
        scraped: scrapedCount,
      });

      // Delay antar novel
      await sleep(3000 + Math.random() * 3000);

    } catch (err) {
      results.push({
        slug: novel.nu_slug,
        title: novel.title,
        oldChapters: novel.total_chapters || 0,
        newChapters: novel.total_chapters || 0,
        status: "error" as const,
        error: String(err).slice(0, 100),
        scraped: 0,
      });
    }
  }

  const duration = (Date.now() - startTime) / 1000;

  return NextResponse.json({
    results,
    summary: {
      total: ongoingNovels.length,
      updated: results.filter((r) => r.status === "updated").length,
      noChange: results.filter((r) => r.status === "no_change").length,
      errors: results.filter((r) => r.status === "error").length,
      totalScraped: results.reduce((sum, r) => sum + (r.scraped || 0), 0),
      duration,
    },
  });
}
