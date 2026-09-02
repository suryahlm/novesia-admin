const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
const MODEL = process.env.CLOUDFLARE_IMAGE_MODEL ?? "@cf/black-forest-labs/flux-2-klein-4b";
const FALLBACK_MODEL = process.env.CLOUDFLARE_IMAGE_FALLBACK_MODEL ?? "@cf/black-forest-labs/flux-1-schnell";

const GUTSAI_API_KEY = process.env.GUTSAI_API_KEY || "sk-guts-7cd666aba27b935669cb9b3aad5bf2fe3e2f3d5e";
const GUTSAI_BASE_URL = process.env.GUTSAI_BASE_URL || "https://api.gutsai.id/v1";
const GUTSAI_MODEL = process.env.GUTSAI_MODEL || "gemini-3.7-flash";

/**
 * Otomatis membuat prompt ilustrasi cover Light Novel berkualitas tinggi
 * berbasis judul, genre, dan ringkasan cerita menggunakan Gemini 3.7 Flash.
 */
export async function buildNovelCoverPrompt(
  title: string,
  genres: string[] = [],
  synopsis: string = ""
): Promise<string> {
  try {
    const genresStr = genres?.length ? genres.join(", ") : "Fantasy, Romance, Adventure";
    const cleanSynopsis = (synopsis || "")
      .replace(/<[^>]*>?/gm, "")
      .slice(0, 350)
      .trim();

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
              "You are an expert anime art director and prompt engineer for Japanese light novel book covers. Output a single vivid, highly aesthetic English prompt for FLUX text-to-image AI.",
          },
          {
            role: "user",
            content: `Create an ultra-detailed image prompt for a Japanese light novel cover:
Title: "${title}"
Genres: ${genresStr}
Synopsis: ${cleanSynopsis}

REQUIREMENTS:
- Describe aesthetic character visual (expressive anime face, detailed hair and eyes, dynamic pose, stylish fantasy attire), stunning immersive environment, rich lighting, and vibrant color harmony.
- Art Style: Masterpiece Japanese light novel cover art, 8k resolution, Makoto Shinkai & CloverWorks style, cinematic anime lighting, crisp high detail.
- STRICT NEGATIVE RULES: Absolutely NO text, NO typography, NO letters, NO title logos, NO watermarks, NO blurry artifacts, NO borders.
- Return ONLY the prompt text in English. Do not add quotes, introductory text, or markdown.`,
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

  // Fallback manual template
  const genresStr = genres?.length ? genres.slice(0, 4).join(", ") : "Fantasy, Romance";
  return `Masterpiece Japanese anime light novel cover illustration for "${title}". Genre: ${genresStr}. Gorgeous anime characters with detailed eyes and hair, dynamic composition, cinematic atmospheric lighting, vibrant rich colors, intricate fantasy background, 8k resolution, Makoto Shinkai and Ufotable anime style, clean artwork, no text, no watermark, no logo, no blur.`;
}

async function callFlux(model: string, prompt: string, width: number, height: number): Promise<Buffer> {
  if (!ACCOUNT_ID || !TOKEN) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID atau CLOUDFLARE_WORKERS_AI_TOKEN belum diatur.");
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${model}`;
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", String(width));
  form.append("height", String(height));

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    const errMsg = payload?.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`Cloudflare Workers AI (${model}) gagal: ${errMsg}`);
  }
  return Buffer.from(payload.result.image, "base64");
}

async function callPollinationsFlux(prompt: string, width: number, height: number): Promise<Buffer> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=flux&nologo=true&seed=${Date.now()}`;
  const res = await fetch(url, { headers: { "User-Agent": "NovesiaAdmin/2.0" } });
  if (!res.ok) {
    throw new Error(`Pollinations FLUX gagal: HTTP ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate image buffer menggunakan FLUX (Cloudflare Workers AI -> Fallback model -> Pollinations FLUX).
 * Aspect ratio hemat: 512x680 (Rasio 3:4 portrait, hemat token & neuron, ukuran file ringan untuk app).
 */
export async function generateCoverImageBuffer(
  prompt: string,
  width: number = 512,
  height: number = 680
): Promise<Buffer> {
  try {
    return await callFlux(MODEL, prompt, width, height);
  } catch (err1) {

    console.warn(`Cloudflare model ${MODEL} gagal, mencoba fallback...`, err1);
    await sleep(1500);
    try {
      return await callFlux(FALLBACK_MODEL, prompt, width, height);
    } catch (err2) {
      console.warn(`Cloudflare fallback model ${FALLBACK_MODEL} gagal, mencoba Pollinations FLUX...`, err2);
      return await callPollinationsFlux(prompt, width, height);
    }
  }
}
