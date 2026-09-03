import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic'; // Selalu fetch fresh, tidak di-cache
import Link from "next/link";
import NovelGrid from "./NovelGrid";

// Source definitions — add new sources here
const NOVEL_SOURCES = [
  { id: "novelworld", label: "NovelWorld", icon: "📚", color: "from-emerald-600 to-teal-600", shadow: "shadow-emerald-500/20" },
  { id: "talesinthevalley", label: "TalesInTheValley", icon: "⚔️", color: "from-blue-600 to-cyan-600", shadow: "shadow-blue-500/20" },
  { id: "98novels", label: "98Novels", icon: "💎", color: "from-rose-500 to-pink-600", shadow: "shadow-rose-500/20" },
  { id: "tinytranslation", label: "TinyTranslation", icon: "🍄", color: "from-purple-600 to-fuchsia-600", shadow: "shadow-purple-500/20" },
  { id: "cuttlefishreads", label: "CuttlefishReads", icon: "🦑", color: "from-amber-600 to-orange-600", shadow: "shadow-amber-500/20" },
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
          <h1 className="text-2xl font-bold text-slate-100">
            Daftar Novel
          </h1>
          <p className="text-slate-400 text-xs mt-1">{novels.length} novel tersimpan</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/novels/new"
            className="px-4 py-2 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 text-sm font-semibold rounded-lg shadow-[0_2px_12px_-2px_rgba(221,168,58,0.45)] transition-all"
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
