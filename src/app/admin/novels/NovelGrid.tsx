"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { BookOpen, Search, X, Trash2, Loader2 } from "lucide-react";
import ConfirmModal from "./ConfirmModal";

export interface Novel {
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

interface NovelGridProps {
  novels?: Novel[];
  initialNovels?: Novel[];
  initialTotal?: number;
  initialDraftCount?: number;
  initialNoCoverCount?: number;
  initialGenres?: string[];
  source?: string;
}

export default function NovelGrid({
  novels: legacyNovels,
  initialNovels,
  initialTotal,
  initialDraftCount = 0,
  initialNoCoverCount = 0,
  initialGenres = [],
  source,
}: NovelGridProps) {
  const startItems = initialNovels || legacyNovels || [];
  const startTotal = initialTotal ?? startItems.length;

  const [novels, setNovels] = useState<Novel[]>(startItems);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(startTotal);
  const [hasMore, setHasMore] = useState(startItems.length < startTotal);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "ongoing" | "completed" | "no_cover">("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "chapters" | "title">("newest");

  const [draftCount, setDraftCount] = useState(initialDraftCount);
  const [noCoverCount, setNoCoverCount] = useState(initialNoCoverCount);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetNovel, setTargetNovel] = useState<Novel | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFirstRender = useRef(true);

  // Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Extract combined unique genres
  const allGenres = useMemo(() => {
    const genreSet = new Set<string>(initialGenres);
    novels.forEach((n) => (n.genres || []).forEach((g) => genreSet.add(g)));
    return [...genreSet].sort();
  }, [initialGenres, novels]);

  // Fetch filtered batch (page 1) when filters or search change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsFilterLoading(true);

    const fetchFiltered = async () => {
      try {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", "24");
        params.set("sortBy", sortBy);
        if (source) params.set("source", source);
        if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (genreFilter !== "all") params.set("genre", genreFilter);

        const res = await fetch(`/api/novels?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Gagal mengambil novel");
        const data = await res.json();

        const fetchedNovels: Novel[] = data.novels || [];
        const fetchedTotal = Number(data.total ?? fetchedNovels.length);

        setNovels(fetchedNovels);
        setTotal(fetchedTotal);
        setPage(1);
        setHasMore(data.hasMore ?? (fetchedNovels.length < fetchedTotal));
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Filter fetch error:", err);
        }
      } finally {
        setIsFilterLoading(false);
      }
    };

    fetchFiltered();

    return () => {
      controller.abort();
    };
  }, [debouncedSearch, statusFilter, genreFilter, sortBy, source]);

  // Load next page on scroll
  const loadMore = useCallback(async () => {
    if (loadingMore || isFilterLoading || !hasMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("limit", "24");
      params.set("sortBy", sortBy);
      if (source) params.set("source", source);
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (genreFilter !== "all") params.set("genre", genreFilter);

      const res = await fetch(`/api/novels?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat batch berikutnya");
      const data = await res.json();

      const newItems: Novel[] = data.novels || [];
      setNovels((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const filteredNew = newItems.filter((n) => !existingIds.has(n.id));
        const combined = [...prev, ...filteredNew];
        setHasMore(data.hasMore ?? (combined.length < (data.total || total)));
        return combined;
      });

      setPage(nextPage);
      if (data.total !== undefined) {
        setTotal(Number(data.total));
      }
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, isFilterLoading, hasMore, page, sortBy, source, debouncedSearch, statusFilter, genreFilter, total]);

  // IntersectionObserver for bottom sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !isFilterLoading) {
          loadMore();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loadingMore, isFilterLoading]);

  // Delete handlers
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

