import { apiGet } from "@/lib/apiClient";

export const dynamic = 'force-dynamic'; // Selalu fetch fresh, tidak di-cache
import Link from "next/link";
import NovelGrid from "./NovelGrid";

// Source definitions — add new sources here
const NOVEL_SOURCES = [
  { id: "akknovel", label: "AkkNovel", icon: "✨", color: "from-rose-500 to-pink-600", shadow: "shadow-rose-500/20" },
  { id: "talesinthevalley", label: "TalesInTheValley", icon: "⚔️", color: "from-blue-600 to-cyan-600", shadow: "shadow-blue-500/20" },
  { id: "tinytranslation", label: "TinyTranslation", icon: "🍄", color: "from-purple-600 to-fuchsia-600", shadow: "shadow-purple-500/20" },
  { id: "cuttlefishreads", label: "CuttlefishReads", icon: "🦑", color: "from-amber-600 to-orange-600", shadow: "shadow-amber-500/20" },
  { id: "knoxtspace", label: "KnoxTSpace", icon: "🪐", color: "from-amber-500 to-yellow-600", shadow: "shadow-amber-500/20" },
  { id: "general", label: "General", icon: "🌐", color: "from-gray-600 to-slate-600", shadow: "shadow-gray-500/20" },
];

async function getNovels() {
  try {
    const data = await apiGet<any[]>('/api/novels/all');
    return (data || []).filter(
      (n: any) => !n.is_blacklisted && ["active", "completed", "ongoing", "published", "draft"].includes(n.status)
    );
  } catch (err) {
    console.error("Failed to load novels:", err);
    return [];
  }
}

async function getSourceCounts() {
  try {
    const stats = await apiGet<any>('/api/novels/stats');
    if (stats?.sourceCounts) return stats.sourceCounts;
    const novels = await getNovels();
    const counts: Record<string, number> = {};
    novels.forEach((n: any) => {
      const src = n.source;
      if (src) counts[src] = (counts[src] || 0) + 1;
    });
    return counts;
  } catch {
    return {};
  }
}

export default async function NovelsListPage() {
  const novels = await getNovels();
  const sourceCounts = await getSourceCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Daftar Novel
          </h1>
          <p className="text-slate-400 text-xs mt-1">{novels.length} novel tersimpan</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/novels/new"
            className="px-4 py-2 bg-gradient-to-r from-[#B99762] to-[#8C6D3B] hover:brightness-110 text-black text-sm font-bold rounded-lg shadow-lg shadow-[#B99762]/20 transition-all"
          >
            + Tambah Novel
          </Link>
        </div>
      </div>

      {/* Source Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {NOVEL_SOURCES.map((src) => {
          const count = sourceCounts[src.id] || 0;
          return (
            <Link
              key={src.id}
              href={`/admin/novels/source/${src.id}`}
              className="bg-[#12151b] border border-white/5 hover:border-[#B99762]/30 rounded-xl p-3 flex items-center gap-3 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#B99762]/10 border border-[#B99762]/20 flex items-center justify-center text-base shrink-0">
                {src.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 group-hover:text-[#D4A843] transition-colors truncate">
                  {src.label}
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{count} novel</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Filter + Novel Grid (Client Component) */}
      <NovelGrid novels={novels} />
    </div>
  );
}
