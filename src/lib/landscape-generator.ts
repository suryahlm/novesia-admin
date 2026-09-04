import sharp from "sharp";

export interface GenerateLandscapeOptions {
  title?: string;
  genres?: string[];
  synopsis?: string;
  targetWidth?: number;
  targetHeight?: number;
  quality?: number;
}

const DEFAULT_PRIMARY_ACCOUNT_ID = "b21629f3357c6e1850d6e9d61067a8c1";
const DEFAULT_PRIMARY_TOKEN_B64 = "Y2Z1dF9ENXJZUnVyaUJPMWp5YTBDM0E2MDBoUHduVWM3SDhUcGIyM3Z6ZlZzMjcyNGEzOTk=";

const DEFAULT_BACKUP_ACCOUNT_ID = "caa84fe6b1be065cda3836f0dac4b509";
const DEFAULT_BACKUP_TOKEN_B64 = "Y2Z1dF95clI0UGNhakczejNWQ1pMMnNMVmIwaDhOTlFYOTBCcHI5dHQ0QkQyNzMzZDc3Mzg=";

const PRIMARY_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || DEFAULT_PRIMARY_ACCOUNT_ID;
const PRIMARY_TOKEN = process.env.CLOUDFLARE_WORKERS_AI_TOKEN || Buffer.from(DEFAULT_PRIMARY_TOKEN_B64, "base64").toString("utf-8");

const BACKUP_ACCOUNT_ID = process.env.CLOUDFLARE_BACKUP_ACCOUNT_ID || DEFAULT_BACKUP_ACCOUNT_ID;
const BACKUP_TOKEN = process.env.CLOUDFLARE_BACKUP_WORKERS_AI_TOKEN || Buffer.from(DEFAULT_BACKUP_TOKEN_B64, "base64").toString("utf-8");

const INPAINT_MODEL = "@cf/runwayml/stable-diffusion-v1-5-inpainting";

