const SCRAPER_API_URL = "http://api.scraperapi.com";
const MAX_RETRIES = 3;

/**
 * Fetch HTML dari URL via ScraperAPI (bypass Cloudflare).
 * Retry otomatis dengan exponential backoff.
 */
export async function scraperGet(url: string, renderJs = false): Promise<string | null> {
  const apiKey = process.env.SCRAPER_API_KEY;
  if (!apiKey) throw new Error("SCRAPER_API_KEY not set");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        url,
        render: renderJs ? "true" : "false",
        country_code: "us",
      });

      const resp = await fetch(`${SCRAPER_API_URL}?${params}`, {
        signal: AbortSignal.timeout(120_000),
      });

      if (resp.ok) return await resp.text();

      if (resp.status === 500 && attempt < MAX_RETRIES) {
        const backoff = (Math.random() * 5 + 3) * attempt;
        console.warn(`ScraperAPI 500 (attempt ${attempt}/${MAX_RETRIES}), retry in ${backoff.toFixed(1)}s`);
        await new Promise((r) => setTimeout(r, backoff * 1000));
        continue;
      }

      console.warn(`ScraperAPI HTTP ${resp.status} for ${url.slice(0, 60)}`);
      if (attempt < MAX_RETRIES) {
        const backoff = (Math.random() * 3 + 2) * attempt;
        await new Promise((r) => setTimeout(r, backoff * 1000));
      }
    } catch (err) {
      console.error(`ScraperAPI error:`, err);
      if (attempt < MAX_RETRIES) {
        const backoff = (Math.random() * 4 + 3) * attempt;
        await new Promise((r) => setTimeout(r, backoff * 1000));
      }
    }
  }
  return null;
}
