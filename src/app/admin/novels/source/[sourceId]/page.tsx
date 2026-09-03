import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";

const SOURCE_META: Record<string, { label: string; icon: string; color: string }> = {
  novelworld: { label: "NovelWorld", icon: "📚", color: "text-emerald-400" },
  talesinthevalley: { label: "TalesInTheValley", icon: "⚔️", color: "text-blue-400" },
  "98novels": { label: "98Novels", icon: "💎", color: "text-rose-400" },
  tinytranslation: { label: "TinyTranslation", icon: "🍄", color: "text-purple-400" },
  cuttlefishreads: { label: "CuttlefishReads", icon: "🦑", color: "text-amber-400" },
  transcendentaltls: { label: "TranscendentalTLS", icon: "📖", color: "text-orange-400" },
  general: { label: "General", icon: "🌐", color: "text-gray-400" },
};

async function getNovelsBySource(source: string) {
  const { data } = await supabase
    .from("nu_novels")
    .select("*")
    .eq("source", source)
    .order("created_at", { ascending: false });
  return data || [];
}

export default async function SourceNovelsPage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  const novels = await getNovelsBySource(sourceId);
  const meta = SOURCE_META[sourceId] || { label: sourceId, icon: "📖", color: "text-gray-400" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/novels" className="p-2 bg-[#12151b] border border-white/5 rounded-lg hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5 text-slate-100">
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">{novels.length} novel dari {meta.label}</p>
          </div>
        </div>
        <Link
          href="/admin/novels/new"
          className="px-4 py-2 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 text-sm font-semibold rounded-lg shadow-[0_2px_12px_-2px_rgba(221,168,58,0.45)] transition-all"
        >
          + Tambah Novel
        </Link>
      </div>

      {/* Novel Grid */}
      {novels.length === 0 ? (
        <div className="bg-[#12151b] border border-white/5 rounded-xl p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 mt-3 text-sm">Belum ada novel dari {meta.label}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {novels.map((novel) => (
            <Link
              key={novel.id}
              href={`/admin/novels/${novel.nu_slug}`}
              className="group bg-[#12151b] border border-white/5 hover:border-amber-400/30 rounded-xl overflow-hidden hover:shadow-lg transition-all flex flex-col"
            >
              <div className="aspect-[3/4.2] relative overflow-hidden bg-slate-900">
                {novel.cover_url ? (
                  <img src={novel.cover_url} alt={novel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-slate-700" />
                  </div>
                )}
                {novel.rating && (
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-300 border border-amber-500/30 font-mono">
                    ★ {novel.rating}
                  </div>
                )}
                {novel.original_status && (
                  <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    novel.original_status.toLowerCase().includes("completed")
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}>
                    {novel.original_status.toLowerCase().includes("completed") ? "Tamat" : "Ongoing"}
                  </div>
                )}
              </div>
              <div className="p-3 space-y-1.5">
                <h3 className="font-semibold text-xs leading-snug line-clamp-2 text-slate-100 group-hover:text-amber-300 transition-colors">
                  {novel.title}
                </h3>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{novel.total_chapters || 0} ch</span>
                  <span>{novel.novel_type || "Novel"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
