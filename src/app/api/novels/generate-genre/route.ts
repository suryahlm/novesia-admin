import { NextRequest, NextResponse } from "next/server";

// Genre keywords mapping
const GENRE_KEYWORDS: Record<string, string[]> = {
  "Action": ["fight", "battle", "war", "sword", "combat", "warrior", "kill", "attack", "martial", "weapon", "army"],
  "Adventure": ["adventure", "journey", "explore", "quest", "discover", "travel", "expedition", "dungeon"],
  "Fantasy": ["magic", "mage", "wizard", "dragon", "elf", "demon", "enchant", "spell", "fairy", "kingdom", "mythical", "sorcerer", "immortal"],
  "Romance": ["love", "romance", "heart", "kiss", "marry", "wife", "husband", "girlfriend", "boyfriend", "affection", "beloved"],
  "Comedy": ["funny", "comedy", "humor", "laugh", "joke", "hilarious", "prank"],
  "Drama": ["drama", "conflict", "betrayal", "revenge", "tragic", "emotion", "struggle"],
  "Horror": ["horror", "ghost", "undead", "zombie", "curse", "haunt", "fear", "nightmare", "dark", "terror"],
  "Mystery": ["mystery", "detective", "clue", "secret", "hidden", "investigate", "thriller", "crime"],
  "Psychological": ["psychological", "mind", "mental", "manipulation", "insanity", "trauma"],
  "Sci-Fi": ["sci-fi", "science", "technology", "robot", "space", "alien", "future", "cyberpunk", "mecha", "ai"],
  "Slice of Life": ["daily", "everyday", "school life", "ordinary", "peaceful"],
  "Supernatural": ["supernatural", "spirit", "soul", "divine", "celestial", "heaven", "god", "deity", "occult"],
  "Martial Arts": ["martial art", "cultivation", "cultivator", "qi", "inner energy", "martial", "dantian", "sect", "elder"],
  "Harem": ["harem", "multiple wives", "beauties", "concubine"],
  "Isekai": ["isekai", "reincarnate", "transmigrate", "another world", "other world", "transported", "summoned"],
  "System": ["system", "level up", "stats", "skill tree", "status window", "game-like", "quest log", "exp", "inventory"],
  "Reincarnation": ["reincarnate", "reborn", "rebirth", "past life", "regression", "second chance", "return"],
  "Cultivation": ["cultivation", "cultivate", "immortal", "dao", "breakthrough", "tribulation", "pill", "alchemy", "sect"],
  "Wuxia": ["wuxia", "jianghu", "martial world", "swordsman", "pugilist"],
  "Xuanhuan": ["xuanhuan", "mystic", "heaven and earth", "profound"],
};

export async function POST(req: NextRequest) {
  const { title, synopsis } = await req.json();

  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

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

  // Sort by score descending, take top 5
  matchedGenres.sort((a, b) => b.score - a.score);
  const genres = matchedGenres.slice(0, 5).map((g) => g.genre);

  // Fallback
  if (genres.length === 0) {
    genres.push("General");
  }

  return NextResponse.json({ genres });
}
