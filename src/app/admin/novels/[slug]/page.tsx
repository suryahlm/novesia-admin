import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import NovelEditor from "./NovelEditor";
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
      {/* Back */}
      <Link href="/admin/novels" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-400 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
      </Link>

      {/* Novel Editor (Client Component) */}
      <NovelEditor novel={novel} />

      {/* Translate Panel */}
      <TranslatePanel novelId={novel.id} novelSlug={novel.nu_slug} chapters={chapters} />

      {/* Chapter List */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Daftar Chapter ({chapters.length})</h2>
        {chapters.length === 0 ? (
          <p className="text-gray-500 text-sm">Belum ada chapter.</p>
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
