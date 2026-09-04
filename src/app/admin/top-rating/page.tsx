"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import {
  Star,
  Upload,
  ImageOff,
  Search,
  RefreshCw,
  Trash2,
  CheckCircle2,
  ExternalLink,
  BookOpen,
} from "lucide-react";

interface TopRatingNovel {
  id: string;
  nu_slug: string;
  title: string;
  cover_url: string | null;
  cover_landscape_url: string | null;
  rating: number | null;
  total_chapters: number;
  source: string | null;
  status: string | null;
  genres: string[] | null;
  author: string | null;
  updated_at: string;
}

export default function TopRatingPage() {
  const [novels, setNovels] = useState<TopRatingNovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "has_landscape" | "no_landscape">("all");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadTopNovels = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/novels/top-rating");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setNovels(data.novels || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat novel top rating");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopNovels();
  }, []);

  const onPickLandscape = async (novel: TopRatingNovel, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // Reset agar memilih file yang sama tetap memicu onChange
    if (!file) return;

    setUploadingId(novel.id);
    try {
      const formData = new FormData();
      formData.append("cover", file);

      const res = await fetch(`/api/novels/${novel.id}/cover-landscape`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengupload cover landscape");
      }

      setNovels((prev) =>
        prev.map((n) =>
          n.id === novel.id
            ? { ...n, cover_landscape_url: data.cover_landscape_url }
            : n
        )
      );
      showToast(`Cover landscape untuk "${novel.title}" berhasil diupload!`);
    } catch (err: any) {
      alert(err.message || "Gagal mengupload file");
    } finally {
      setUploadingId(null);
    }
  };

  const onDeleteLandscape = async (novel: TopRatingNovel) => {
    if (!confirm(`Hapus cover landscape untuk "${novel.title}"?`)) return;

    setDeletingId(novel.id);
    try {
      const res = await fetch(`/api/novels/${novel.id}/cover-landscape`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus cover landscape");
      }

      setNovels((prev) =>
        prev.map((n) =>
          n.id === novel.id ? { ...n, cover_landscape_url: null } : n
        )
      );
      showToast(`Cover landscape "${novel.title}" telah dihapus`);
    } catch (err: any) {
      alert(err.message || "Gagal menghapus cover landscape");
    } finally {
      setDeletingId(null);
    }
  };

  const withLandscapeCount = novels.filter((n) => Boolean(n.cover_landscape_url)).length;

  const filteredNovels = useMemo(() => {
    return novels.filter((n) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.nu_slug.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (filterMode === "has_landscape") return Boolean(n.cover_landscape_url);
      if (filterMode === "no_landscape") return !n.cover_landscape_url;
      return true;
    });
  }, [novels, searchQuery, filterMode]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-emerald-500/95 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 backdrop-blur-md text-sm font-medium animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Subtitle (Komiku Style 1:1) */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
              <Star className="text-amber-400 fill-amber-400" size={24} />
              Top Rating
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl mt-1 leading-relaxed">
              100 novel rating tertinggi saat ini. Upload cover LANDSCAPE manual per novel di sini - dipakai OTOMATIS
              di banner featured Home app kalau novelnya lagi kepilih tampil di situ. Cover di etalase/grid/list app tetap
              pakai cover portrait biasa, gak berubah.
            </p>
          </div>

          <button
            onClick={loadTopNovels}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/5 transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Counter & Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-xs font-bold text-amber-300">
            <span>{withLandscapeCount}/{novels.length} novel udah punya cover landscape.</span>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Cari novel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-white/10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/40 w-44 md:w-56"
              />
            </div>

            <div className="flex rounded-lg bg-slate-900/90 border border-white/10 p-0.5 text-xs">
              <button
                onClick={() => setFilterMode("all")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterMode === "all" ? "bg-amber-400/20 text-amber-300 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterMode("has_landscape")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterMode === "has_landscape" ? "bg-amber-400/20 text-amber-300 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Ada Cover
              </button>
              <button
                onClick={() => setFilterMode("no_landscape")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterMode === "no_landscape" ? "bg-amber-400/20 text-amber-300 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Belum
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-slate-800" />
              <div className="p-3 flex gap-3">
                <div className="w-12 aspect-[3/4] bg-slate-800 rounded-md shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-800 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      ) : filteredNovels.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-white/5 rounded-xl text-slate-400 text-sm">
          Tidak ada novel yang sesuai dengan filter atau pencarian.
        </div>
      ) : (
        /* ═══ 3-Column Grid Cards (Komiku Style 1:1) ═══ */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNovels.map((novel, i) => {
            const isUploading = uploadingId === novel.id;
            const isDeleting = deletingId === novel.id;

            return (
              <div
                key={novel.id}
                className="bg-[#10141b] border border-white/5 hover:border-amber-400/20 transition-all rounded-xl overflow-hidden group shadow-lg shadow-black/30 flex flex-col"
              >
                {/* Landscape Preview Area (aspect 16/10) */}
                <div className="relative aspect-[16/10] bg-[#0c0f14] overflow-hidden">
                  {novel.cover_landscape_url ? (
                    <img
                      src={novel.cover_landscape_url}
                      alt={`${novel.title} (landscape)`}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-500 bg-gradient-to-b from-slate-900/70 to-slate-950">
                      <ImageOff size={24} className="opacity-60" />
                      <span className="text-xs font-medium">Belum ada cover landscape</span>
                    </div>
                  )}

                  {/* Top-Left: Rank & Rating Badges (Komiku Style) */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                    <span className="w-6 h-6 rounded-full bg-black/75 backdrop-blur-md flex items-center justify-center text-xs font-extrabold text-amber-400 border border-amber-400/20 shadow">
                      {i + 1}
                    </span>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/20 text-xs font-bold text-amber-300 shadow">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span>{novel.rating ? novel.rating.toFixed(2) : "9.00"}</span>
                    </div>
                  </div>

                  {/* Top-Right: Delete Landscape Button if exists */}
                  {novel.cover_landscape_url && (
                    <button
                      onClick={() => onDeleteLandscape(novel)}
                      disabled={isDeleting || isUploading}
                      title="Hapus cover landscape ini"
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-black/75 backdrop-blur-md border border-rose-500/20 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors z-10"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Bottom Row: Portrait Thumbnail + Title + Upload Action */}
                <div className="p-3 flex gap-3 bg-[#12161f] border-t border-white/5 flex-1 items-center">
                  {/* Portrait Thumbnail */}
                  {novel.cover_url ? (
                    <img
                      src={novel.cover_url}
                      alt={novel.title}
                      className="w-12 aspect-[3/4] object-cover rounded-md shrink-0 border border-white/10 bg-slate-800"
                    />
                  ) : (
                    <div className="w-12 aspect-[3/4] rounded-md bg-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                      <BookOpen size={16} />
                    </div>
                  )}

                  {/* Novel Details & Upload Button */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <Link
                        href={`/admin/novels/${novel.nu_slug}`}
                        className="block text-sm text-slate-100 font-semibold truncate hover:text-amber-300 hover:underline transition-colors"
                        title={novel.title}
                      >
                        {novel.title}
                      </Link>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {novel.total_chapters} Bab · {novel.source || "Novesia"}
                      </p>
                    </div>

                    {/* Hidden Native File Input */}
                    <input
                      ref={(el) => {
                        fileInputs.current[novel.id] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPickLandscape(novel, e)}
                    />

                    {/* Upload / Ganti Button (Komiku 1:1) */}
                    <button
                      onClick={() => fileInputs.current[novel.id]?.click()}
                      disabled={isUploading || isDeleting}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-sm ${
                        novel.cover_landscape_url
                          ? "bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-white/10"
                          : "bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border-amber-400/30 font-bold"
                      } disabled:opacity-50`}
                    >
                      <Upload size={12} className={isUploading ? "animate-bounce text-amber-400" : ""} />
                      <span>
                        {isUploading
                          ? "Mengupload..."
                          : novel.cover_landscape_url
                          ? "Ganti Cover Landscape"
                          : "Upload Cover Landscape"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
