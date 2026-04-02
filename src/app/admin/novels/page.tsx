import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic'; // Selalu fetch fresh, tidak di-cache
import Link from "next/link";
import NovelGrid from "./NovelGrid";

// Source definitions — add new sources here
const NOVEL_SOURCES = [
  { id: "novelworld", label: "NovelWorld", icon: "📚", color: "from-emerald-600 to-teal-600", shadow: "shadow-emerald-500/20" },
  { id: "talesinthevalley", label: "TalesInTheValley", icon: "⚔️", color: "from-blue-600 to-cyan-600", shadow: "shadow-blue-500/20" },
  { id: "nobadnovel", label: "NoBadNovel", icon: "💎", color: "from-rose-500 to-pink-600", shadow: "shadow-rose-500/20" },
  { id: "transcendentaltls", label: "TranscendentalTLS", icon: "📖", color: "from-orange-600 to-amber-600", shadow: "shadow-orange-500/20" },
  { id: "general", label: "General", icon: "🌐", color: "from-gray-600 to-slate-600", shadow: "shadow-gray-500/20" },
];

async function getNovels() {
  const { data } = await supabase
    .from("nu_novels")
    .select("*")
    .order("created_at", { ascending: false });
  return data || [];
}

async function getSourceCounts() {
  const { data } = await supabase.from("nu_novels").select("source");
  const counts: Record<string, number> = {};
  (data || []).forEach((n: any) => {
    const src = n.source;
    if (!src) return; // skip jika source null
    counts[src] = (counts[src] || 0) + 1;
  });
  return counts;
}

export default async function NovelsListPage() {
  const novels = await getNovels();
  const sourceCounts = await getSourceCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Daftar Novel
          </h1>
          <p className="text-gray-500 mt-1">{novels.length} novel tersimpan</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/novels/new"
            className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl text-sm font-semibold shadow-lg shadow-violet-500/20 transition-all"
          >
            + Tambah Novel
          </Link>
        </div>
      </div>

      {/* Source Buttons */}
      <div className="flex gap-3 flex-wrap">
        {NOVEL_SOURCES.map((src) => {
          const count = sourceCounts[src.id] || 0;
          return (
            <Link
              key={src.id}
              href={`/admin/novels/source/${src.id}`}
              className={`flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r ${src.color} rounded-xl shadow-lg ${src.shadow} hover:scale-[1.02] transition-all duration-300`}
            >
              <span className="text-xl">{src.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{src.label}</p>
                <p className="text-[10px] text-white/70 font-medium">{count} novel</p>
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
