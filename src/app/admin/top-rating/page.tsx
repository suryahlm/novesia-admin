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
  BookOpen,
  Sparkles,
  CheckSquare,
  Square,
  StopCircle,
  Clock,
  AlertCircle,
  Layers,
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
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ═══ State Seleksi & Batch Queue ═══
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0);
  const [batchCurrentTitle, setBatchCurrentTitle] = useState("");
  const [batchCountdown, setBatchCountdown] = useState(0);
  const [batchDelaySeconds, setBatchDelaySeconds] = useState(25); // Default 25 detik sesuai instruksi
  const [batchCompletedCount, setBatchCompletedCount] = useState(0);

  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const stopBatchRef = useRef<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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

  // ═══ Upload Manual ═══
  const onPickLandscape = async (novel: TopRatingNovel, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // Reset input
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

  // ═══ Generate Satuan (Single) ═══
  const onGenerateLandscape = async (novel: TopRatingNovel) => {
    if (!novel.cover_url) {
      alert(`Novel "${novel.title}" belum memiliki cover portrait untuk dilebarkan.`);
      return;
    }

    setGeneratingId(novel.id);
    try {
      const res = await fetch(`/api/novels/${novel.id}/cover-landscape/generate`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal melebarkan cover landscape");
      }

      setNovels((prev) =>
        prev.map((n) =>
          n.id === novel.id
            ? { ...n, cover_landscape_url: data.cover_landscape_url }
            : n
        )
      );
      showToast(`✨ Cover landscape "${novel.title}" selesai di-generate (${data.size_kb} KB)!`);
    } catch (err: any) {
      alert(err.message || "Gagal men-generate cover");
    } finally {
      setGeneratingId(null);
    }
  };

  // ═══ Hapus Cover Landscape ═══
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

  // ═══ Seleksi & Batch Queue Logic ═══
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllWithoutLandscape = () => {
    const candidates = filteredNovels.filter((n) => !n.cover_landscape_url && Boolean(n.cover_url));
    setSelectedIds(new Set(candidates.map((n) => n.id)));
    showToast(`${candidates.length} novel tanpa cover landscape dipilih`);
  };

  const selectAllFiltered = () => {
    const candidates = filteredNovels.filter((n) => Boolean(n.cover_url));
    setSelectedIds(new Set(candidates.map((n) => n.id)));
    showToast(`${candidates.length} novel dipilih`);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // ═══ Eksekusi Batch Generate dengan Jeda 25 Detik ═══
  const startBatchGenerate = async () => {
    const queue = novels.filter((n) => selectedIds.has(n.id) && Boolean(n.cover_url));
    if (queue.length === 0) {
      alert("Tidak ada novel valid dengan cover portrait yang dipilih.");
      return;
    }

    setIsBatchRunning(true);
    stopBatchRef.current = false;
    setBatchTotal(queue.length);
    setBatchCompletedCount(0);

    for (let i = 0; i < queue.length; i++) {
      if (stopBatchRef.current) break;

      const novel = queue[i];
      setBatchCurrentIndex(i);
      setBatchCurrentTitle(novel.title);
      setGeneratingId(novel.id);

      try {
        const res = await fetch(`/api/novels/${novel.id}/cover-landscape/generate`, {
          method: "POST",
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setNovels((prev) =>
            prev.map((n) =>
              n.id === novel.id
                ? { ...n, cover_landscape_url: data.cover_landscape_url }
                : n
            )
          );
          setBatchCompletedCount((c) => c + 1);
          // Hapus dari selection yang sudah selesai
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(novel.id);
            return next;
          });
        } else {
          console.warn(`Gagal generate novel ${novel.title}:`, data.error);
        }
      } catch (e) {
        console.error(`Error batch novel ${novel.title}:`, e);
      } finally {
        setGeneratingId(null);
      }

      // Jeda rate limit jika masih ada antrean berikutnya dan belum di-stop
      if (i < queue.length - 1 && !stopBatchRef.current) {
        for (let cd = batchDelaySeconds; cd > 0; cd--) {
          if (stopBatchRef.current) break;
          setBatchCountdown(cd);
          await new Promise((r) => setTimeout(r, 1000));
        }
        setBatchCountdown(0);
      }
    }

    const wasStopped = stopBatchRef.current;
    setIsBatchRunning(false);
    setBatchCountdown(0);
    setGeneratingId(null);

    if (wasStopped) {
      showToast("Antrean generate massal telah dihentikan.");
    } else {
      showToast(`🎉 Selesai! Berhasil melebarkan cover landscape novel.`);
    }
  };

  const stopBatchGenerate = () => {
    stopBatchRef.current = true;
    showToast("Menghentikan antrean...");
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
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-emerald-500/95 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 backdrop-blur-md text-sm font-medium animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Subtitle */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
              <Star className="text-amber-400 fill-amber-400" size={24} />
              Top Rating
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl mt-1 leading-relaxed">
              100 novel rating tertinggi saat ini. Upload atau <strong>Generate Cover Landscape</strong> otomatis dari cover
              portrait asli tanpa mengubah gambar aslinya (100% utuh & ringan ~40KB WebP). Dipakai otomatis di banner carousel
              Home app.
            </p>
          </div>

          <button
            onClick={loadTopNovels}
            disabled={loading || isBatchRunning}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Counter, Quick Selection & Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-xs font-bold text-amber-300">
              <span>{withLandscapeCount}/{novels.length} novel udah punya cover landscape.</span>
            </div>

            {/* Tombol Seleksi Massal Cepat */}
            {!isBatchRunning && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={selectAllWithoutLandscape}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/20 transition-colors"
                >
                  Pilih Belum Ada Cover
                </button>
                <button
                  onClick={selectAllFiltered}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-colors"
                >
                  Pilih Semua ({filteredNovels.length})
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={clearSelection}
                    className="px-2 py-1 rounded-lg text-[11px] text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    Batal Pilih
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Search & Filter Mode */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Cari novel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-white/10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/40 w-40 md:w-52"
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

      {/* ═══ Active Batch Progress Banner ═══ */}
      {isBatchRunning && (
        <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-indigo-950/40 border border-amber-400/30 rounded-2xl p-4 md:p-5 shadow-2xl backdrop-blur-md space-y-3 animate-in fade-in slide-in-from-top-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
                <Sparkles size={16} className="animate-spin" />
                <span>Memproses Antrean Landscape ({batchCurrentIndex + 1} / {batchTotal})</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono">
                  {Math.round(((batchCurrentIndex + 1) / batchTotal) * 100)}%
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate max-w-xl">
                Novel saat ini: <strong className="text-white">{batchCurrentTitle || "Menyiapkan..."}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {batchCountdown > 0 ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-mono font-bold">
                  <Clock size={13} className="animate-pulse text-amber-400" />
                  <span>Jeda rate limit: {batchCountdown}s</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
                  <Sparkles size={13} className="animate-spin text-indigo-400" />
                  <span>Sedang memproses...</span>
                </div>
              )}

              <button
                onClick={stopBatchGenerate}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all shadow-sm"
              >
                <StopCircle size={14} />
                <span>Hentikan Antrean</span>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-amber-400 to-amber-500 h-full transition-all duration-500 rounded-full"
              style={{
                width: `${Math.max(5, Math.round(((batchCurrentIndex + 1) / batchTotal) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* ═══ Floating Batch Bar (Saat Novel Dipilih & Batch Belum Jalan) ═══ */}
      {selectedIds.size > 0 && !isBatchRunning && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-amber-400/30 backdrop-blur-xl shadow-2xl shadow-black/80 rounded-2xl px-5 py-3 flex flex-wrap items-center gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-extrabold text-xs flex items-center justify-center border border-amber-400/30">
              {selectedIds.size}
            </span>
            <span className="text-xs font-bold text-slate-100 hidden sm:inline">
              Novel Terpilih
            </span>
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          {/* Setting Delay Rate Limit */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Clock size={13} className="text-amber-400" />
            <span className="text-[11px] text-slate-400 hidden md:inline">Jeda:</span>
            <select
              value={batchDelaySeconds}
              onChange={(e) => setBatchDelaySeconds(Number(e.target.value))}
              className="bg-slate-800 text-amber-300 border border-amber-400/20 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-amber-400"
            >
              <option value={10}>10 Detik</option>
              <option value={15}>15 Detik</option>
              <option value={20}>20 Detik</option>
              <option value={25}>25 Detik (Rekomendasi)</option>
              <option value={30}>30 Detik</option>
            </select>
          </div>

          {/* Action Button: Generate Massal */}
          <button
            onClick={startBatchGenerate}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95"
          >
            <Sparkles size={14} />
            <span>Generate Terpilih ({selectedIds.size})</span>
          </button>

          <button
            onClick={clearSelection}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1"
          >
            Batal
          </button>
        </div>
      )}

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
        /* ═══ 3-Column Grid Cards ═══ */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNovels.map((novel, i) => {
            const isUploading = uploadingId === novel.id;
            const isDeleting = deletingId === novel.id;
            const isGenerating = generatingId === novel.id;
            const isSelected = selectedIds.has(novel.id);

            return (
              <div
                key={novel.id}
                className={`bg-[#10141b] border transition-all rounded-xl overflow-hidden group shadow-lg shadow-black/30 flex flex-col ${
                  isSelected
                    ? "border-amber-400 ring-1 ring-amber-400/40 shadow-amber-950/20"
                    : "border-white/5 hover:border-amber-400/20"
                }`}
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

                  {/* Top-Left: Checkbox + Rank & Rating Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                    {/* Checkbox Seleksi */}
                    <button
                      type="button"
                      onClick={() => toggleSelect(novel.id)}
                      disabled={isBatchRunning}
                      title={isSelected ? "Batalkan pilihan" : "Pilih untuk generate massal"}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                          : "bg-black/70 backdrop-blur-md text-slate-400 hover:text-amber-300 border border-white/20"
                      }`}
                    >
                      {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                    </button>

                    <span className="w-6 h-6 rounded-full bg-black/75 backdrop-blur-md flex items-center justify-center text-xs font-extrabold text-amber-400 border border-amber-400/20 shadow">
                      {i + 1}
                    </span>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/20 text-xs font-bold text-amber-300 shadow">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span>{novel.rating ? novel.rating.toFixed(2) : "9.00"}</span>
                    </div>
                  </div>

                  {/* Top-Right: Delete Landscape Button if exists */}
                  {novel.cover_landscape_url && !isBatchRunning && (
                    <button
                      onClick={() => onDeleteLandscape(novel)}
                      disabled={isDeleting || isUploading || isGenerating}
                      title="Hapus cover landscape ini"
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-black/75 backdrop-blur-md border border-rose-500/20 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors z-10"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}

                  {/* Active Generating Overlay */}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-2 text-amber-300 animate-in fade-in">
                      <Sparkles size={28} className="animate-spin text-amber-400" />
                      <span className="text-xs font-bold tracking-wide">Sedang melebarkan cover...</span>
                      <span className="text-[10px] text-slate-400">WebP 800x500 (~40KB)</span>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Portrait Thumbnail + Title + Dua Tombol Aksi */}
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

                  {/* Novel Details & Action Buttons */}
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

                    {/* ═══ Dua Tombol Berdampingan (Upload & Generate) ═══ */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {/* Tombol 1: Upload Cover Landscape */}
                      <button
                        type="button"
                        onClick={() => fileInputs.current[novel.id]?.click()}
                        disabled={isUploading || isDeleting || isGenerating || isBatchRunning}
                        title="Upload file gambar landscape dari komputer/HP"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all disabled:opacity-50"
                      >
                        <Upload size={12} className={isUploading ? "animate-bounce text-amber-400" : ""} />
                        <span>
                          {isUploading ? "Uploading..." : "Upload"}
                        </span>
                      </button>

                      {/* Tombol 2: Generate Cover Landscape */}
                      <button
                        type="button"
                        onClick={() => onGenerateLandscape(novel)}
                        disabled={
                          !novel.cover_url ||
                          isUploading ||
                          isDeleting ||
                          isGenerating ||
                          isBatchRunning
                        }
                        title={
                          !novel.cover_url
                            ? "Novel butuh cover portrait terlebih dahulu untuk dilebarkan"
                            : "Lebarkan cover portrait asli ke landscape 16:10 (~40KB WebP)"
                        }
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${
                          novel.cover_landscape_url
                            ? "bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border-amber-400/30"
                            : "bg-gradient-to-r from-amber-400/20 to-amber-500/20 hover:from-amber-400/30 hover:to-amber-500/30 text-amber-200 border-amber-400/40"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <Sparkles
                          size={12}
                          className={isGenerating ? "animate-spin text-amber-400" : "text-amber-400"}
                        />
                        <span>
                          {isGenerating
                            ? "Melebarkan..."
                            : novel.cover_landscape_url
                            ? "Re-generate"
                            : "Generate"}
                        </span>
                      </button>
                    </div>
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
