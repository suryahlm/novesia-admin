const DEFAULT_PRIMARY_ACCOUNT_ID = "b21629f3357c6e1850d6e9d61067a8c1";
const DEFAULT_PRIMARY_TOKEN_B64 = "Y2Z1dF9ENXJZUnVyaUJPMWp5YTBDM0E2MDBoUHduVWM3SDhUcGIyM3Z6ZlZzMjcyNGEzOTk=";

const DEFAULT_BACKUP_ACCOUNT_ID = "caa84fe6b1be065cda3836f0dac4b509";
const DEFAULT_BACKUP_TOKEN_B64 = "Y2Z1dF95clI0UGNhakczejNWQ1pMMnNMVmIwaDhOTlFYOTBCcHI5dHQ0QkQyNzMzZDc3Mzg=";

const PRIMARY_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || DEFAULT_PRIMARY_ACCOUNT_ID;
const PRIMARY_TOKEN = process.env.CLOUDFLARE_WORKERS_AI_TOKEN || Buffer.from(DEFAULT_PRIMARY_TOKEN_B64, "base64").toString("utf-8");

const BACKUP_ACCOUNT_ID = process.env.CLOUDFLARE_BACKUP_ACCOUNT_ID || DEFAULT_BACKUP_ACCOUNT_ID;
const BACKUP_TOKEN = process.env.CLOUDFLARE_BACKUP_WORKERS_AI_TOKEN || Buffer.from(DEFAULT_BACKUP_TOKEN_B64, "base64").toString("utf-8");

const PRIMARY_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const LIGHTNING_MODEL = "@cf/bytedance/stable-diffusion-xl-lightning";

const GUTSAI_API_KEY = process.env.GUTSAI_API_KEY || "sk-guts-7cd666aba27b935669cb9b3aad5bf2fe3e2f3d5e";
const GUTSAI_BASE_URL = process.env.GUTSAI_BASE_URL || "https://api.gutsai.id/v1";
const GUTSAI_MODEL = process.env.GUTSAI_MODEL || "gemini-3.7-flash";

const SAFE_GENRES_WHITELIST = new Set([
  "action", "adventure", "comedy", "drama", "fantasy", "isekai",
  "magic", "mystery", "romance", "sci-fi", "slice of life",
  "supernatural", "historical", "school life", "martial arts",
  "reincarnation", "game", "dungeons", "monsters", "demons",
  "adventurers", "shounen", "shoujo", "seinen", "josei"
]);

function sanitizeGenres(genres: string[]): string[] {
  const safe = (genres || [])
    .map((g) => g.trim())
    .filter((g) => SAFE_GENRES_WHITELIST.has(g.toLowerCase()));

  if (safe.length === 0) {
    return ["Fantasy", "Adventure", "Magic"];
  }
  return safe.slice(0, 5);
}

