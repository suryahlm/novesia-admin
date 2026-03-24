"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Loader2, CheckCircle, XCircle, BookOpen, Clock } from "lucide-react";

interface Novel {
  id: string;
  title: string;
  nu_slug: string;
  cover_url: string | null;
  total_chapters: number;
  original_status: string | null;
  rating: number | null;
  genres: string[];
  updated_at: string | null;
  source: string | null;
}

interface UpdateResult {
  slug: string;
  title: string;
  oldChapters: number;
  newChapters: number;
  status: "updated" | "no_change" | "error";
  error?: string;
}

const NOVEL_SOURCES = [
  { id: "all", label: "Semua", icon: "📋", color: "from-violet-600 to-indigo-600", shadow: "shadow-violet-500/20" },
  { id: "novelib", label: "Novelib", icon: "📚", color: "from-emerald-600 to-teal-600", shadow: "shadow-emerald-500/20" },
  { id: "skynovelvault", label: "SkyNovelVault", icon: "⚔️", color: "from-blue-600 to-cyan-600", shadow: "shadow-blue-500/20" },
  { id: "transcendentaltls", label: "TranscendentalTLS", icon: "📖", color: "from-orange-600 to-amber-600", shadow: "shadow-orange-500/20" },
];

export default function UpdateChapterPage() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [results, setResults] = useState<UpdateResult[]>([]);
  const [activeSource, setActiveSource] = useState("all");

  useEffect(() => {
    fetch("/api/novels/ongoing")
      .then((r) => r.json())
      .then((data) => {
        setNovels(data.novels || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredNovels = activeSource === "all"
    ? novels
    : novels.filter((n) => (n.source || "novelib") === activeSource);

  const sourceCounts: Record<string, number> = { all: novels.length };
  novels.forEach((n) => {
    const src = n.source || "novelib";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });

  const handleUpdateAll = async () => {
    setUpdating(true);
    setResults([]);
    try {
      const resp = await fetch("/api/scrape/update-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await resp.json();
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const ongoingCount = filteredNovels.length;
  const updatedCount = results.filter((r) => r.status === "updated").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Update Chapter
          </h1>
          <p className="text-gray-500 mt-1">
            Cek chapter baru untuk {ongoingCount} novel ongoing
          </p>
        </div>
        <button
          onClick={handleUpdateAll}
          disabled={updating || filteredNovels.length === 0}
          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all flex items-center gap-2"
        >
          {updating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <RefreshCw className="w-5 h-5" />
          )}
          {updating ? "Sedang Update..." : "🔄 Update Semua Novel"}
        </button>
      </div>

      {/* Source Buttons */}
      <div className="flex gap-3 flex-wrap">
        {NOVEL_SOURCES.map((src) => {
          const count = sourceCounts[src.id] || 0;
          const isActive = activeSource === src.id;
          return (
            <button
              key={src.id}
              onClick={() => setActiveSource(src.id)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                isActive
                  ? `bg-gradient-to-r ${src.color} shadow-lg ${src.shadow} scale-[1.02]`
                  : "bg-gray-900/50 border border-gray-800/50 hover:border-gray-700/50"
              }`}
            >
              <span className="text-lg">{src.icon}</span>
              <div className="text-left">
                <p className={`text-xs font-semibold ${isActive ? "text-white" : "text-gray-400"}`}>{src.label}</p>
                <p className={`text-[9px] font-medium ${isActive ? "text-white/70" : "text-gray-600"}`}>{count} novel</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Update Results */}
      {results.length > 0 && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Hasil Update</h2>
          <div className="flex gap-4 mb-4">
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-300">
              ✓ {updatedCount} diperbarui
            </div>
            <div className="px-3 py-1.5 bg-gray-500/10 border border-gray-500/20 rounded-lg text-sm text-gray-400">
              — {results.length - updatedCount - errorCount} tidak ada chapter baru
            </div>
            {errorCount > 0 && (
              <div className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300">
                ✗ {errorCount} error
              </div>
            )}
          </div>
          <div className="space-y-2">
            {results.map((r) => (
              <div
                key={r.slug}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  r.status === "updated"
                    ? "bg-emerald-500/5 border border-emerald-500/10"
                    : r.status === "error"
                    ? "bg-red-500/5 border border-red-500/10"
                    : "bg-gray-800/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  {r.status === "updated" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : r.status === "error" ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <span className="w-4 h-4 text-gray-500 text-center">—</span>
                  )}
                  <span className="font-medium text-sm">{r.title}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {r.status === "updated" ? (
                    <span className="text-emerald-400 font-medium">
                      {r.oldChapters} → {r.newChapters} ch (+{r.newChapters - r.oldChapters})
                    </span>
                  ) : r.status === "error" ? (
                    <span className="text-red-400">{r.error}</span>
                  ) : (
                    <span>{r.oldChapters} ch — tidak ada perubahan</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {updating && (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto" />
          <p className="text-violet-300 mt-3 font-medium">Sedang mengecek chapter baru...</p>
          <p className="text-violet-400/60 text-sm mt-1">
            Mengecek {filteredNovels.length} novel via ScraperAPI — ini bisa memakan waktu beberapa menit
          </p>
        </div>
      )}

      {/* Novel List */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">
          Novel Ongoing ({ongoingCount})
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Memuat...
          </div>
        ) : filteredNovels.length === 0 ? (
          <p className="text-gray-500 text-sm">Tidak ada novel ongoing.</p>
        ) : (
          <div className="space-y-2">
            {filteredNovels.map((novel) => (
              <div
                key={novel.id}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-800/30 transition-colors"
              >
                {novel.cover_url ? (
                  <img src={novel.cover_url} alt={novel.title} className="w-10 h-14 object-cover rounded-lg" />
                ) : (
                  <div className="w-10 h-14 bg-gray-800 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-gray-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{novel.title}</p>
                  <p className="text-xs text-gray-500">
                    {novel.total_chapters} ch • {(novel.genres || []).slice(0, 3).join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  {novel.rating && (
                    <p className="text-xs font-medium text-amber-400">★ {novel.rating}</p>
                  )}
                  <p className="text-[10px] text-gray-600 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {novel.updated_at
                      ? new Date(novel.updated_at).toLocaleDateString("id-ID", { dateStyle: "short" })
                      : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
