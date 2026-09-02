const DEFAULT_ACCOUNT_ID = "caa84fe6b1be065cda3836f0dac4b509";
const DEFAULT_TOKEN_B64 = "Y2Z1dF95clI0UGNhakczejNWQ1pMMnNMVmIwaDhOTlFYOTBCcHI5dHQ0QkQyNzMzZDc3Mzg=";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || DEFAULT_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_WORKERS_AI_TOKEN || Buffer.from(DEFAULT_TOKEN_B64, "base64").toString("utf-8");
const PRIMARY_MODEL = process.env.CLOUDFLARE_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";
const LIGHTNING_MODEL = "@cf/bytedance/stable-diffusion-xl-lightning";

const GUTSAI_API_KEY = process.env.GUTSAI_API_KEY || "sk-guts-7cd666aba27b935669cb9b3aad5bf2fe3e2f3d5e";
const GUTSAI_BASE_URL = process.env.GUTSAI_BASE_URL || "https://api.gutsai.id/v1";
const GUTSAI_MODEL = process.env.GUTSAI_MODEL || "gemini-3.7-flash";



const SENSITIVE_GENRES = ["adult", "smut", "mature", "ecchi", "erotica", "nsfw", "harem", "r-18", "r18", "hentai"];

function sanitizeGenres(genres: string[]): string[] {
  const safe = (genres || [])
    .map((g) => g.trim())
    .filter((g) => !SENSITIVE_GENRES.includes(g.toLowerCase()));

  if (safe.length === 0) {
    safe.push("Romance", "Fantasy", "Drama");
  }
  return safe;
}

function sanitizeText(text: string): string {
  return (text || "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/\b(smut|nsfw|adult|erotic|sex|explicit|naked|nude|rape|torture|blood|gore)\b/gi, "")
    .slice(0, 300)
    .trim();
}

/**
 * Otomatis membuat prompt ilustrasi cover Light Novel berkualitas tinggi & aman (PG-13)
 * berbasis judul, genre, dan ringkasan cerita menggunakan Gemini 3.7 Flash.
 */
export async function buildNovelCoverPrompt(
  title: string,
  genres: string[] = [],
  synopsis: string = ""
): Promise<string> {
  const safeGenres = sanitizeGenres(genres).join(", ");
  const cleanSynopsis = sanitizeText(synopsis);

  try {
    const res = await fetch(`${GUTSAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GUTSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: GUTSAI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are an expert anime art director and prompt engineer for Japanese light novel book covers. Output a single, safe, highly aesthetic English prompt for text-to-image AI.",
          },
          {
            role: "user",
            content: `Create an ultra-detailed image prompt for a Japanese light novel cover:
Title: "${title}"
Genres: ${safeGenres}
Theme/Story: ${cleanSynopsis}

REQUIREMENTS:
- Character art: Beautiful aesthetic anime character (expressive face, detailed hair and eyes, noble fantasy outfit, dynamic elegant pose).
- Setting: Gorgeous immersive fantasy environment, cinematic atmospheric lighting, vibrant rich color palette.
- Style: Masterpiece Japanese light novel cover art, 8k resolution, Makoto Shinkai & CloverWorks style, crisp detailed anime illustration.
- STRICT SAFETY & NEGATIVE RULES: MUST BE COMPLETELY SAFE (PG-13). Absolutely NO NSFW, NO nudity, NO text, NO typography, NO letters, NO title logos, NO watermarks, NO blurry artifacts, NO borders.
- Return ONLY the prompt paragraph in English without quotes or markdown.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 250,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      const generated = json.choices?.[0]?.message?.content?.trim();
      if (generated && generated.length > 40) {
        return generated;
      }
    }
  } catch (err) {
    console.warn("Guts AI prompt generation fallback:", err);
  }

  // Fallback template
  return `Masterpiece Japanese anime light novel cover illustration for novel "${title}". Genre: ${safeGenres}. Gorgeous anime characters with detailed eyes and hair, dynamic composition, cinematic atmospheric lighting, vibrant rich colors, intricate fantasy background, 8k resolution, Makoto Shinkai and Ufotable anime style, clean artwork, no text, no watermark, no logo, no blur.`;
}

/**
 * Panggil Cloudflare Workers AI dengan format JSON yang valid.
 */
async function callCloudflareWorkersAI(model: string, prompt: string): Promise<Buffer> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${model}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
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
  // Sanitize prompt for Pollinations
  const safePrompt = encodeURIComponent(prompt.slice(0, 400));
  const url = `https://image.pollinations.ai/prompt/${safePrompt}?width=${width}&height=${height}&model=flux&nologo=true&seed=${Date.now()}`;
  
  const res = await fetch(url, {
    headers: { "User-Agent": "NovesiaAdmin/2.0" },
  });

  if (!res.ok) {
    throw new Error(`Pollinations gagal: HTTP ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate image buffer menggunakan FLUX (Cloudflare Workers AI -> Lightning -> Pollinations).
 * Aspect ratio: 512x680 (3:4 portrait).
 */
export async function generateCoverImageBuffer(
  prompt: string,
  width: number = 512,
  height: number = 680
): Promise<Buffer> {
  // 1. Coba Cloudflare FLUX 1 Schnell
  try {
    return await callCloudflareWorkersAI(PRIMARY_MODEL, prompt);
  } catch (err1: any) {
    console.warn(`[ImageGen] Cloudflare ${PRIMARY_MODEL} error:`, err1?.message || err1);
  }

  await sleep(1000);

  // 2. Coba Cloudflare SDXL Lightning
  try {
    return await callCloudflareWorkersAI(LIGHTNING_MODEL, prompt);
  } catch (err2: any) {
    console.warn(`[ImageGen] Cloudflare ${LIGHTNING_MODEL} error:`, err2?.message || err2);
  }

  // 3. Fallback Pollinations
  try {
    return await callPollinations(prompt, width, height);
  } catch (err3: any) {
    console.error("[ImageGen] Semua provider AI image gagal:", err3);
    throw new Error(err3 instanceof Error ? err3.message : "Gagal men-generate gambar cover.");
  }
}
