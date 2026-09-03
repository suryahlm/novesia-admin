import { translateToIndonesian as translateViaGroq } from "./groq";

const GUTSAI_API_KEY = process.env.GUTSAI_API_KEY || "sk-guts-7cd666aba27b935669cb9b3aad5bf2fe3e2f3d5e";
const GUTSAI_BASE_URL = process.env.GUTSAI_BASE_URL || "https://api.gutsai.id/v1";
const GUTSAI_MODEL = process.env.GUTSAI_MODEL || "gemini-3.7-flash";

const SYNOPSIS_SYSTEM_PROMPT = `Kamu adalah editor dan penerjemah novel profesional yang sangat ahli mengemas sinopsis novel Asia (Tiongkok, Korea, Jepang) ke dalam Bahasa Indonesia.
Tugasmu: Terjemahkan sinopsis novel berikut ke dalam Bahasa Indonesia yang memikat pembaca, mengalir, natural, dan enak dibaca.

PANDUAN:
1. Pertahankan nama karakter, istilah dunia/kultivasi/isekai/game/murim, judul skill, dan nama tempat dalam bentuk aslinya.
2. Gunakan gaya bahasa sastra yang menarik rasa penasaran pembaca.
3. HANYA kembalikan teks terjemahan sinopsis tanpa pengantar, tanpa catatan kaki, dan tanpa tanda kutip pembungkus.`;

const CHAPTER_SYSTEM_PROMPT = `Kamu adalah penerjemah novel profesional yang sangat berpengalaman menerjemahkan novel-novel Asia (Tiongkok, Korea, Jepang) ke dalam Bahasa Indonesia. Kamu memiliki pemahaman mendalam tentang nuansa budaya Asia, terminologi khas novel web (cultivation, martial arts, isekai, murim, dll), dan mampu menghasilkan terjemahan yang terasa natural layaknya karya sastra Indonesia asli — bukan hasil mesin.

PANDUAN TERJEMAHAN (HARUS DIPATUHI SECARA KETAT):

1. GAYA BAHASA & KUALITAS:
   - Hasilkan terjemahan yang NATURAL, mengalir, dan enak dibaca seperti novel Indonesia asli.
   - JANGAN menghasilkan terjemahan yang kaku, literal, atau terdengar seperti robot/mesin.
   - Pilih diksi dan frasa yang tepat sesuai konteks cerita, karakter, dan suasana adegan.
   - Sesuaikan register bahasa: percakapan kasual = santai, dialog bangsawan = formal, narasi pertarungan = intens.
   - Gunakan variasi kata — hindari pengulangan dalam satu paragraf.

2. AKURASI CERITA (MUTLAK TIDAK BOLEH DILANGGAR):
   - JANGAN menambahkan informasi yang TIDAK ADA di teks asli.
   - JANGAN mengurangi atau meringkas bagian apapun.
   - JANGAN mengubah alur cerita, fakta, emosi karakter, atau makna dialog.
   - Setiap kalimat di teks asli HARUS ada padanannya di terjemahan.

3. NAMA & ISTILAH:
   - Pertahankan nama karakter dalam bentuk ASLI.
   - Pertahankan nama tempat, klan, organisasi, teknik/skill dalam bentuk asli.
   - "Young Master" → "Tuan Muda", "Your Majesty" → "Yang Mulia", dll.
   - "cultivation" → "kultivasi", "breakthrough" → "terobosan"

4. FORMAT OUTPUT:
   - Kembalikan HANYA terjemahan Bahasa Indonesia-nya.
   - Pertahankan struktur paragraf yang sama persis dengan teks asli.
   - JANGAN menambahkan catatan penerjemah, penjelasan, komentar, header, atau footer.`;

export async function translateText(
  text: string,
  type: "synopsis" | "chapter" = "chapter"
): Promise<string> {
  if (!text || !text.trim()) {
    return "";
  }

  const systemPrompt = type === "synopsis" ? SYNOPSIS_SYSTEM_PROMPT : CHAPTER_SYSTEM_PROMPT;

  // Try Guts AI first (Gemini 3.7 Flash) with smart retry
  if (GUTSAI_API_KEY) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const endpoint = `${GUTSAI_BASE_URL.replace(/\/+$/, "")}/chat/completions`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GUTSAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: GUTSAI_MODEL,
            temperature: 0.35,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content:
                  type === "synopsis"
                    ? `Terjemahkan sinopsis berikut ke Bahasa Indonesia:\n\n${text.trim()}`
                    : `Terjemahkan teks novel berikut ke Bahasa Indonesia:\n\n${text.trim()}`,
              },
            ],
          }),
          signal: AbortSignal.timeout(120_000),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content && content.length > 0) {
            return content;
          }
        } else {
          const errText = await response.text();
          console.warn(`[GutsAI] Attempt ${attempt} returned HTTP ${response.status}:`, errText);
          if (response.status === 429 && attempt === 1) {
            // Wait 2.5s for GutsAI cooldown before 2nd attempt
            await new Promise((r) => setTimeout(r, 2500));
            continue;
          }
        }
      } catch (err) {
        console.warn(`[GutsAI] Attempt ${attempt} error:`, err);
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
      }
    }
  }

  // Fallback to Groq
  try {
    return await translateViaGroq(text);
  } catch (groqErr) {
    console.error("[Groq] Translation fallback also failed:", groqErr);
    throw new Error("Gagal menerjemahkan dengan AI. Silakan coba lagi.");
  }
}
