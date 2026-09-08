import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Fallback keyword dictionary in case Groq is unavailable
const GENRE_KEYWORDS: Record<string, string[]> = {
  "Action": ["fight", "battle", "war", "sword", "combat", "warrior", "kill", "attack", "martial", "weapon", "army", "action"],
  "Adventure": ["adventure", "journey", "explore", "quest", "discover", "travel", "expedition", "dungeon"],
  "Fantasy": ["magic", "mage", "wizard", "dragon", "elf", "demon", "enchant", "spell", "fairy", "kingdom", "mythical", "sorcerer", "immortal", "fantasy"],
  "Romance": ["love", "romance", "heart", "kiss", "marry", "wife", "husband", "girlfriend", "boyfriend", "affection", "beloved", "josei", "shoujo"],
  "Comedy": ["funny", "comedy", "humor", "laugh", "joke", "hilarious", "prank"],
  "Drama": ["drama", "conflict", "betrayal", "revenge", "tragic", "emotion", "struggle"],
  "Horror": ["horror", "ghost", "undead", "zombie", "curse", "haunt", "fear", "nightmare", "dark", "terror"],
  "Mystery": ["mystery", "detective", "clue", "secret", "hidden", "investigate", "thriller", "crime"],
  "Psychological": ["psychological", "mind", "mental", "manipulation", "insanity", "trauma"],
  "Sci-Fi": ["sci-fi", "science", "technology", "robot", "space", "alien", "future", "cyberpunk", "mecha", "ai"],
  "Slice of Life": ["daily", "everyday", "school life", "ordinary", "peaceful", "slice of life"],
  "Supernatural": ["supernatural", "spirit", "soul", "divine", "celestial", "heaven", "god", "deity", "occult"],
  "Martial Arts": ["martial art", "cultivation", "cultivator", "qi", "inner energy", "martial", "dantian", "sect", "elder"],
  "Harem": ["harem", "multiple wives", "beauties", "concubine"],
  "Isekai": ["isekai", "reincarnate", "transmigrate", "another world", "other world", "transported", "summoned"],
  "System": ["system", "level up", "stats", "skill tree", "status window", "game-like", "quest log", "exp", "inventory"],
  "Reincarnation": ["reincarnate", "reborn", "rebirth", "past life", "regression", "second chance", "return", "reincarnation"],
  "Cultivation": ["cultivation", "cultivate", "immortal", "dao", "breakthrough", "tribulation", "pill", "alchemy", "sect"],
  "Wuxia": ["wuxia", "jianghu", "martial world", "swordsman", "pugilist"],
  "Xuanhuan": ["xuanhuan", "mystic", "heaven and earth", "profound"],
};

function fallbackKeywordMatching(title: string, synopsis?: string): string[] {
  const combined = `${title} ${synopsis || ""}`.toLowerCase();
  const matchedGenres: { genre: string; score: number }[] = [];

  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (combined.includes(kw.toLowerCase())) {
        score++;
      }
    }
    if (score > 0) {
      matchedGenres.push({ genre, score });
    }
  }

  matchedGenres.sort((a, b) => b.score - a.score);
  const result = matchedGenres.slice(0, 5).map((g) => g.genre);
  return result.length > 0 ? result : ["General"];
}

/**
 * Generate accurate novel genres using Groq AI (openai/gpt-oss-120b).
 * Fallback to keyword dictionary if AI call fails.
 */
export async function generateNovelGenres(title: string, synopsis?: string): Promise<string[]> {
  if (!title || !title.trim()) {
    return ["General"];
  }

  // 1. Coba gunakan Groq AI (openai/gpt-oss-120b)
  if (process.env.GROQ_API_KEY) {
    try {
      const prompt = `Kamu adalah pakar kurasi novel. Analisis judul dan sinopsis web novel berikut, lalu tentukan 3 hingga 5 genre yang paling tepat dan relevan.
Gunakan genre standar seperti: Action, Adventure, Fantasy, Romance, Comedy, Drama, Horror, Mystery, Psychological, Sci-Fi, Slice of Life, Supernatural, Martial Arts, Cultivation, Isekai, Transmigration, Reincarnation, System, Wuxia, Xuanhuan, Historical, Urban, Shoujo, Josei.

Judul: "${title.trim()}"
Sinopsis: "${(synopsis || "").slice(0, 1500).trim()}"

Kembalikan HANYA format JSON valid berupa array string, tanpa penjelasan apapun.
Contoh format output:
["Fantasy", "Action", "Adventure"]`;

      const response = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        temperature: 0.1,
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = response.choices[0]?.message?.content?.trim() || "[]";
      const jsonMatch = raw.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((x) => String(x).trim()).filter(Boolean).slice(0, 5);
        }
      }
    } catch (err: any) {
      console.warn("[GroqGenre] Gagal generate genre via Groq AI, menggunakan fallback kamus kata kunci:", err?.message || err);
    }
  }

  // 2. Fallback kamus kata kunci
  return fallbackKeywordMatching(title, synopsis);
}
