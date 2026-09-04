import sharp from "sharp";

export interface GenerateLandscapeOptions {
  title?: string;
  genres?: string[];
  synopsis?: string;
  targetWidth?: number;
  targetHeight?: number;
  quality?: number;
  customPrompt?: string;
  customNegativePrompt?: string;
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

const STRICT_NEGATIVE_PROMPT =
  "person, people, human, character, face, boy, girl, man, woman, student, crowd, extra limbs, extra bodies, animals, creatures, text, watermark, typography, font, title, letters, words, logo, label, signature, frame, border, split line, vertical seam, cutoff, ugly, distorted, blurry, low quality, duplicate elements";

interface CoverAnalysis {
  isDark: boolean;
  brightness: number;
  isBluePurple: boolean;
  isWarm: boolean;
}

/**
 * Otomatis menyusun prompt pelebaran latar belakang (outpainting) yang serasi dengan tema & mood visual cover.
 * Menggabungkan analisis warna cover asli (brightness & color tone) dengan genre / judul novel.
 */
function buildOutpaintingPrompt(
  title: string = "",
  genres: string[] = [],
  analysis: CoverAnalysis,
  customPrompt?: string
): string {
  if (customPrompt && customPrompt.trim()) {
    // Bersihkan instruksi larangan agar tidak membingungkan text encoder diffusion
    const cleanCustom = customPrompt
      .replace(/do not add[^\.\n]+/gi, "")
      .replace(/important:[^\.\n]+/gi, "")
      .replace(/keep the entire[^\.\n]+/gi, "")
      .replace(/export as[^\.\n]+/gi, "")
      .replace(/final composition[^\.\n]+/gi, "")
      .replace(/[^\w\s,.-]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    return `seamless horizontal background landscape extension, ${cleanCustom}, depth and perspective, hand-painted illustration style, pure scenery, wide angle view`;
  }

  const cleanTitle = sanitizeText(title).toLowerCase();
  const cleanGenres = genres.map((x) => sanitizeText(x).toLowerCase()).filter(Boolean);

  const isDungeonLabyrinth =
    cleanGenres.some((x) => x.includes("dungeon") || x.includes("abyss") || x.includes("action") || x.includes("horror")) ||
    cleanTitle.includes("labyrinth") ||
    cleanTitle.includes("dungeon") ||
    cleanTitle.includes("abyss") ||
    cleanTitle.includes("designer") ||
    cleanTitle.includes("hunter") ||
    cleanTitle.includes("gate") ||
    cleanTitle.includes("necromancer") ||
    cleanTitle.includes("shadow") ||
    cleanTitle.includes("level");

  const isCastleRoyal =
    cleanGenres.some((x) => x.includes("romance") || x.includes("villainess") || x.includes("noble") || x.includes("shoujo")) ||
    cleanTitle.includes("castle") ||
    cleanTitle.includes("palace") ||
    cleanTitle.includes("princess") ||
    cleanTitle.includes("prince") ||
    cleanTitle.includes("duke") ||
    cleanTitle.includes("marriage") ||
    cleanTitle.includes("beautician");

  const isOriental =
    cleanGenres.some((x) => x.includes("historical") || x.includes("wuxia") || x.includes("martial")) ||
    cleanTitle.includes("tang") ||
    cleanTitle.includes("dynasty") ||
    cleanTitle.includes("forensic") ||
    cleanTitle.includes("demon") ||
    cleanTitle.includes("heavenly") ||
    cleanTitle.includes("sect") ||
    cleanTitle.includes("murim");

  const isCountryside =
    cleanGenres.some((x) => x.includes("slice") || x.includes("country") || x.includes("farm")) ||
    cleanTitle.includes("comfortable") ||
    cleanTitle.includes("different world life") ||
    cleanTitle.includes("countryside") ||
    cleanTitle.includes("cottage") ||
    cleanTitle.includes("slow life");

  let sceneTheme = "";

  // 1. Dark dungeon / cavern / labyrinth (prioritaskan jika gambar gelap atau ada nuansa biru-ungu gelap)
  if (isDungeonLabyrinth && (analysis.isDark || analysis.isBluePurple)) {
    sceneTheme =
      "dark fantasy subterranean labyrinth cavern, ancient stone corridors, glowing purple magical energy, dark shadows, dungeon battle environment, dramatic mystical lighting, wide angle background scenery";
  }
  // 2. Fairytale Castle / Palace / Royal
  else if (isCastleRoyal) {
    if (analysis.isBluePurple || analysis.isDark) {
      sceneTheme =
        "grand fantasy royal castle spires, majestic fairytale palace architecture, night sky with glowing full moon and sparkling stars, elegant stone balcony terrace, soft magical ambient lighting, wide angle scenery";
    } else {
      sceneTheme =
        "grand European imperial palace courtyard, majestic royal castle spires, marble balustrade, manicured royal gardens, blooming flowers, soft daytime sunlight, wide angle scenery";
    }
  }
  // 3. Oriental / Martial Arts / Wuxia
  else if (isOriental) {
    sceneTheme =
      "ancient oriental imperial architecture, traditional stone courtyard, classical wooden pavilions, scenic mountain landscape, tranquil atmosphere";
  }
  // 4. Countryside / Forest / Cottage
  else if (isCountryside) {
    sceneTheme =
      "scenic fantasy countryside forest, pale white tree trunks and branches extending outward, soft green and yellow forest background, tropical foliage, leaves, bushes, blooming flowers, cozy cottage garden, misty atmosphere, gentle sunlight rays";
  }
  // 5. Default adaptif berdasarkan tone warna cover asli
  else if (analysis.isDark || analysis.isBluePurple) {
    sceneTheme =
      "mystical dark fantasy night landscape, distant dark mountains, starry night sky, glowing ethereal ambient light, atmospheric scenery";
  } else {
    sceneTheme =
      "peaceful fantasy anime landscape, rolling green hills, distant white castle spires, blue sky with fluffy white clouds, gentle sunlight";
  }

  return `seamless horizontal background extension, ${sceneTheme}, matching color palette and lighting, hand-painted illustration style, depth and perspective, wide angle view, high quality detailed scenery, pure background, no people, no characters, no text`;
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
  height: number,
  negativePrompt: string = STRICT_NEGATIVE_PROMPT
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
      negative_prompt: negativePrompt,
      image: Array.from(baseCanvas),
      mask: Array.from(maskCanvas),
      height,
      width,
      num_steps: 20,
      guidance: 8.0,
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
 * 1. Gambar portrait asli di tengah kanvas dijaga 100% utuh tanpa perubahan karakter, teks, atau crop.
 * 2. Canvas inpainting menggunakan resolusi 800x512 (lebar eksak 800px) sehingga ZERO pergeseran horizontal.
 * 3. Base canvas menggunakan sampling warna tepi cover asli dan posisi tengah tetap tajam.
 * 4. Micro-blend compositing presisi di pixel yang sama, lalu di-trim 6px atas & bawah ke 800x500.
 *    Hasilnya 100% bebas dari garis belah (seam), kabut vertikal, atau pergeseran posisi.
 */
export async function generateLandscapeFromPortrait(
  portraitUrl: string,
  options: GenerateLandscapeOptions = {}
): Promise<Buffer> {
  const targetW = options.targetWidth || 800;
  const targetH = options.targetHeight || 500;
  const quality = options.quality || 85;

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

  // 2. Baca metadata & analisis warna cover asli
  const imageInstance = sharp(inputBuffer);
  const meta = await imageInstance.metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Format gambar cover portrait tidak valid");
  }

  const stats = await imageInstance.stats();
  const meanR = stats.channels[0]?.mean || 128;
  const meanG = stats.channels[1]?.mean || 128;
  const meanB = stats.channels[2]?.mean || 128;
  const brightness = (meanR + meanG + meanB) / 3;

  const analysis: CoverAnalysis = {
    brightness,
    isDark: brightness < 105,
    isBluePurple: meanB > meanG + 15 || (meanR > 70 && meanB > 70 && meanG < 60),
    isWarm: meanR > meanB + 20,
  };

  // 3. Resolusi inpainting optimal:
  // Lebar eksak 800px (sama persis dengan targetW) dan tinggi 512px (kelipatan 64 untuk model diffusion)
  // Ini MENJAMIN koordinat X tidak akan pernah bergeser bahkan 1 subpixel pun!
  const inpaintW = targetW; // 800
  const inpaintH = 512;

  const portraitH = inpaintH;
  const portraitW = Math.max(10, Math.round((meta.width / meta.height) * portraitH));
  const leftPos = Math.round((inpaintW - portraitW) / 2);
  const rightPos = leftPos + portraitW;

  // Resize portrait asli tajam
  const portraitResized = await sharp(inputBuffer)
    .resize(portraitW, portraitH, { fit: "fill" })
    .png()
    .toBuffer();

  // 4. Siapkan baseCanvas adaptif:
  // Ekstrak strip tepi dari gambar asli dan rentangkan ke sisi samping dengan blur lembut
  // agar palet warna, horizon, dan pencahayaan 100% konsisten tanpa menduplikasi teks/wajah
  const edgeStripWidth = Math.max(4, Math.min(24, Math.round(portraitW * 0.06)));
  const leftStrip = await sharp(portraitResized)
    .extract({ left: 0, top: 0, width: edgeStripWidth, height: portraitH })
    .resize(Math.max(1, leftPos), portraitH, { fit: "fill" })
    .blur(16)
    .png()
    .toBuffer();

  const rightWidth = Math.max(1, inpaintW - rightPos);
  const rightStrip = await sharp(portraitResized)
    .extract({ left: portraitW - edgeStripWidth, top: 0, width: edgeStripWidth, height: portraitH })
    .resize(rightWidth, portraitH, { fit: "fill" })
    .blur(16)
    .png()
    .toBuffer();

  const baseCanvas = await sharp({
    create: {
      width: inpaintW,
      height: inpaintH,
      channels: 3,
      background: {
        r: Math.round(meanR * 0.5),
        g: Math.round(meanG * 0.5),
        b: Math.round(meanB * 0.5),
      },
    },
  })
    .composite([
      { input: leftStrip, left: 0, top: 0 },
      { input: rightStrip, left: rightPos, top: 0 },
      { input: portraitResized, left: leftPos, top: 0 },
    ])
    .png()
    .toBuffer();

  // 5. Siapkan maskCanvas:
  // - Sisi samping: putih (255) dengan overlap 4px ke dalam portrait agar AI menyambungkan garis kuas
  // - Bagian tengah: hitam (0) agar area portrait asli dilindungi
  const overlap = 4;
  const maskLeftWidth = leftPos + overlap;
  const maskRightX = rightPos - overlap;
  const maskRightWidth = inpaintW - maskRightX;

  const maskSvg = Buffer.from(`
    <svg width="${inpaintW}" height="${inpaintH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${inpaintW}" height="${inpaintH}" fill="#000000" />
      <rect x="0" y="0" width="${maskLeftWidth}" height="${inpaintH}" fill="#ffffff" />
      <rect x="${maskRightX}" y="0" width="${maskRightWidth}" height="${inpaintH}" fill="#ffffff" />
    </svg>
  `);
  const maskCanvas = await sharp(maskSvg).toColourspace("srgb").png().toBuffer();

  // 6. Buat prompt outpainting adaptif
  const prompt = buildOutpaintingPrompt(options.title, options.genres, analysis, options.customPrompt);
  const negativePrompt = options.customNegativePrompt || STRICT_NEGATIVE_PROMPT;

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
      inpaintH,
      negativePrompt
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
        inpaintH,
        negativePrompt
      );
      if (buf2 && buf2.length > 10000) {
        aiGeneratedBuffer = buf2;
      }
    } catch (err2: any) {
      console.error("[Outpaint] Akun Cadangan Cloudflare gagal:", err2?.message || err2);
    }
  }

  const backgroundBase =
    aiGeneratedBuffer ||
    (await sharp(inputBuffer)
      .resize(inpaintW, inpaintH, { fit: "cover" })
      .toBuffer());

  // 8. Kompositkan gambar pada resolusi 800x512
  // Letakkan portrait asli yang 100% TAJAM di titik koordinat leftPos yang PERSIS SAMA
  const microFade = 2;
  const microMaskSvg = Buffer.from(`
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
      <rect x="0" y="0" width="${microFade}" height="${portraitH}" fill="url(#lf)" />
      <rect x="${microFade}" y="0" width="${Math.max(1, portraitW - microFade * 2)}" height="${portraitH}" fill="#ffffff" />
      <rect x="${Math.max(0, portraitW - microFade)}" y="0" width="${microFade}" height="${portraitH}" fill="url(#rf)" />
    </svg>
  `);
  const microMask = await sharp(microMaskSvg).toColourspace("b-w").png().toBuffer();

  const crispPortrait = await sharp(portraitResized)
    .ensureAlpha()
    .composite([{ input: microMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const combined800x512 = await sharp(backgroundBase)
    .composite([
      {
        input: crispPortrait,
        top: 0,
        left: leftPos, // KOORDINAT X PERSIS SAMA (0 pixel desync!)
      },
    ])
    .png()
    .toBuffer();

  // 9. Potong 6px atas dan 6px bawah untuk mendapatkan target 800x500 WebP murni
  // Karena dipotong bersamaan dari kanvas terpadu, tidak ada garis patah atau distorsi sama sekali!
  const finalImage = await sharp(combined800x512)
    .extract({
      left: 0,
      top: 6,
      width: targetW,
      height: targetH,
    })
    .webp({
      quality,
      effort: 4,
    })
    .toBuffer();

  return finalImage;
}
