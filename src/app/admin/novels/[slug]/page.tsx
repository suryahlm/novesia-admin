import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ArrowLeft, Globe, User, Star, Calendar, Tag, Languages } from "lucide-react";
import TranslatePanel from "./TranslatePanel";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getNovel(slug: string) {
  const { data } = await supabase
    .from("nu_novels")
    .select("*")
    .eq("nu_slug", slug)
    .single();
  return data;
}

async function getChapters(novelId: string) {
  const { data } = await supabase
    .from("nu_chapter_content")
    .select("id, chapter_number, chapter_title, translation_status, word_count_original, word_count_translated, translated_at")
    .eq("novel_id", novelId)
    .order("chapter_number", { ascending: true });
  return data || [];
}

export default async function NovelDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const novel = await getNovel(slug);
  if (!novel) notFound();
  
  const chapters = await getChapters(novel.id);
  const translatedCount = chapters.filter((c) => c.translation_status === "done").length;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <Link href="/admin/novels" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-400 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
      </Link>

      {/* Novel Info */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6">
        <div className="flex gap-6">
          {/* Cover */}
          <div className="shrink-0">
            {novel.cover_url ? (
              <img src={novel.cover_url} alt={novel.title} className="w-40 h-56 object-cover rounded-xl shadow-lg" />
            ) : (
              <div className="w-40 h-56 bg-gray-800 rounded-xl flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-gray-700" />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex-1 space-y-3">
            <h1 className="text-2xl font-bold">{novel.title}</h1>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <User className="w-4 h-4 text-violet-400" />
                <span>{novel.author || "Unknown"}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Star className="w-4 h-4 text-amber-400" />
                <span>{novel.rating || "–"} / 5.0</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>{novel.total_chapters || 0} chapter</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>{novel.year || "–"}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>{novel.original_status || "Unknown"}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Languages className="w-4 h-4 text-pink-400" />
                <span>{translatedCount}/{chapters.length} diterjemahkan</span>
              </div>
            </div>

            {/* Genre Tags */}
            {novel.genres && novel.genres.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-gray-500" />
                {novel.genres.map((genre: string) => (
                  <span key={genre} className="px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-lg text-xs">
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Synopsis */}
        {novel.synopsis && (
          <div className="mt-6 pt-6 border-t border-gray-800/50">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Sinopsis</h3>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{novel.synopsis}</p>
          </div>
        )}
      </div>

      {/* Translate Panel (Client Component) */}
      <TranslatePanel novelId={novel.id} novelSlug={novel.nu_slug} chapters={chapters} />

      {/* Chapter List */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Daftar Chapter ({chapters.length})</h2>
        {chapters.length === 0 ? (
          <p className="text-gray-500 text-sm">Belum ada chapter. Gunakan panel di atas untuk menambah dan menerjemahkan chapter.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {chapters.map((ch) => (
              <div key={ch.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-600 w-10">#{ch.chapter_number}</span>
                  <span className="text-sm">{ch.chapter_title || `Chapter ${ch.chapter_number}`}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  ch.translation_status === "done" ? "bg-emerald-500/15 text-emerald-400" :
                  ch.translation_status === "translating" ? "bg-blue-500/15 text-blue-400 animate-pulse" :
                  ch.translation_status === "failed" ? "bg-red-500/15 text-red-400" :
                  "bg-gray-500/15 text-gray-400"
                }`}>
                  {ch.translation_status === "done" ? "✓ Selesai" :
                   ch.translation_status === "translating" ? "⏳ Menerjemah..." :
                   ch.translation_status === "failed" ? "✗ Gagal" : "Menunggu"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
