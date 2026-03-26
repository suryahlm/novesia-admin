"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { BookOpen, Search, X, Trash2, Loader2 } from "lucide-react";

interface Novel {
  id: string;
  title: string;
  nu_slug: string;
  cover_url: string | null;
  total_chapters: number;
  rating: number | null;
  genres: string[];
  novel_type: string | null;
  original_status: string | null;
  source: string;
  status: string;
}

export default function NovelGrid({ novels: initialNovels }: { novels: Novel[] }) {
  const [novels, setNovels] = useState(initialNovels);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "ongoing" | "completed">("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "chapters" | "title">("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, novel: Novel) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`Hapus novel "${novel.title}" secara permanen?\n\nSemua chapter dan file cover di R2 juga akan dihapus.`)) {
      return;
    }

    setDeletingId(novel.id);
    try {
      const res = await fetch(`/api/novels/${novel.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus novel.");
      
      setNovels(prev => prev.filter(n => n.id !== novel.id));
      // alert("Novel berhasil dihapus.");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Extract unique genres
  const allGenres = useMemo(() => {
    const genreSet = new Set<string>();
    novels.forEach((n) => (n.genres || []).forEach((g) => genreSet.add(g)));
    return [...genreSet].sort();
  }, [novels]);

  // Filter & sort
  const filtered = useMemo(() => {
    let result = novels;

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.nu_slug && n.nu_slug.toLowerCase().includes(q))
      );
    }

    // Status
    if (statusFilter !== "all") {
      result = result.filter((n) => {
        if (statusFilter === "draft") return n.status === "draft";
        const s = (n.original_status || "").toLowerCase();
        if (statusFilter === "completed") return s.includes("completed");
        return !s.includes("completed") && n.status !== "draft";
      });
    }

    // Genre
    if (genreFilter !== "all") {
      result = result.filter((n) => (n.genres || []).includes(genreFilter));
    }

    // Sort
    if (sortBy === "chapters") {
      result = [...result].sort((a, b) => (b.total_chapters || 0) - (a.total_chapters || 0));
    } else if (sortBy === "title") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [novels, search, statusFilter, genreFilter, sortBy]);

  const hasFilters = search || statusFilter !== "all" || genreFilter !== "all";

  return (
    <>
      {/* ═══ Filter Bar ═══ */}
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-4 space-y-3">
        {/* Row 1: Search + Sort */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Cari novel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800/80 border border-gray-700/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-500 hover:text-white" />
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2.5 bg-gray-800/80 border border-gray-700/50 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-violet-500/50 cursor-pointer"
          >
            <option value="newest">Terbaru</option>
            <option value="chapters">Terbanyak Chapter</option>
            <option value="title">A-Z</option>
          </select>
        </div>

        {/* Row 2: Status + Genre */}
        <div className="flex gap-2 items-center flex-wrap">
          {/* Status pills */}
          <div className="flex gap-1.5">
            {[
              { key: "all" as const, label: "Semua", color: "violet" },
              { key: "draft" as const, label: "Draft", color: "amber" },
              { key: "ongoing" as const, label: "Ongoing", color: "blue" },
              { key: "completed" as const, label: "Tamat", color: "emerald" },
            ].map((s) => {
              const count = s.key === "draft" ? novels.filter(n => n.status === "draft").length : 0;
              return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === s.key
                    ? s.color === "violet"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                      : s.color === "amber"
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                      : s.color === "blue"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700/80"
                }`}
              >
                {s.label}{s.key === "draft" && count > 0 ? ` (${count})` : ""}
              </button>
            );})}
          </div>

          <div className="w-px h-6 bg-gray-700/50 mx-1" />

          {/* Genre dropdown */}
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-800/80 border border-gray-700/50 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-violet-500/50 cursor-pointer max-w-[200px]"
          >
            <option value="all">Semua Genre</option>
            {allGenres.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setStatusFilter("all"); setGenreFilter("all"); }}
              className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              ✕ Reset
            </button>
          )}

          {/* Result count */}
          <span className="ml-auto text-xs text-gray-500">
            {filtered.length} novel
          </span>
        </div>
      </div>

      {/* ═══ Novel Grid ═══ */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-700 mx-auto" />
          <p className="text-gray-500 mt-4">
            {hasFilters ? "Tidak ada novel yang cocok dengan filter." : "Belum ada novel."}
          </p>
          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setStatusFilter("all"); setGenreFilter("all"); }}
              className="text-violet-400 text-sm mt-2 hover:underline"
            >
              Reset filter →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {filtered.map((novel) => (
            <Link
              key={novel.id}
              href={`/admin/novels/${novel.nu_slug}`}
              className="group bg-gray-900/50 border border-gray-800/50 rounded-2xl overflow-hidden hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300"
            >
              <div className="aspect-[3/4] relative overflow-hidden bg-gray-800">
                {novel.cover_url ? (
                  <img
                    src={novel.cover_url}
                    alt={novel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
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
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-bold text-emerald-400 uppercase">
                  {novel.source || "novelib"}
                </div>
                {novel.status === "draft" && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg rotate-[-12deg]">
                    DRAFT
                  </div>
                )}

                {/* Delete Button */}
                <button
                  onClick={(e) => handleDelete(e, novel)}
                  disabled={deletingId === novel.id}
                  className="absolute top-3 right-3 p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg backdrop-blur-md border border-red-500/20 transition-all opacity-0 group-hover:opacity-100 z-10"
                  title="Hapus Novel"
                >
                  {deletingId === novel.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
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
    </>
  );
}
