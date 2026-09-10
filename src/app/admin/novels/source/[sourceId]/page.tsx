import { apiGet } from "@/lib/apiClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NovelGrid from "../../NovelGrid";

export const dynamic = 'force-dynamic';

const SOURCE_META: Record<string, { label: string; icon: string; color: string }> = {
  akknovel: { label: "AkkNovel", icon: "✨", color: "text-rose-400" },
  talesinthevalley: { label: "TalesInTheValley", icon: "⚔️", color: "text-blue-400" },
  tinytranslation: { label: "TinyTranslation", icon: "🍄", color: "text-purple-400" },
  cuttlefishreads: { label: "CuttlefishReads", icon: "🦑", color: "text-amber-400" },
  knoxtspace: { label: "KnoxTSpace", icon: "🪐", color: "text-amber-400" },
  transcendentaltls: { label: "TranscendentalTLS", icon: "📖", color: "text-orange-400" },
  general: { label: "General", icon: "🌐", color: "text-gray-400" },
};

async function getInitialSourceData(sourceId: string) {
  try {
    const [stats, initialNovelsRes] = await Promise.all([
      apiGet<any>('/api/novels/stats', { source: sourceId }).catch(() => ({})),
      apiGet<any>('/api/novels', { source: sourceId, page: 1, limit: 24, sortBy: 'newest' }).catch(() => ({})),
    ]);

    const novelsList = initialNovelsRes?.novels || initialNovelsRes?.data || [];
    const total = Number(initialNovelsRes?.total ?? stats?.totalNovels ?? novelsList.length);
    const genres = stats?.genreMap ? Object.keys(stats.genreMap).sort() : [];

    return {
      novels: novelsList,
      total,
      draftCount: Number(stats?.draftCount || 0),
      noCoverCount: Number(stats?.noCoverCount || 0),
      genres,
    };
  } catch (err) {
    console.error("Failed to load source novels:", err);
    return {
      novels: [],
      total: 0,
      draftCount: 0,
      noCoverCount: 0,
      genres: [],
    };
  }
}

export default async function SourceNovelsPage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  const meta = SOURCE_META[sourceId] || { label: sourceId, icon: "📖", color: "text-gray-400" };
  const { novels, total, draftCount, noCoverCount, genres } = await getInitialSourceData(sourceId);

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
            <p className="text-slate-400 text-xs mt-0.5">{total} novel dari {meta.label}</p>
          </div>
        </div>
        <Link
          href="/admin/novels/new"
          className="px-4 py-2 bg-gradient-to-r from-[#B99762] to-[#8C6D3B] hover:brightness-110 text-black text-sm font-bold rounded-lg shadow-lg shadow-[#B99762]/20 transition-all"
        >
          + Tambah Novel
        </Link>
      </div>

      {/* Filter + Novel Grid with Infinite Scroll */}
      <NovelGrid
        source={sourceId}
        initialNovels={novels}
        initialTotal={total}
        initialDraftCount={draftCount}
        initialNoCoverCount={noCoverCount}
        initialGenres={genres}
      />
    </div>
  );
}
