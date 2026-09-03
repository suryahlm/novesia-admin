const DEFAULT_ACCOUNT_ID = "caa84fe6b1be065cda3836f0dac4b509";
const DEFAULT_TOKEN_B64 = "Y2Z1dF95clI0UGNhakczejNWQ1pMMnNMVmIwaDhOTlFYOTBCcHI5dHQ0QkQyNzMzZDc3Mzg=";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || DEFAULT_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_WORKERS_AI_TOKEN || Buffer.from(DEFAULT_TOKEN_B64, "base64").toString("utf-8");
const PRIMARY_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const LIGHTNING_MODEL = "@cf/bytedance/stable-diffusion-xl-lightning";

const GUTSAI_API_KEY = process.env.GUTSAI_API_KEY || "sk-guts-7cd666aba27b935669cb9b3aad5bf2fe3e2f3d5e";
const GUTSAI_BASE_URL = process.env.GUTSAI_BASE_URL || "https://api.gutsai.id/v1";
const GUTSAI_MODEL = process.env.GUTSAI_MODEL || "gemini-3.7-flash";

const SENSITIVE_GENRES = ["adult", "smut", "mature", "ecchi", "erotica", "nsfw", "harem", "r-18", "r18", "hentai", "ntr", "ntr-adjacent", "hypnosis", "hypnosis powers", "cheat gun"];

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
    .replace(/\b(smut|nsfw|adult|erotic|erotica|sex|explicit|naked|nude|rape|torture|blood|gore|harem|ecchi|ntr|gun|weapon|kill|die|death|dead|trauma|hypnosis|drone|nitro|tractor)\b/gi, "")
    .slice(0, 200)
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
  const cleanTitle = title.replace(/~/g, "-").replace(/cheat gun|harem/gi, "Fantasy").slice(0, 60);

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
              "You are an expert Japanese light novel cover art director. Output a concise (under 40 words), safe, 2D anime illustration prompt in English. NEVER use generic AI words like photorealistic, 8k, 3D, CGI.",
          },
          {
            role: "user",
            content: `Novel: "${cleanTitle}". Genres: ${safeGenres}. Story: ${cleanSynopsis}.
Write a concise 2D anime key visual cover prompt: Authentic Japanese light novel cover illustration, Kyoto Animation & CloverWorks 2D style, charming anime characters in fantasy outfit, crisp lineart, subtle cel shading, soft pastel colors, no text, no watermark.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 120,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      const generated = json.choices?.[0]?.message?.content?.trim();
      if (generated && generated.length > 30) {
        return generated.replace(/["']/g, "").slice(0, 250);
      }
    }
  } catch (err) {
    console.warn("Guts AI prompt generation fallback:", err);
  }

  // Fallback template: Concise 2D Anime Light Novel Key Visual
  return `Official Japanese light novel cover illustration. 2D anime key visual by Kyoto Animation and CloverWorks. Charming anime protagonist and graceful heroine in fantasy costume, crisp fine ink lineart, subtle cel shading, soft pastel colors, clean 2D composition, no 3D, no CGI, no text, no watermark.`;
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
    signal: AbortSignal.timeout(10000),
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

const DEFAULT_SILICONFLOW_KEY_B64 = "c2steWxueXdwY3d4Ym5mY2draGZhZXh1aW9tdWx3b2dxZHBocW1sa211ZGNnamhyaWVk";
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || Buffer.from(DEFAULT_SILICONFLOW_KEY_B64, "base64").toString("utf-8");
const SILICONFLOW_BASE_URL = process.env.SILICONFLOW_BASE_URL || "https://api.siliconflow.com/v1";

/**
 * Panggil SiliconFlow FLUX.1-schnell dengan API Key resmi.
 */
async function callSiliconFlow(prompt: string): Promise<Buffer> {
  const url = `${SILICONFLOW_BASE_URL}/images/generations`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(18000),
    body: JSON.stringify({
      model: "black-forest-labs/FLUX.1-schnell",
      prompt,
      image_size: "512x680",
      num_inference_steps: 4,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(`SiliconFlow (${res.status}): ${errData?.message || res.statusText}`);
  }

  const json = await res.json();
  const imageUrl = json.images?.[0]?.url || json.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("SiliconFlow tidak mengembalikan URL gambar.");
  }

  const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
  if (!imgRes.ok) {
    throw new Error("Gagal mengunduh gambar hasil render SiliconFlow.");
  }

  const arrayBuffer = await imgRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function callPollinations(prompt: string, width: number, height: number): Promise<Buffer> {
  // Sanitize prompt for Pollinations - keep clean and concise
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate image buffer menggunakan multi-tier provider:
 * 1. Cloudflare Workers AI FLUX
 * 2. SiliconFlow FLUX.1 Schnell (API Key Resmi)
 * 3. Cloudflare SDXL Lightning
 * 4. Pollinations (Cadangan Terakhir)
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

  // 2. Coba SiliconFlow FLUX.1-schnell (Sangat Cepat & Stabil)
  try {
    return await callSiliconFlow(prompt);
  } catch (err2: any) {
    console.warn("[ImageGen] SiliconFlow error:", err2?.message || err2);
  }

  // 3. Coba Cloudflare SDXL Lightning
  try {
    return await callCloudflareWorkersAI(LIGHTNING_MODEL, prompt);
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


