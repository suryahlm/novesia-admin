/**
 * Test parser baru dengan junk filter
 */
async function main() {
  const url = 'https://novelib.com/story/a-right-to-abandon-you/aray-3/';
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await r.text();
  
  // Inline the parser logic
  const paragraphs = [...html.matchAll(/<p[^>]*data-paragraph-id=['"][^'"]*['"][^>]*>([\s\S]*?)<\/p>/gi)];
  console.log('Raw paragraphs:', paragraphs.length);

  function cleanHtml(h) {
    return h.replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<(?:button|a)[^>]*(?:fictioneer|data-controller|data-action)[^>]*>[\s\S]*?<\/(?:button|a)>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8220;/g, '\u201C').replace(/&#8221;/g, '\u201D')
      .replace(/&#8217;/g, '\u2019').replace(/&#8216;/g, '\u2018').replace(/&#8230;/g, '\u2026')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
      .replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
  }

  function isJunkParagraph(text) {
    const lower = text.toLowerCase().trim();
    const exactJunk = ['series', 'ko-fi', 'bookmark', 'subscribe', 'previousnext', 'previous', 'next'];
    if (exactJunk.includes(lower)) return true;
    const junkPatterns = ['read at novelib', 'ko-fi', 'kofi', 'support the author', 'support the translator',
      'you can support', 'follow on ko-fi', 'subscribe', 'fictioneer', 'data-fictioneer', 'data-controller',
      'togglemodal', 'scrolltobookmark', 'fastclick', 'openfullscreen', 'closefullscreen', 'previousnext',
      'bookmarkscroll', 'formatting-modal', 'aria-label', 'chapter-formatting', 'font-size'];
    return junkPatterns.some(p => lower.includes(p));
  }

  let texts = paragraphs.map(m => cleanHtml(m[1])).filter(t => t.length > 0 && !isJunkParagraph(t));
  
  // Trim trailing short junk
  while (texts.length > 0 && texts[texts.length - 1].length < 30) {
    const last = texts[texts.length - 1].toLowerCase();
    if (last === '***' || last.startsWith('"') || last.startsWith('\u201C')) break;
    texts.pop();
  }

  console.log('After filtering:', texts.length, 'paragraphs\n');
  console.log('=== FIRST 3 ===');
  texts.slice(0, 3).forEach((t, i) => console.log(`[${i}] ${t.substring(0, 100)}...`));
  console.log('\n=== LAST 3 ===');
  texts.slice(-3).forEach((t, i) => console.log(`[${texts.length - 3 + i}] ${t.substring(0, 100)}...`));
  
  console.log('\n=== JUNK CHECK ===');
  const hasJunk = ['fictioneer', 'Ko-Fi', 'Subscribe', 'Bookmark', 'PreviousNext', 'Read at Novelib', 'support']
    .filter(p => texts.join(' ').toLowerCase().includes(p.toLowerCase()));
  console.log(hasJunk.length === 0 ? '✅ COMPLETELY CLEAN!' : '❌ Still has: ' + hasJunk.join(', '));
}

main().catch(console.error);