function sanitizeText(text: string): string {
  return (text || "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/\b(slave|slaves|intercourse|seduction|succubus|pervert|perverted|polygamy|pregnancy|eroge|galgame|harem|smut|nsfw|adult|erotic|erotica|sex|sexy|explicit|naked|nude|rape|torture|blood|gore|ecchi|ntr|gun|weapon|kill|die|death|dead|trauma|hypnosis|drone|nitro|tractor|r-18|r18|hentai)\b/gi, "")
    .replace(/[^\w\s,.-]/gi, " ")
    .replace(/\s+/g, " ")
    .slice(0, 160)
    .trim();
}

/**
 * Otomatis membuat prompt ilustrasi cover Light Novel berkualitas tinggi bergaya 2D Anime Animator Profesional
 * berbasis judul, genre, dan ringkasan cerita menggunakan Gemini 3.7 Flash.
 */
export async function buildNovelCoverPrompt(
  title: string,
  genres: string[] = [],
  synopsis: string = ""
): Promise<string> {
  const safeGenres = sanitizeGenres(genres).join(", ");
  const cleanSynopsis = sanitizeText(synopsis);
  const cleanTitle = title
    .replace(/~/g, "-")
    .replace(/\b(slave|slaves|intercourse|seduction|succubus|pervert|perverted|polygamy|pregnancy|eroge|galgame|cheat gun|harem|smut|nsfw|adult|erotic|erotica|sex|naked|nude|rape|torture|ecchi|ntr|r-18|r18)\b/gi, "")
    .replace(/[^\w\s,.-]/gi, " ")
    .trim()
    .slice(0, 50);

  try {
    const res = await fetch(`${GUTSAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GUTSAI_API_KEY}`,
      },
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({
        model: GUTSAI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a prompt engine for 2D anime illustration. Output ONLY a single line of raw image prompt text (under 30 words). NEVER output explanations, markdown headers, quotes, or greetings.",
          },
          {
            role: "user",
            content: `Novel Title: "${cleanTitle}". Genres: ${safeGenres}. Theme: ${cleanSynopsis}.
Output a single-line 2D Japanese light novel anime cover illustration prompt in Kyoto Animation / CloverWorks style, clean lineart, soft pastel colors, no text, no watermark.`,
          },
        ],
        temperature: 0.5,
        max_tokens: 50,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      let generated = json.choices?.[0]?.message?.content?.trim() || "";
      // Strip any markdown or extra lines if AI spoke too much
      generated = generated
        .replace(/[#*`_>\[\]]/g, "")
        .replace(/Prompt:/gi, "")
        .split("\n")[0]
        .trim();

      if (generated && generated.length > 20) {
        const cleanPrompt = sanitizeText(generated);
        return `${cleanPrompt}, 2D anime key visual, Kyoto Animation style, clean lineart, soft pastel colors, no text, no watermark`;
      }
    }
  } catch (err) {
    console.warn("Guts AI prompt generation fallback:", err);
  }

  // Fallback template: Wholesome 2D Anime Light Novel Key Visual
  return `Official Japanese light novel cover illustration. 2D anime key visual by Kyoto Animation and CloverWorks. Charming young anime protagonist and noble heroine in fantasy costume, sparkling fantasy kingdom capital background, crisp fine ink lineart, subtle cel shading, soft pastel colors, clean 2D composition, no 3D, no CGI, no text, no watermark.`;
}



/**
 * Panggil Cloudflare Workers AI dengan format JSON yang valid.
 */
async function callCloudflareWorkersAI(accountId: string, token: string, model: string, prompt: string): Promise<Buffer> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify({
      prompt,
      steps: 4,
    }),
  });

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("image/")) {
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success || !payload?.result?.image) {
    const errMsg = payload?.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`Cloudflare Workers AI (${model}) gagal: ${errMsg}`);
  }

  return Buffer.from(payload.result.image, "base64");
}

async function callPollinations(prompt: string, width: number, height: number): Promise<Buffer> {
  const safeText = prompt
    .replace(/[^\w\s,.-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);

  const safePrompt = encodeURIComponent(safeText || "2D anime light novel cover illustration, Kyoto Animation style");
  const url = `https://image.pollinations.ai/prompt/${safePrompt}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}`;
  
  const res = await fetch(url, {
    headers: { "User-Agent": "NovesiaAdmin/2.0" },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    throw new Error(`Pollinations gagal: HTTP ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate image buffer menggunakan Multi-Tier Dual Cloudflare Account Pipeline:
 * 1. Primary Cloudflare Account FLUX 1 Schnell (10.000 neuron baru)
 * 2. Backup Cloudflare Account FLUX 1 Schnell (10.000 neuron)
 * 3. Primary Cloudflare Account SDXL Lightning
 * 4. Pollinations (Cadangan Terakhir)
 */
export async function generateCoverImageBuffer(
  prompt: string,
  width: number = 512,
  height: number = 680
): Promise<Buffer> {
  // 1. Coba Akun Utama Cloudflare FLUX 1 Schnell
  try {
    return await callCloudflareWorkersAI(PRIMARY_ACCOUNT_ID, PRIMARY_TOKEN, PRIMARY_MODEL, prompt);
  } catch (err1: any) {
    console.warn(`[ImageGen] Akun Utama Cloudflare (${PRIMARY_MODEL}) error:`, err1?.message || err1);
  }

  // 2. Coba Akun Cadangan Cloudflare FLUX 1 Schnell
  try {
    return await callCloudflareWorkersAI(BACKUP_ACCOUNT_ID, BACKUP_TOKEN, PRIMARY_MODEL, prompt);
  } catch (err2: any) {
    console.warn(`[ImageGen] Akun Cadangan Cloudflare (${PRIMARY_MODEL}) error:`, err2?.message || err2);
  }

  // 3. Coba Cloudflare SDXL Lightning
  try {
    return await callCloudflareWorkersAI(PRIMARY_ACCOUNT_ID, PRIMARY_TOKEN, LIGHTNING_MODEL, prompt);
  } catch (err3: any) {
    console.warn(`[ImageGen] Cloudflare ${LIGHTNING_MODEL} error:`, err3?.message || err3);
  }

  // 4. Fallback Pollinations
  try {
    return await callPollinations(prompt, width, height);
  } catch (err4: any) {
    console.error("[ImageGen] Semua provider AI image gagal:", err4);
    throw new Error(err4 instanceof Error ? err4.message : "Gagal men-generate gambar cover.");
  }
}
