import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Genre keywords mapping (sama dengan versi tunggal)
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

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid array of IDs" }, { status: 400 });
    }

    // 1. Fetch novel data from DB (we only need id, title, and synopsis)
    // Supabase IN query to get multiple items
    const { data: novels, error: fetchError } = await supabase
      .from("nu_novels")
      .select("id, title, synopsis")
      .in("id", ids);

    if (fetchError) throw fetchError;
    if (!novels || novels.length === 0) {
      return NextResponse.json({ error: "Novels not found" }, { status: 404 });
    }

    let updatedCount = 0;

    // 2. Process each novel
    for (const novel of novels) {
      const combined = `${novel.title} ${novel.synopsis || ""}`.toLowerCase();
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
      const generatedGenres = matchedGenres.slice(0, 5).map((g) => g.genre);

      // Fallback
      if (generatedGenres.length === 0) {
        generatedGenres.push("General");
      }

      // 3. Update DB
      const { error: updateError } = await supabase
        .from("nu_novels")
        .update({ genres: generatedGenres })
        .eq("id", novel.id);

      if (!updateError) {
        updatedCount++;
      } else {
        console.error(`Gagal update genre untuk novel ID ${novel.id}:`, updateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil meng-generate genre untuk ${updatedCount} dari ${novels.length} novel.`,
      updated: updatedCount,
    });
  } catch (error: any) {
    console.error("Bulk Generate Genre Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
