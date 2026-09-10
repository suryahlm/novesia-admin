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

async function getInitialData() {
  try {
    const [stats, initialNovelsRes] = await Promise.all([
      apiGet<any>('/api/novels/stats').catch(() => ({})),
      apiGet<any>('/api/novels', { page: 1, limit: 24, sortBy: 'newest' }).catch(() => ({})),
    ]);

    const novelsList = initialNovelsRes?.novels || initialNovelsRes?.data || [];
    const total = Number(initialNovelsRes?.total ?? stats?.totalNovels ?? novelsList.length);
    const genres = stats?.genreMap ? Object.keys(stats.genreMap).sort() : [];

    return {
      novels: novelsList,
      total,
      draftCount: Number(stats?.draftCount || 0),
      noCoverCount: Number(stats?.noCoverCount || 0),
      sourceCounts: stats?.sourceCounts || {},
      genres,
    };
  } catch (err) {
    console.error("Failed to load initial novels:", err);
    return {
      novels: [],
      total: 0,
      draftCount: 0,
      noCoverCount: 0,
      sourceCounts: {},
      genres: [],
    };
  }
}

export default async function NovelsListPage() {
  const { novels, total, draftCount, noCoverCount, sourceCounts, genres } = await getInitialData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Daftar Novel
          </h1>
          <p className="text-slate-400 text-xs mt-1">{total} novel tersimpan</p>
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

      {/* Filter + Novel Grid with Infinite Scroll */}
      <NovelGrid
        initialNovels={novels}
        initialTotal={total}
        initialDraftCount={draftCount}
        initialNoCoverCount={noCoverCount}
        initialGenres={genres}
      />
    </div>
  );
}
