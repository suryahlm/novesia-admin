import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";

const SOURCE_META: Record<string, { label: string; icon: string; color: string }> = {
  novelworld: { label: "NovelWorld", icon: "📚", color: "text-emerald-400" },
  skynovelvault: { label: "SkyNovelVault", icon: "⚔️", color: "text-blue-400" },
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
        <div className="flex items-center gap-4">
          <Link href="/admin/novels" className="p-2 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span>{meta.icon}</span>
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                {meta.label}
              </span>
            </h1>
            <p className="text-gray-500 mt-1">{novels.length} novel dari {meta.label}</p>
          </div>
        </div>
        <Link
          href="/admin/novels/new"
          className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl text-sm font-semibold shadow-lg shadow-violet-500/20 transition-all"
        >
          + Tambah Novel
        </Link>
      </div>

      {/* Novel Grid */}
      {novels.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-700 mx-auto" />
          <p className="text-gray-500 mt-4">Belum ada novel dari {meta.label}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {novels.map((novel) => (
            <Link
              key={novel.id}
              href={`/admin/novels/${novel.nu_slug}`}
              className="group bg-gray-900/50 border border-gray-800/50 rounded-2xl overflow-hidden hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300"
            >
              <div className="aspect-[3/4] relative overflow-hidden bg-gray-800">
                {novel.cover_url ? (
                  <img src={novel.cover_url} alt={novel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-gray-700" />
                  </div>
                )}
                {novel.rating && (
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-amber-400">
                    ★ {novel.rating}
                  </div>
                )}
                {novel.original_status && (
                  <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-medium backdrop-blur-sm ${
                    novel.original_status.toLowerCase().includes("completed")
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-blue-500/20 text-blue-300"
                  }`}>
                    {novel.original_status.toLowerCase().includes("completed") ? "Tamat" : "Ongoing"}
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-violet-300 transition-colors">
                  {novel.title}
                </h3>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{novel.total_chapters || 0} ch</span>
                  <span>{novel.novel_type || "Novel"}</span>
                </div>
                {novel.genres && novel.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {novel.genres.slice(0, 3).map((genre: string) => (
                      <span key={genre} className="px-2 py-0.5 bg-gray-800/80 rounded-md text-[10px] text-gray-400">
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
