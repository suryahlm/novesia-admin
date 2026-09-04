"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Loader2,
  BookOpen,
  Search,
  Trash2,
  Edit3,
  CheckSquare,
  Square,
  X,
  AlertTriangle,
  Sparkles,
  Globe,
  StopCircle,
  CheckCircle2,
  XCircle,
  Languages,
} from "lucide-react";

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
  author: string | null;
  updated_at: string | null;
  // Translation stats
  has_synopsis: boolean;
  has_synopsis_translated: boolean;
  translated_chapters: number;
  pending_chapters: number;
  total_with_content: number;
}

interface TranslateProgress {
  totalNovels: number;
  totalChapters: number;
  totalSynopsis: number;
  currentNovelTitle: string;
  currentNovelId: string;
  currentChapterNumber: number;
  currentChapterIndex: number;
  currentChapterTotal: number;
  completedChapters: number;
  failedChapters: number;
  synopsisTranslated: number;
  phase: "synopsis" | "chapter" | "idle";
  attempt: number;
}

interface TranslateLogEntry {
  novelId: string;
  novelTitle: string;
  synopsisOk: boolean;
  translated: number;
  failed: number;
  skipped?: boolean;
}

const SOURCE_TABS = [
  { id: "all", label: "Semua", icon: "📋", color: "from-violet-600 to-indigo-600", shadow: "shadow-violet-500/20" },
  { id: "akknovel", label: "AkkNovel", icon: "✨", color: "from-rose-600 to-pink-600", shadow: "shadow-rose-500/20" },
  { id: "talesinthevalley", label: "TalesInTheValley", icon: "⚔️", color: "from-blue-600 to-cyan-600", shadow: "shadow-blue-500/20" },
  { id: "tinytranslation", label: "TinyTranslation", icon: "🍄", color: "from-purple-600 to-fuchsia-600", shadow: "shadow-purple-500/20" },
  { id: "cuttlefishreads", label: "CuttlefishReads", icon: "🦑", color: "from-amber-600 to-orange-600", shadow: "shadow-amber-500/20" },
  { id: "transcendentaltls", label: "TranscendentalTLS", icon: "📖", color: "from-orange-600 to-amber-600", shadow: "shadow-orange-500/20" },
  { id: "general", label: "General", icon: "🌐", color: "from-gray-600 to-slate-600", shadow: "shadow-gray-500/20" },
];

