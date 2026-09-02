"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { BookOpen, Search, X, Trash2, Loader2 } from "lucide-react";
import ConfirmModal from "./ConfirmModal";

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
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "ongoing" | "completed" | "no_cover">("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "chapters" | "title">("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetNovel, setTargetNovel] = useState<Novel | null>(null);

  const noCoverCount = useMemo(() => {
    return novels.filter((n) => !n.cover_url || n.cover_url.trim() === "").length;
  }, [novels]);

  const handleDelete = (e: React.MouseEvent, novel: Novel) => {
    e.preventDefault();
    e.stopPropagation();
    setTargetNovel(novel);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!targetNovel) return;

    setDeletingId(targetNovel.id);
    try {
      const res = await fetch(`/api/novels/${targetNovel.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus novel.");
      
      setNovels(prev => prev.filter(n => n.id !== targetNovel.id));
      setIsModalOpen(false);
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

    // Status & Cover
    if (statusFilter !== "all") {
      result = result.filter((n) => {
        if (statusFilter === "no_cover") {
          return !n.cover_url || n.cover_url.trim() === "";
        }
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
    <div className="space-y-6">
      {/* ═══ Luxury Filter Bar ═══ */}
      <div className="bg-[#0c101c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-5 shadow-2xl shadow-black/60 space-y-4">
        {/* Row 1: Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari judul novel atau slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/[0.08] rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full sm:w-auto px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-violet-500/60 cursor-pointer shadow-inner"
            >
              <option value="newest" className="bg-slate-900 text-slate-200">
                ✨ Terbaru
              </option>
              <option value="chapters" className="bg-slate-900 text-slate-200">
                📚 Terbanyak Chapter
              </option>
              <option value="title" className="bg-slate-900 text-slate-200">
                🔤 Abjad (A - Z)
              </option>
            </select>
          </div>
        </div>

        {/* Row 2: Status + Genre + Count */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.05]">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: "all" as const, label: "Semua" },
              { key: "draft" as const, label: "Draft" },
              { key: "ongoing" as const, label: "Ongoing" },
              { key: "completed" as const, label: "Completed" },
              { key: "no_cover" as const, label: "🖼️ Tanpa Cover" },
            ].map((s) => {
              let count = 0;
              if (s.key === "draft") count = novels.filter((n) => n.status === "draft").length;
              if (s.key === "no_cover") count = noCoverCount;
              const isSelected = statusFilter === s.key;

              return (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? s.key === "no_cover"
                        ? "bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-rose-500/30 border border-amber-400/40"
                        : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 border border-violet-400/40"
                      : s.key === "no_cover" && count > 0
                      ? "bg-amber-500/10 text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 border border-amber-500/20"
                      : "bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.07] border border-white/[0.05]"
                  }`}
                >
                  <span>{s.label}</span>
                  {count > 0 && (s.key === "draft" || s.key === "no_cover") && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                        isSelected
                          ? "bg-black/30 text-white"
                          : s.key === "no_cover"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}


            <div className="w-px h-5 bg-white/[0.08] mx-1 hidden sm:block" />

            {/* Genre Filter */}
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="px-3.5 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-violet-500/60 cursor-pointer max-w-[180px]"
            >
              <option value="all" className="bg-slate-900">
                Semua Genre
              </option>
              {allGenres.map((g) => (
                <option key={g} value={g} className="bg-slate-900">
                  {g}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setGenreFilter("all");
                }}
                className="px-3 py-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-all cursor-pointer"
              >
                ✕ Reset
              </button>
            )}
          </div>

          <div className="text-xs font-semibold text-slate-400">
            Menampilkan <span className="text-violet-300 font-bold">{filtered.length}</span> novel
          </div>
        </div>
      </div>

      {/* ═══ Luxury Novel Grid ═══ */}
      {filtered.length === 0 ? (
        <div className="bg-[#0c101c]/80 border border-white/[0.08] rounded-3xl p-16 text-center shadow-xl">
          <BookOpen className="w-14 h-14 text-slate-700 mx-auto" />
          <p className="text-slate-400 mt-4 text-sm font-medium">
            {hasFilters ? "Tidak ada novel yang sesuai dengan filter." : "Belum ada novel di katalog."}
          </p>
          {hasFilters && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setGenreFilter("all");
              }}
              className="text-violet-400 text-xs font-bold mt-3 hover:underline"
            >
              Reset Filter Pencarian →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {filtered.map((novel) => {
            const isDraft = novel.status === "draft";
            const isCompleted = (novel.original_status || "").toLowerCase().includes("completed");

            return (
              <Link
                key={novel.id}
                href={`/admin/novels/${novel.nu_slug}`}
                className="group bg-[#0c101c]/70 border border-white/[0.06] hover:border-violet-500/40 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col relative"
              >
                {/* Cover Image Container */}
                <div className="aspect-[3/4.2] relative overflow-hidden bg-slate-900">
                  {novel.cover_url ? (
                    <img
                      src={novel.cover_url}
                      alt={novel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.nextElementSibling) {
                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className="w-full h-full items-center justify-center absolute inset-0 z-0 bg-slate-900"
                    style={{ display: novel.cover_url ? "none" : "flex" }}
                  >
                    <BookOpen className="w-10 h-10 text-slate-700" />
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c101c] via-transparent to-black/40 opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Rating Badge */}
                  {novel.rating && (
                    <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-md">
                      <span>★</span>
                      <span>{novel.rating}</span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div
                    className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase backdrop-blur-md border ${
                      isCompleted
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                    }`}
                  >
                    {isCompleted ? "Tamat" : "Ongoing"}
                  </div>

                  {/* Draft Watermark */}
                  {isDraft && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500/90 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-black text-black shadow-2xl rotate-[-12deg] tracking-wider">
                      DRAFT
                    </div>
                  )}

                  {/* Source Badge */}
                  <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-bold text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                    {novel.source || "general"}
                  </div>

                  {/* Delete Button Hover */}
                  <button
                    onClick={(e) => handleDelete(e, novel)}
                    disabled={deletingId === novel.id}
                    className="absolute top-2.5 right-2.5 p-1.5 bg-rose-500/80 hover:bg-rose-600 text-white rounded-lg backdrop-blur-md border border-rose-400 transition-all opacity-0 group-hover:opacity-100 z-10 shadow-lg cursor-pointer"
                    title="Hapus Novel"
                  >
                    {deletingId === novel.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Card Info */}
                <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-100 leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors">
                      {novel.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">
                      {novel.total_chapters || 0} Chapter
                    </p>
                  </div>

                  {novel.genres && novel.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {novel.genres.slice(0, 2).map((genre: string) => (
                        <span
                          key={genre}
                          className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded-md text-[9px] font-semibold text-slate-400"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Deletion Modal */}
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmDelete}
        loading={!!deletingId}
        title="Hapus Novel?"
        description={`Novel "${targetNovel?.title}" akan dihapus secara permanen beserta semua chapter dan aset di R2.`}
        confirmText="Hapus Permanen"
        cancelText="Batal"
      />
    </div>
  );
}