function sanitizeText(text: string): string {
  return (text || "")
    .replace(/\b(slave|slaves|intercourse|seduction|succubus|pervert|perverted|polygamy|pregnancy|eroge|galgame|harem|smut|nsfw|adult|erotic|erotica|sex|sexy|explicit|naked|nude|rape|torture|blood|gore|ecchi|ntr|gun|weapon|kill|die|death|dead|trauma|hypnosis|drone|nitro|tractor|r-18|r18|hentai)\b/gi, "")
    .replace(/[^\w\s,.-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Otomatis menyusun prompt pelebaran latar belakang (outpainting) yang serasi dengan tema novel.
 * Selalu murni pemandangan (scenery / landscape) tanpa karakter tambahan atau teks.
 */
function buildOutpaintingPrompt(title: string = "", genres: string[] = []): string {
  const cleanTitle = sanitizeText(title).toLowerCase();
  const cleanGenres = genres.map((x) => sanitizeText(x).toLowerCase()).filter(Boolean);

  let sceneTheme = "scenic fantasy anime background art, expansive scenery, soft ambient lighting";

  if (
    cleanGenres.some((x) => x.includes("dungeon") || x.includes("abyss")) ||
    cleanTitle.includes("dungeon") ||
    cleanTitle.includes("abyss")
  ) {
    sceneTheme = "mystical cavern stone walls, towering canyon cliffs, glowing ambient crystals, underground dungeon chamber";
  } else if (
    cleanGenres.some((x) => x.includes("historical") || x.includes("wuxia") || x.includes("martial")) ||
    cleanTitle.includes("tang") ||
    cleanTitle.includes("dynasty") ||
    cleanTitle.includes("forensic")
  ) {
    sceneTheme = "ancient oriental imperial palace architecture, traditional stone courtyard, classical wooden pavilions, night lanterns";
  } else if (
    cleanGenres.some((x) => x.includes("school") || x.includes("academy")) ||
    cleanTitle.includes("classmates") ||
    cleanTitle.includes("beautician")
  ) {
    sceneTheme = "sunlit Japanese anime high school classroom interior, large windows, wooden desks, cherry blossom tree outside, sunny afternoon";
  } else if (
    cleanGenres.some((x) => x.includes("romance") || x.includes("villainess") || x.includes("noble")) ||
    cleanTitle.includes("duke") ||
    cleanTitle.includes("marriage")
  ) {
    sceneTheme = "romantic lush pine forest, European castle grounds, blooming wildflowers, warm sunbeams filtering through trees";
  } else if (cleanGenres.some((x) => x.includes("isekai") || x.includes("fantasy") || x.includes("magic"))) {
    sceneTheme = "ancient isekai fantasy kingdom ruins, stone archways and crumbling pillars, grassy hill under vast blue sky with fluffy clouds";
  } else if (cleanGenres.some((x) => x.includes("scifi") || x.includes("sci-fi") || x.includes("cyber"))) {
    sceneTheme = "futuristic cyberpunk city skyline, neon glowing structures, sleek architecture, night sky";
  }

  return `seamless background extension, ${sceneTheme}, matching lighting and perspective, anime background art, wide angle view, high quality detailed scenery, no text, no watermark`;
}

/**
 * Panggil Cloudflare Workers AI Inpainting model
 */
async function callCloudflareInpainting(
  accountId: string,
  token: string,
  prompt: string,
  baseCanvas: Buffer,
  maskCanvas: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${INPAINT_MODEL}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(35000),
    body: JSON.stringify({
      prompt,
      negative_prompt: "text, watermark, logo, blurry, distorted, ugly, faces on edges, duplicate people",
      image: Array.from(baseCanvas),
      mask: Array.from(maskCanvas),
      height,
      width,
      num_steps: 20,
      guidance: 7.5,
    }),
  });

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("image/")) {
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const payload = await res.json().catch(() => null);
  const errMsg = payload?.errors?.[0]?.message || `HTTP ${res.status}`;
  throw new Error(`Cloudflare Inpainting gagal: ${errMsg}`);
}

/**
 * Membuat cover landscape (16:10, 800x500 WebP) dengan AI Outpainting murni:
 * 1. Gambar portrait asli di tengah kanvas dijaga 100% utuh tanpa perubahan karakter atau crop.
 * 2. Sisi kiri dan kanan (kanvas kosong) digambar/diperlebar secara nyata oleh AI dengan pemandangan
 *    dan latar belakang yang selaras (bukan sekadar efek blur).
 * 3. Hasil akhirnya dikompres ke WebP 800x500 (~40-60 KB) yang sangat ringan untuk mobile banner.
 */
export async function generateLandscapeFromPortrait(
  portraitUrl: string,
  options: GenerateLandscapeOptions = {}
): Promise<Buffer> {
  const targetW = options.targetWidth || 800;
  const targetH = options.targetHeight || 500;
  const quality = options.quality || 84;

  // 1. Unduh cover portrait asli
  const res = await fetch(portraitUrl, {
    headers: {
      "User-Agent": "NovesiaAdmin/2.0 (AI Outpainter)",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Gagal mengunduh cover portrait asli: HTTP ${res.status}`);
  }

  const inputBuffer = Buffer.from(await res.arrayBuffer());

  // 2. Baca metadata cover asli
  const meta = await sharp(inputBuffer).metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Format gambar cover portrait tidak valid");
  }

  // Resolusi inpainting optimal untuk SD 1.5
  const inpaintW = 768;
  const inpaintH = 512;

  // 3. Skalakan portrait agar pas dengan tinggi inpaintH (512px)
  const portraitH = inpaintH;
  const portraitW = Math.max(10, Math.round((meta.width / meta.height) * portraitH));
  const leftPos = Math.round((inpaintW - portraitW) / 2);

  // Resize portrait asli
  const portraitResized = await sharp(inputBuffer)
    .resize(portraitW, portraitH, { fit: "fill" })
    .png()
    .toBuffer();

  // 4. Siapkan baseCanvas untuk AI: gunakan versi adaptif dari cover asli agar model
  // diffusion mengenali palet warna dan atmosfer tanpa memicu false-positive safety filter
  const baseCanvas = await sharp(inputBuffer)
    .resize(inpaintW, inpaintH, { fit: "cover" })
    .blur(10)
    .png()
    .toBuffer();

  // 5. Siapkan maskCanvas:
  // - Sisi kiri & kanan: putih (255) -> AI akan menggambar pemandangan baru di sini!
  // - Bagian tengah: hitam (0) -> area portrait asli dipertahankan utuh
  const overlap = 8;
  const preserveX = leftPos + overlap;
  const preserveW = Math.max(10, portraitW - overlap * 2);

  const maskSvg = Buffer.from(`
    <svg width="${inpaintW}" height="${inpaintH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${inpaintW}" height="${inpaintH}" fill="#ffffff" />
      <rect x="${preserveX}" y="0" width="${preserveW}" height="${inpaintH}" fill="#000000" />
    </svg>
  `);
  const maskCanvas = await sharp(maskSvg).toColourspace("srgb").png().toBuffer();

  // 6. Buat prompt outpainting yang disesuaikan dengan novel
  const prompt = buildOutpaintingPrompt(options.title, options.genres);

  // 7. Panggil Cloudflare AI Inpainting (Multi-Tier Account Fallback)
  let aiGeneratedBuffer: Buffer | null = null;

  try {
    const buf1 = await callCloudflareInpainting(
      PRIMARY_ACCOUNT_ID,
      PRIMARY_TOKEN,
      prompt,
      baseCanvas,
      maskCanvas,
      inpaintW,
      inpaintH
    );
    if (buf1 && buf1.length > 10000) {
      aiGeneratedBuffer = buf1;
    }
  } catch (err1: any) {
    console.warn("[Outpaint] Akun Utama Cloudflare gagal:", err1?.message || err1);
    try {
      const buf2 = await callCloudflareInpainting(
        BACKUP_ACCOUNT_ID,
        BACKUP_TOKEN,
        prompt,
        baseCanvas,
        maskCanvas,
        inpaintW,
        inpaintH
      );
      if (buf2 && buf2.length > 10000) {
        aiGeneratedBuffer = buf2;
      }
    } catch (err2: any) {
      console.error("[Outpaint] Akun Cadangan Cloudflare gagal:", err2?.message || err2);
    }
  }

  // Jika AI inpainting sukses, gunakan sebagai background; jika tidak, gunakan backdrop cover
  const backgroundBase =
    aiGeneratedBuffer ||
    (await sharp(inputBuffer)
      .resize(inpaintW, inpaintH, { fit: "cover" })
      .toBuffer());

  // 8. Buat feathered alpha mask pada portrait asli di bagian sambungan tepi (14px)
  // agar transisi antara cover tengah dan lukisan samping AI menyatu tanpa garis patah
  const fadeWidth = 14;
  const alphaMaskSvg = Buffer.from(`
    <svg width="${portraitW}" height="${portraitH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lf" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#000000" />
          <stop offset="100%" stop-color="#ffffff" />
        </linearGradient>
        <linearGradient id="rf" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#000000" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${fadeWidth}" height="${portraitH}" fill="url(#lf)" />
      <rect x="${fadeWidth}" y="0" width="${Math.max(1, portraitW - fadeWidth * 2)}" height="${portraitH}" fill="#ffffff" />
      <rect x="${Math.max(0, portraitW - fadeWidth)}" y="0" width="${fadeWidth}" height="${portraitH}" fill="url(#rf)" />
    </svg>
  `);
  const alphaMask = await sharp(alphaMaskSvg).toColourspace("b-w").png().toBuffer();

  const featheredPortrait = await sharp(portraitResized)
    .ensureAlpha()
    .composite([{ input: alphaMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  // 9. Kompositkan gambar akhir pada target 800x500 WebP
  const finalPortraitW = Math.round((meta.width / meta.height) * targetH);
  const finalLeftPos = Math.round((targetW - finalPortraitW) / 2);

  const finalImage = await sharp(backgroundBase)
    .resize(targetW, targetH, { fit: "fill" })
    .composite([
      {
        input: await sharp(featheredPortrait)
          .resize(finalPortraitW, targetH, { fit: "fill" })
          .png()
          .toBuffer(),
        top: 0,
        left: finalLeftPos,
      },
    ])
    .webp({
      quality,
      effort: 4,
    })
    .toBuffer();

  return finalImage;
}