      setNovels((prev) => prev.filter((n) => n.id !== targetNovel.id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (targetNovel.status === "draft") {
        setDraftCount((prev) => Math.max(0, prev - 1));
      }
      if (!targetNovel.cover_url || targetNovel.cover_url.trim() === "") {
        setNoCoverCount((prev) => Math.max(0, prev - 1));
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const hasFilters = Boolean(search || statusFilter !== "all" || genreFilter !== "all");

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setGenreFilter("all");
    setSortBy("newest");
  };

  return (
    <div className="space-y-4">
      {/* ═══ Filter Bar ═══ */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl p-4 space-y-3">
        {/* Row 1: Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari judul novel atau slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-[#0a0c10] border border-white/10 rounded-lg text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#B99762] focus:ring-1 focus:ring-[#B99762]/30 transition-all"
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
              className="w-full sm:w-auto px-3.5 py-2.5 bg-[#0a0c10] border border-white/10 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-[#B99762] cursor-pointer"
            >
              <option value="newest" className="bg-[#0a0c10] text-slate-200">
                ✨ Terbaru
              </option>
              <option value="chapters" className="bg-[#0a0c10] text-slate-200">
                📚 Terbanyak Chapter
              </option>
              <option value="title" className="bg-[#0a0c10] text-slate-200">
                🔤 Abjad (A - Z)
              </option>
            </select>
          </div>
        </div>

        {/* Row 2: Status + Genre + Count */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: "all" as const, label: "Semua", badge: 0 },
              { key: "draft" as const, label: "Draft", badge: draftCount },
              { key: "ongoing" as const, label: "Ongoing", badge: 0 },
              { key: "completed" as const, label: "Completed", badge: 0 },
              { key: "no_cover" as const, label: "🖼️ Tanpa Cover", badge: noCoverCount },
            ].map((s) => {
              const isSelected = statusFilter === s.key;

              return (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#B99762]/15 text-[#e6ca91] border border-[#B99762]/30"
                      : "bg-[#0a0c10] text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-white/5"
                  }`}
                >
                  <span>{s.label}</span>
                  {s.badge > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? "bg-[#B99762]/25 text-[#f3e7c4]"
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      {s.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="w-px h-5 bg-white/10 mx-1 hidden sm:block" />

            {/* Genre Filter */}
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#0a0c10] border border-white/10 rounded-lg text-xs font-semibold text-slate-300 focus:outline-none focus:border-[#B99762] cursor-pointer max-w-[180px]"
            >
              <option value="all" className="bg-[#0a0c10]">
                Semua Genre
              </option>
              {allGenres.map((g) => (
                <option key={g} value={g} className="bg-[#0a0c10]">
                  {g}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-all cursor-pointer"
              >
                ✕ Reset
              </button>
            )}
          </div>

          <div className="text-xs font-medium text-slate-400">
            Menampilkan <span className="text-[#D4A843] font-bold font-mono">{novels.length}</span>{" "}
            {total > novels.length && (
              <>
                dari <span className="text-slate-300 font-bold font-mono">{total}</span>{" "}
              </>
            )}
            novel
          </div>
        </div>
      </div>

      {/* ═══ Novel Grid or Skeletons ═══ */}
      {isFilterLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#12151b] border border-white/5 rounded-xl overflow-hidden animate-pulse flex flex-col"
            >
              <div className="aspect-[3/4.2] bg-slate-800/50" />
              <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="h-3.5 bg-slate-800 rounded w-4/5" />
                  <div className="h-2.5 bg-slate-800/60 rounded w-1/2" />
                </div>
                <div className="h-4 bg-slate-800/40 rounded w-2/3 mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : novels.length === 0 ? (
        <div className="bg-[#12151b] border border-white/5 rounded-xl p-16 text-center">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-slate-400 mt-4 text-sm">
            {hasFilters ? "Tidak ada novel yang sesuai dengan filter." : "Belum ada novel di katalog."}
          </p>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="text-[#D4A843] text-xs font-semibold mt-3 hover:underline cursor-pointer"
            >
              Reset Filter Pencarian →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {novels.map((novel) => {
            const isDraft = novel.status === "draft";
            const isCompleted = (novel.original_status || "").toLowerCase().includes("completed");

            return (
              <Link
                key={novel.id}
                href={`/admin/novels/${novel.nu_slug}`}
                className="group bg-[#12151b] border border-white/5 hover:border-[#B99762]/30 rounded-xl overflow-hidden hover:shadow-lg transition-all flex flex-col relative"
              >
                {/* Cover Image Container */}
                <div className="aspect-[3/4.2] relative overflow-hidden bg-slate-900">
                  {novel.cover_url ? (
                    <img
                      src={novel.cover_url}
                      alt={novel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                    <BookOpen className="w-8 h-8 text-slate-700" />
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12151b] via-transparent to-black/30 opacity-70 group-hover:opacity-85 transition-opacity" />

                  {/* Rating Badge */}
                  {novel.rating && Number(novel.rating) > 0 ? (
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-[#D4A843] border border-[#B99762]/30 flex items-center gap-0.5 font-mono">
                      <span>★</span>
                      <span>{novel.rating}</span>
                    </div>
                  ) : null}

                  {/* Status Badge */}
                  <div
                    className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                      isCompleted
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                    }`}
                  >
                    {isCompleted ? "Tamat" : "Ongoing"}
                  </div>

                  {/* Draft Watermark */}
                  {isDraft && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#B99762] px-2.5 py-0.5 rounded text-[10px] font-extrabold text-black rotate-[-12deg] shadow-lg">
                      DRAFT
                    </div>
                  )}

                  {/* Source Badge */}
                  <div className="absolute bottom-2 left-2 bg-black/70 px-1.5 py-0.5 rounded text-[8px] font-semibold text-slate-300 border border-white/10 uppercase font-mono">
                    {novel.source || "general"}
                  </div>

                  {/* Delete Button Hover */}
                  <button
                    onClick={(e) => handleDelete(e, novel)}
                    disabled={deletingId === novel.id}
                    className="absolute top-2 right-2 p-1.5 bg-rose-500/80 hover:bg-rose-600 text-white rounded backdrop-blur-md border border-rose-400 transition-all opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
                    title="Hapus Novel"
                  >
                    {deletingId === novel.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Card Info */}
                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-xs text-slate-100 leading-snug line-clamp-2 group-hover:text-[#D4A843] transition-colors">
                      {novel.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-1">
                      {novel.total_chapters || 0} Chapter
                    </p>
                  </div>

                  {novel.genres && novel.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {novel.genres.slice(0, 2).map((genre: string) => (
                        <span
                          key={genre}
                          className="px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-[9px] text-slate-400"
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

      {/* ═══ Sentinel for Infinite Scroll ═══ */}
      <div ref={sentinelRef} className="h-6 w-full pointer-events-none" />

      {/* ═══ Loading Indicator when Scrolling ═══ */}
      {loadingMore && (
        <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-[#B99762]" />
          <span className="text-xs font-medium tracking-wide">Memuat novel lainnya...</span>
        </div>
      )}

      {/* ═══ End of Results Indicator ═══ */}
      {!hasMore && novels.length > 0 && !loadingMore && !isFilterLoading && (
        <div className="py-8 text-center border-t border-white/5 mt-4">
          <p className="text-xs text-slate-500 font-mono">
            ✓ Semua novel telah dimuat ({novels.length} novel)
          </p>
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
