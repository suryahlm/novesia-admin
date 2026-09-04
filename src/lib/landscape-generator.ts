import sharp from "sharp";

export interface GenerateLandscapeOptions {
  targetWidth?: number;
  targetHeight?: number;
  blurRadius?: number;
  quality?: number;
}

/**
 * Membuat cover landscape (16:10, default 800x500 WebP) dari cover portrait yang sudah ada.
 *
 * PRINSIP KERJA:
 * 1. Gambar portrait asli dipertahankan 100% di bagian tengah tanpa distorsi / tidak di-crop.
 * 2. Sisi kiri dan kanan (kanvas kosong) diperlebar secara otomatis menggunakan latar
 *    belakang atmosferik yang diambil dari warna, pencahayaan, dan tone karya aslinya.
 * 3. Menghasilkan file WebP (~35-50 KB) yang sangat ringan untuk banner mobile carousel.
 */
export async function generateLandscapeFromPortrait(
  portraitUrl: string,
  options: GenerateLandscapeOptions = {}
): Promise<Buffer> {
  const targetW = options.targetWidth || 800;
  const targetH = options.targetHeight || 500;
  const blurRadius = options.blurRadius || 28;
  const quality = options.quality || 84;

  // 1. Download cover portrait asli
  const res = await fetch(portraitUrl, {
    headers: {
      "User-Agent": "NovesiaAdmin/2.0 (Landscape Generator)",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Gagal mengunduh cover portrait asli: HTTP ${res.status}`);
  }

  const inputBuffer = Buffer.from(await res.arrayBuffer());

  // 2. Baca metadata gambar asli
  const meta = await sharp(inputBuffer).metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Format gambar cover portrait tidak valid");
  }

  // 3. Skalakan portrait agar tinggi pas dengan targetH (500px) tanpa merubah rasio asli
  const portraitH = targetH;
  const portraitW = Math.max(10, Math.round((meta.width / meta.height) * portraitH));

  const portraitResized = await sharp(inputBuffer)
    .resize(portraitW, portraitH, { fit: "fill" })
    .toBuffer();

  // 4. Buat extended atmospheric backdrop (800x500) dari gambar asli
  // Cover asli di-scale memenuhi 800x500 lalu diberi Gaussian blur sinematik
  const backdrop = await sharp(inputBuffer)
    .resize(targetW, targetH, { fit: "cover", position: "center" })
    .blur(blurRadius)
    .modulate({ brightness: 0.82, saturation: 1.15 })
    .toBuffer();

  // 5. Buat overlay vignette lembut di tepi samping agar menyatu sempurna dengan dark theme
  const leftPos = Math.round((targetW - portraitW) / 2);

  const vignetteSvg = Buffer.from(`
    <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vig" cx="50%" cy="50%" r="70%">
          <stop offset="35%" stop-color="#000000" stop-opacity="0" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.45" />
        </radialGradient>
      </defs>
      <rect width="${targetW}" height="${targetH}" fill="url(#vig)" />
    </svg>
  `);

  // 6. Kompositkan: backdrop + vignette + portrait asli di tengah secara presisi
  const finalImage = await sharp(backdrop)
    .composite([
      { input: vignetteSvg, top: 0, left: 0 },
      { input: portraitResized, top: 0, left: leftPos },
    ])
    .webp({
      quality,
      effort: 4,
    })
    .toBuffer();

  return finalImage;
}