export default function EditNovelPage() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeSource, setActiveSource] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    type: "single" | "bulk" | "translate" | "translate-source";
    novelId?: string;
    novelTitle?: string;
    sourceLabel?: string;
  } | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Bulk Translate State
  const [bulkTranslating, setBulkTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState<TranslateProgress | null>(null);
  const [translateLog, setTranslateLog] = useState<TranslateLogEntry[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  useEffect(() => {
    fetchNovels();
    checkBackgroundJob();
  }, []);

  // Poll background job when bulkTranslating is active
  useEffect(() => {
    if (!bulkTranslating) return;

    const interval = setInterval(() => {
      checkBackgroundJob();
    }, 2000);

    return () => clearInterval(interval);
  }, [bulkTranslating]);

  const checkBackgroundJob = async () => {
    try {
      const res = await fetch("/api/translate/bulk");
      const data = await res.json();
      if (data.job) {
        syncJobState(data.job);
      }
    } catch (err) {
      console.error("Gagal memeriksa status background translate:", err);
    }
  };

  const syncJobState = (job: any) => {
    if (job.status === "running") {
      setBulkTranslating(true);
      setTranslateProgress({
        totalNovels: job.totalNovels || 0,
        totalChapters: job.totalChapters || 0,
        totalSynopsis: job.totalSynopsis || 0,
        currentNovelTitle: job.currentNovelTitle || "",
        currentNovelId: job.currentNovelId || "",
        currentChapterNumber: job.currentChapterNumber || 0,
        currentChapterIndex: job.currentChapterIndex || 0,
        currentChapterTotal: job.currentChapterTotal || 0,
        completedChapters: job.completedChapters || 0,
        failedChapters: job.failedChapters || 0,
        synopsisTranslated: job.synopsisTranslated || 0,
        phase: job.phase || "idle",
        attempt: job.attempt || 1,
      });
      setTranslateLog(job.logs || []);
    } else if (job.status === "completed") {
      setBulkTranslating((wasRunning) => {
        if (wasRunning) {
          showMsg(
            job.failedChapters === 0 ? "ok" : "err",
            `🎉 Selesai! ${job.completedChapters} chapter + ${job.synopsisTranslated} sinopsis berhasil (${job.failedChapters} gagal)`
          );
          fetchNovels();
        }
        return false;
      });
    } else if (job.status === "stopped") {
      setBulkTranslating((wasRunning) => {
        if (wasRunning) {
          showMsg("ok", "Translate background dihentikan oleh user.");
          fetchNovels();
        }
        return false;
      });
    } else if (job.status === "error") {
      setBulkTranslating((wasRunning) => {
        if (wasRunning) {
          showMsg("err", `Translate error: ${job.error || "Terjadi kesalahan"}`);
          fetchNovels();
        }
        return false;
      });
    }
  };

  const fetchNovels = async () => {
    try {
      const res = await fetch("/api/novels/all");
      const data = await res.json();
      setNovels(data.novels || []);
    } catch (err) {
      console.error("Gagal memuat novel:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter by source & search
  const filtered = useMemo(() => {
    let result = novels;

    if (activeSource !== "all") {
      result = result.filter((n) => (n.source || "general") === activeSource);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.nu_slug && n.nu_slug.toLowerCase().includes(q)) ||
          (n.author && n.author.toLowerCase().includes(q))
      );
    }

    return result;
  }, [novels, activeSource, search]);

  // Source counts
  const sourceCounts: Record<string, number> = { all: novels.length };
  novels.forEach((n) => {
    const src = n.source || "general";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((n) => n.id)));
    }
  };

  // Delete single
  const handleDeleteSingle = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/novels/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      setNovels((prev) => prev.filter((n) => n.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      showMsg("err", err.message);
    } finally {
      setDeletingId(null);
      setConfirmModal(null);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/novels/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Gagal menghapus");
      setNovels((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
      showMsg("ok", `✅ ${ids.length} novel berhasil dihapus`);
    } catch (err: any) {
      showMsg("err", err.message);
    } finally {
      setBulkDeleting(false);
      setConfirmModal(null);
    }
  };

  // Bulk generate genre
  const handleBulkGenerate = async () => {
    setBulkGenerating(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/novels/bulk-generate-genre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal meng-generate genre");
      
      showMsg("ok", `✅ ${data.message}`);
      await fetchNovels();
      setSelectedIds(new Set());
    } catch (err: any) {
      showMsg("err", err.message);
    } finally {
      setBulkGenerating(false);
    }
  };

  // === BULK TRANSLATE (BACKGROUND WORKER) ===
  const handleBulkTranslate = async (novelIds: string[]) => {
    if (novelIds.length === 0) return;
    setConfirmModal(null);

    try {
      const res = await fetch("/api/translate/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novelIds, sourceLabel: activeSourceLabel }),
      });
      const data = await res.json();

      if (!res.ok) {
        showMsg("err", data.error || "Gagal meluncurkan background translate");
        checkBackgroundJob();
        return;
      }

      setBulkTranslating(true);
      if (data.job) {
        syncJobState(data.job);
      }
      showMsg("ok", "🚀 Background translate aktif! Anda bebas menutup tab atau browser kapan saja.");
    } catch (err: any) {
      showMsg("err", `Error: ${err.message}`);
    }
  };

  const handleStopTranslate = async () => {
    try {
      const res = await fetch("/api/translate/bulk/stop", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        showMsg("ok", "Menghentikan background translate...");
        checkBackgroundJob();
      } else {
        showMsg("err", data.message || "Gagal menghentikan translate");
      }
    } catch (err: any) {
      showMsg("err", `Gagal menghentikan: ${err.message}`);
    }
  };

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  // Quick translate all novels in current source tab
  const handleTranslateSource = () => {
    const sourceNovels = activeSource === "all"
      ? novels
      : novels.filter((n) => (n.source || "general") === activeSource);
    const ids = sourceNovels.map((n) => n.id);
    handleBulkTranslate(ids);
  };

  // Translate selected novels
  const handleTranslateSelected = () => {
    handleBulkTranslate(Array.from(selectedIds));
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  // Compute translate stats for confirm modal
  const getTranslateStats = (ids: string[]) => {
    const idSet = new Set(ids);
    const selected = novels.filter((n) => idSet.has(n.id));
    const pendingSynopsis = selected.filter((n) => n.has_synopsis && !n.has_synopsis_translated).length;
    const pendingChapters = selected.reduce((sum, n) => sum + (n.pending_chapters || 0), 0);
    return { count: selected.length, pendingSynopsis, pendingChapters };
  };

  // Active source label
  const activeSourceLabel = SOURCE_TABS.find((s) => s.id === activeSource)?.label || "Semua";

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {message && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl text-xs font-bold animate-in slide-in-from-right-5 duration-300 border flex items-center gap-2.5 ${
            message.type === "ok"
              ? "bg-[#0b1b17]/95 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10"
              : "bg-[#220d11]/95 border-rose-500/40 text-rose-300 shadow-rose-500/10"
          }`}
        >
          <span>{message.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Edit & Pengelolaan Novel
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Kelola metadata, chapter, dan jalankan aksi massal untuk {novels.length} novel terdaftar
          </p>
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.size > 0 && !bulkTranslating && (
          <div className="flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-200">
            {/* Translate Massal */}
            <button
              onClick={() => setConfirmModal({ type: "translate" })}
              disabled={bulkTranslating || bulkDeleting || bulkGenerating}
              className="px-3.5 py-2 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-500 hover:brightness-110 text-white rounded-lg text-xs font-semibold shadow-[0_2px_12px_-2px_rgba(59,130,246,0.45)] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Translate Massal ({selectedIds.size})</span>
            </button>

            <button
              onClick={handleBulkGenerate}
              disabled={bulkGenerating || bulkDeleting || bulkTranslating}
              className="px-3.5 py-2 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 rounded-lg text-xs font-semibold shadow-[0_2px_12px_-2px_rgba(221,168,58,0.45)] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {bulkGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Auto Generate Genre ({selectedIds.size})</span>
            </button>

            <button
              onClick={() => setConfirmModal({ type: "bulk" })}
              disabled={bulkDeleting || bulkGenerating || bulkTranslating}
              className="px-3.5 py-2 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-900/60 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {bulkDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Hapus ({selectedIds.size})</span>
            </button>
          </div>
        )}
      </div>

      {/* Source Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
        {SOURCE_TABS.map((src) => {
          const count = sourceCounts[src.id] || 0;
          if (src.id !== "all" && count === 0) return null;
          const isActive = activeSource === src.id;

          return (
            <button
              key={src.id}
              onClick={() => setActiveSource(src.id)}
              className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                isActive
                  ? "bg-amber-400/15 border-amber-400/30 text-amber-300"
                  : "bg-[#12151b] border-white/5 hover:border-white/10 text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{src.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold truncate ${isActive ? "text-amber-200" : "text-slate-200"}`}>
                    {src.label}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">{count} novel</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & Selection Bar */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari novel berdasarkan judul, slug, atau author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-[#0a0c10] border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/70 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Translate Source Button */}
          {!bulkTranslating && (
            <button
              onClick={() => setConfirmModal({ type: "translate-source", sourceLabel: activeSourceLabel })}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-br from-cyan-500/15 to-blue-500/15 text-cyan-300 border border-cyan-500/20 hover:border-cyan-400/40 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Languages className="w-4 h-4" />
              <span className="hidden sm:inline">Translate {activeSourceLabel}</span>
              <span className="sm:hidden">Translate</span>
            </button>
          )}

          <button
            onClick={selectAll}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              allSelected
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                : "bg-[#0a0c10] text-slate-300 border border-white/10 hover:bg-white/5"
            }`}
          >
            {allSelected ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4" />}
            <span>{allSelected ? "Batal Pilih" : "Pilih Semua"}</span>
          </button>
        </div>
      </div>

      {/* Bulk Translate Progress Panel */}
      {bulkTranslating && translateProgress && (
        <div className="bg-[#0d1520] border border-cyan-500/20 rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
                <Globe className="w-4 h-4 text-cyan-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100">Translate Massal Berjalan</h3>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Background Aktif (Aman tutup browser)
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {translateProgress.completedChapters + translateProgress.failedChapters} / {translateProgress.totalChapters} chapter
                  {translateProgress.totalSynopsis > 0 && ` • ${translateProgress.synopsisTranslated} sinopsis`}
                </p>
              </div>
            </div>
            <button
              onClick={handleStopTranslate}
              className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-900/50 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>Stop</span>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-2 bg-[#0a0c10] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: translateProgress.totalChapters > 0
                    ? `${Math.round(((translateProgress.completedChapters + translateProgress.failedChapters) / translateProgress.totalChapters) * 100)}%`
                    : "0%",
                }}
              />
            </div>

            {/* Current Status */}
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-slate-300 min-w-0">
                {translateProgress.phase === "synopsis" ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-cyan-400 shrink-0" />
                    <span className="truncate">
                      Sinopsis — <span className="text-cyan-300 font-medium">{translateProgress.currentNovelTitle}</span>
                      {translateProgress.attempt > 1 && <span className="text-amber-400 ml-1">(Retry {translateProgress.attempt})</span>}
                    </span>
                  </>
                ) : translateProgress.phase === "chapter" && translateProgress.currentChapterNumber > 0 ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-cyan-400 shrink-0" />
                    <span className="truncate">
                      Ch.{translateProgress.currentChapterNumber} ({translateProgress.currentChapterIndex}/{translateProgress.currentChapterTotal})
                      — <span className="text-cyan-300 font-medium">{translateProgress.currentNovelTitle}</span>
                      {translateProgress.attempt > 1 && <span className="text-amber-400 ml-1">(Retry {translateProgress.attempt})</span>}
                    </span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-cyan-400 shrink-0" />
                    <span className="text-slate-400">Mempersiapkan...</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-[10px]">
                <span className="text-emerald-400 font-mono">{translateProgress.completedChapters} ✓</span>
                {translateProgress.failedChapters > 0 && (
                  <span className="text-red-400 font-mono">{translateProgress.failedChapters} ✗</span>
                )}
              </div>
            </div>
          </div>

          {/* Log */}
          {translateLog.length > 0 && (
            <div className="max-h-36 overflow-y-auto space-y-1.5 border-t border-white/5 pt-3">
              {translateLog.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  {entry.skipped ? (
                    <span className="text-slate-500">—</span>
                  ) : entry.failed === 0 ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3 h-3 text-amber-400 shrink-0" />
                  )}
                  <span className="text-slate-300 truncate flex-1">{entry.novelTitle}</span>
                  <span className="text-slate-500 font-mono text-[10px] shrink-0">
                    {entry.skipped ? "skip" : `${entry.translated}ch${entry.synopsisOk ? " +sinopsis" : ""}`}
                    {entry.failed > 0 && <span className="text-red-400"> {entry.failed}fail</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Novel List Container */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl overflow-hidden w-full min-w-0">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            <span className="text-xs">Memuat koleksi novel...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="mt-3 text-xs">
              {search ? "Tidak ada novel yang cocok dengan pencarian." : "Belum ada novel di kategori ini."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((novel) => {
              const isSelected = selectedIds.has(novel.id);
              const isDeleting = deletingId === novel.id;

              return (
                <div
                  key={novel.id}
                  className={`flex items-center justify-between gap-3 sm:gap-4 px-3 sm:px-4 py-3 transition-colors min-w-0 ${
                    isSelected
                      ? "bg-amber-400/5 border-l-2 border-l-amber-400"
                      : "hover:bg-white/5 border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(novel.id)}
                      className={`shrink-0 transition-colors cursor-pointer p-1 ${
                        isSelected ? "text-amber-400" : "text-slate-600 hover:text-slate-400"
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    {/* Cover */}
                    <div className="w-9 h-12 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-white/5 relative">
                      {novel.cover_url ? (
                        <img
                          src={novel.cover_url}
                          alt={novel.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                          <BookOpen className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs sm:text-sm text-slate-100 truncate">
                        {novel.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {novel.total_chapters || 0} ch
                        </span>
                        <span className="text-slate-600 text-[10px]">•</span>
                        <span className="text-[11px] text-slate-400 truncate max-w-[110px] sm:max-w-[160px]">
                          {novel.author || "—"}
                        </span>
                        <span className="text-slate-600 text-[10px]">•</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            novel.status === "active"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                              : novel.status === "draft"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                              : "bg-slate-500/15 text-slate-400 border border-slate-500/20"
                          }`}
                        >
                          {novel.status === "active"
                            ? "Published"
                            : novel.status === "draft"
                            ? "Draft"
                            : novel.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Translation Badge + Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Translation Stats Badge */}
                    <div className="hidden md:flex items-center gap-1.5">
                      {/* Synopsis badge */}
                      {novel.has_synopsis && (
                        <span
                          className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            novel.has_synopsis_translated
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                              : "bg-slate-800 text-slate-500 border border-white/5"
                          }`}
                          title={novel.has_synopsis_translated ? "Sinopsis sudah diterjemahkan" : "Sinopsis belum diterjemahkan"}
                        >
                          {novel.has_synopsis_translated ? "✓ Sin" : "✗ Sin"}
                        </span>
                      )}
                      {/* Chapter translate badge */}
                      {(novel.total_with_content > 0 || novel.translated_chapters > 0) && (
                        <span
                          className={`text-[8px] px-1.5 py-0.5 rounded font-mono ${
                            novel.pending_chapters === 0 && novel.translated_chapters > 0
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                              : novel.translated_chapters > 0
                              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15"
                              : "bg-slate-800 text-slate-500 border border-white/5"
                          }`}
                          title={`${novel.translated_chapters} translated, ${novel.pending_chapters} pending`}
                        >
                          {novel.translated_chapters}/{novel.total_with_content} ch
                        </span>
                      )}
                    </div>

                    <span className="text-[9px] px-2 py-0.5 bg-[#0a0c10] border border-white/5 text-slate-400 rounded font-mono uppercase hidden md:inline-block">
                      {novel.source || "general"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/novels/${novel.nu_slug}`}
                        className="p-1.5 rounded-lg bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 border border-amber-400/20 transition-all cursor-pointer"
                        title="Edit Studio Novel"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        onClick={() =>
                          setConfirmModal({
                            type: "single",
                            novelId: novel.id,
                            novelTitle: novel.title,
                          })
                        }
                        disabled={isDeleting}
                        className="p-1.5 rounded-lg bg-red-950/60 text-red-300 hover:bg-red-900/60 border border-red-900/60 transition-all cursor-pointer disabled:opacity-40"
                        title="Hapus Novel"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Modal — Delete / Translate */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12151b] border border-white/10 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            {/* DELETE MODALS */}
            {(confirmModal.type === "single" || confirmModal.type === "bulk") && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      {confirmModal.type === "bulk"
                        ? `Hapus ${selectedIds.size} Novel?`
                        : "Hapus Novel Ini?"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tindakan ini tidak dapat dibatalkan
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-[#0a0c10] border border-white/5 p-3 rounded-lg">
                  {confirmModal.type === "bulk"
                    ? `${selectedIds.size} novel yang dipilih akan dihapus secara permanen beserta semua chapter dan aset di Cloudflare R2.`
                    : `Novel "${confirmModal.novelTitle}" akan dihapus permanen beserta seluruh chapter dan aset terkait.`}
                </p>

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="px-4 py-2 bg-[#0a0c10] hover:bg-white/5 text-slate-300 rounded-lg text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() =>
                      confirmModal.type === "bulk"
                        ? handleBulkDelete()
                        : handleDeleteSingle(confirmModal.novelId!)
                    }
                    disabled={bulkDeleting || !!deletingId}
                    className="px-4 py-2 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-900/60 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {bulkDeleting || deletingId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Hapus Permanen</span>
                  </button>
                </div>
              </>
            )}

            {/* TRANSLATE MODALS */}
            {(confirmModal.type === "translate" || confirmModal.type === "translate-source") && (() => {
              const targetIds = confirmModal.type === "translate"
                ? Array.from(selectedIds)
                : (activeSource === "all"
                    ? novels.map((n) => n.id)
                    : novels.filter((n) => (n.source || "general") === activeSource).map((n) => n.id));
              const stats = getTranslateStats(targetIds);

              return (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">
                        {confirmModal.type === "translate"
                          ? `Translate ${stats.count} Novel`
                          : `Translate Semua ${confirmModal.sourceLabel}`}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Sinopsis + chapter yang belum diterjemahkan
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#0a0c10] border border-white/5 p-3.5 rounded-lg space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Novel</span>
                      <span className="text-slate-200 font-semibold">{stats.count} judul</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Sinopsis pending</span>
                      <span className={`font-semibold ${stats.pendingSynopsis > 0 ? "text-cyan-300" : "text-emerald-400"}`}>
                        {stats.pendingSynopsis > 0 ? `${stats.pendingSynopsis} sinopsis` : "Semua sudah ✓"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Chapter pending</span>
                      <span className={`font-semibold ${stats.pendingChapters > 0 ? "text-cyan-300" : "text-emerald-400"}`}>
                        {stats.pendingChapters > 0 ? `${stats.pendingChapters} chapter` : "Semua sudah ✓"}
                      </span>
                    </div>
                    {stats.pendingChapters > 0 && (
                      <div className="flex justify-between text-xs border-t border-white/5 pt-2 mt-1">
                        <span className="text-slate-400">Estimasi durasi</span>
                        <span className="text-slate-300 font-mono">
                          ~{formatDuration(Math.ceil((stats.pendingChapters + stats.pendingSynopsis) * 2.5))}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 flex items-center gap-2 text-[11px] text-emerald-300">
                    <span className="text-sm">🛡️</span>
                    <span>Translate berjalan mandiri di background server. Anda bebas menutup tab atau browser kapan saja setelah tombol diklik.</span>
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => setConfirmModal(null)}
                      className="px-4 py-2 bg-[#0a0c10] hover:bg-white/5 text-slate-300 rounded-lg text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => handleBulkTranslate(targetIds)}
                      disabled={stats.pendingChapters === 0 && stats.pendingSynopsis === 0}
                      className="px-4 py-2 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-500 hover:brightness-110 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_2px_12px_-2px_rgba(59,130,246,0.45)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Mulai Translate</span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
