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
  Clock,
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
      const rawList: any[] = Array.isArray(data) ? data : (data?.novels || data?.data || []);
      const formatted: Novel[] = rawList.map((n: any) => {
        const total = Number(n.total_with_content ?? n.total_chapters ?? n.totalChapters ?? 0);
        const translated = Number(n.translated_chapters ?? 0);
        let pending = n.pending_chapters !== undefined && n.pending_chapters !== null && Number(n.pending_chapters) > 0
          ? Number(n.pending_chapters)
          : Math.max(0, total - translated);

        return {
          ...n,
          genres: Array.isArray(n.genres) ? n.genres : [],
          has_synopsis: Boolean(n.synopsis || n.has_synopsis),
          has_synopsis_translated: Boolean(n.synopsis_translated || n.synopsisTranslated || n.has_synopsis_translated),
          translated_chapters: translated,
          pending_chapters: pending,
          total_with_content: total,
        };
      });
      setNovels(formatted);
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
    const pendingChapters = selected.reduce((sum, n) => {
      const total = Number(n.total_with_content || n.total_chapters || 0);
      const translated = Number(n.translated_chapters || 0);
      const pending = n.pending_chapters !== undefined && n.pending_chapters !== null && Number(n.pending_chapters) > 0
        ? Number(n.pending_chapters)
        : Math.max(0, total - translated);
      return sum + pending;
    }, 0);
    return { count: selected.length, pendingSynopsis, pendingChapters };
  };

  // Active source label
  const activeSourceLabel = SOURCE_TABS.find((s) => s.id === activeSource)?.label || "Semua";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Toast Notification */}
      {message && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl text-xs font-bold animate-in slide-in-from-right-5 duration-300 border flex items-center gap-2.5 backdrop-blur-xl ${
            message.type === "ok"
              ? "bg-[#0b1b17]/95 border-emerald-500/40 text-emerald-300 shadow-emerald-500/20"
              : "bg-[#220d11]/95 border-rose-500/40 text-rose-300 shadow-rose-500/20"
          }`}
        >
          <span>{message.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B99762]/10 border border-[#B99762]/20 text-[11px] font-semibold text-[#E5C378] tracking-wide mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D4A843]" />
            <span>KATALOG & MANAJEMEN NOVEL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Edit & Pengelolaan Novel
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Kelola metadata novel, bab, dan sinkronisasi terjemahan untuk{" "}
            <span className="text-slate-200 font-semibold">{novels.length} novel terdaftar</span>
          </p>
        </div>

        {/* Dynamic Action Area: Quick Stats or Selected Bulk Toolbar */}
        {selectedIds.size > 0 && !bulkTranslating ? (
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-900/90 border border-[#B99762]/30 p-2 rounded-2xl shadow-xl shadow-black/40 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            <span className="text-xs font-bold text-[#E5C378] px-2">
              {selectedIds.size} dipilih
            </span>

            {/* Translate Massal */}
            <button
              onClick={() => setConfirmModal({ type: "translate" })}
              disabled={bulkTranslating || bulkDeleting || bulkGenerating}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Translate ({selectedIds.size})</span>
            </button>

            {/* Auto Generate Genre */}
            <button
              onClick={handleBulkGenerate}
              disabled={bulkGenerating || bulkDeleting || bulkTranslating}
              className="px-3.5 py-2 bg-gradient-to-r from-[#E5C378] via-[#D4A843] to-[#B88B2E] hover:brightness-110 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-[#D4A843]/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {bulkGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Auto Genre</span>
            </button>

            {/* Hapus Massal */}
            <button
              onClick={() => setConfirmModal({ type: "bulk" })}
              disabled={bulkDeleting || bulkGenerating || bulkTranslating}
              className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {bulkDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Hapus</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/60 border border-white/[0.06] text-xs text-slate-300 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span><strong className="text-slate-100">{novels.filter((n) => n.status === "active").length}</strong> Published</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/60 border border-white/[0.06] text-xs text-slate-300 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#D4A843]" />
              <span><strong className="text-slate-100">{novels.filter((n) => n.status === "draft").length}</strong> Draft</span>
            </div>
          </div>
        )}
      </div>

      {/* Source Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
        {SOURCE_TABS.map((src) => {
          const count = sourceCounts[src.id] || 0;
          if (src.id !== "all" && count === 0) return null;
          const isActive = activeSource === src.id;

          return (
            <button
              key={src.id}
              onClick={() => setActiveSource(src.id)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                isActive
                  ? "bg-gradient-to-b from-[#B99762]/20 to-[#B99762]/5 border-[#B99762]/50 text-[#F5E6C8] shadow-[0_0_15px_-3px_rgba(185,151,98,0.25)]"
                  : "bg-slate-900/60 hover:bg-white/[0.04] border-white/[0.06] hover:border-white/[0.12] text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-sm">{src.icon}</span>
              <span className={`text-xs font-semibold ${isActive ? "text-[#F5E6C8]" : "text-slate-200"}`}>
                {src.label}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                  isActive
                    ? "bg-[#B99762]/30 text-[#F5E6C8] font-bold"
                    : "bg-white/[0.05] text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Selection Toolbar */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/[0.07] rounded-2xl p-2.5 sm:p-3 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B99762]/70" />
          <input
            type="text"
            placeholder="Cari novel berdasarkan judul, slug, atau author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#B99762] focus:ring-1 focus:ring-[#B99762]/40 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end shrink-0">
          {/* Result Count Chip */}
          <span className="text-xs text-slate-400 hidden lg:inline px-1">
            <strong className="text-slate-200">{filtered.length}</strong> novel ditampilkan
          </span>

          {/* Quick Translate Source Button */}
          {!bulkTranslating && (
            <button
              onClick={() => setConfirmModal({ type: "translate-source", sourceLabel: activeSourceLabel })}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 text-cyan-300 border border-cyan-500/25 hover:border-cyan-400/50 hover:bg-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Languages className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Translate {activeSourceLabel}</span>
              <span className="sm:hidden">Translate</span>
            </button>
          )}

          {/* Select All */}
          <button
            onClick={selectAll}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              allSelected
                ? "bg-[#B99762]/20 text-[#F5E6C8] border border-[#B99762]/40 shadow-sm"
                : "bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08]"
            }`}
          >
            {allSelected ? <CheckSquare className="w-4 h-4 text-[#D4A843]" /> : <Square className="w-4 h-4 text-slate-400" />}
            <span>{allSelected ? "Batal Pilih" : "Pilih Semua"}</span>
          </button>
        </div>
      </div>

      {/* Bulk Translate Progress Panel */}
      {bulkTranslating && translateProgress && (
        <div className="bg-[#0b1523]/80 border border-cyan-500/25 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-3 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                <Globe className="w-4 h-4 text-cyan-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100">Translate Massal Sedang Berjalan</h3>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Background Aktif (Aman tutup tab)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {translateProgress.completedChapters + translateProgress.failedChapters} / {translateProgress.totalChapters} bab
                  {translateProgress.totalSynopsis > 0 && ` • ${translateProgress.synopsisTranslated} sinopsis`}
                </p>
              </div>
            </div>
            <button
              onClick={handleStopTranslate}
              className="px-3.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>Hentikan</span>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/[0.06]">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                style={{
                  width: translateProgress.totalChapters > 0
                    ? `${Math.round(((translateProgress.completedChapters + translateProgress.failedChapters) / translateProgress.totalChapters) * 100)}%`
                    : "0%",
                }}
              />
            </div>

            {/* Current Status */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300 min-w-0">
                {translateProgress.phase === "synopsis" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
                    <span className="truncate">
                      Menerjemahkan Sinopsis: <strong className="text-cyan-300 font-semibold">{translateProgress.currentNovelTitle}</strong>
                      {translateProgress.attempt > 1 && <span className="text-[#D4A843] ml-1">(Percobaan {translateProgress.attempt})</span>}
                    </span>
                  </>
                ) : translateProgress.phase === "chapter" && translateProgress.currentChapterNumber > 0 ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
                    <span className="truncate">
                      Bab {translateProgress.currentChapterNumber} ({translateProgress.currentChapterIndex}/{translateProgress.currentChapterTotal})
                      — <strong className="text-cyan-300 font-semibold">{translateProgress.currentNovelTitle}</strong>
                      {translateProgress.attempt > 1 && <span className="text-[#D4A843] ml-1">(Percobaan {translateProgress.attempt})</span>}
                    </span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
                    <span className="text-slate-400">Mempersiapkan terjemahan...</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                <span className="text-emerald-400 font-bold">{translateProgress.completedChapters} ✓</span>
                {translateProgress.failedChapters > 0 && (
                  <span className="text-rose-400 font-bold">{translateProgress.failedChapters} ✗</span>
                )}
              </div>
            </div>
          </div>

          {/* Log List */}
          {translateLog.length > 0 && (
            <div className="max-h-36 overflow-y-auto space-y-1.5 border-t border-white/[0.06] pt-3 pr-1">
              {translateLog.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {entry.skipped ? (
                    <span className="text-slate-500">—</span>
                  ) : entry.failed === 0 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-[#D4A843] shrink-0" />
                  )}
                  <span className="text-slate-300 truncate flex-1">{entry.novelTitle}</span>
                  <span className="text-slate-400 font-mono text-[11px] shrink-0">
                    {entry.skipped ? "skip" : `${entry.translated} bab${entry.synopsisOk ? " +sinopsis" : ""}`}
                    {entry.failed > 0 && <span className="text-rose-400"> {entry.failed} gagal</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Novel List Container */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl w-full min-w-0">
        {/* Table Header (Desktop) */}
        {!loading && filtered.length > 0 && (
          <div className="hidden lg:flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-black/20 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="w-5 text-center">#</span>
              <span>Novel & Metadata</span>
            </div>
            <div className="flex items-center gap-6 shrink-0">
              <span className="w-32 text-center">Status Sinopsis</span>
              <span className="w-40 text-left">Progres Bab</span>
              <span className="w-32 text-center">Sumber</span>
              <span className="w-20 text-right">Aksi</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-[#D4A843]" />
            <span className="text-xs font-medium">Memuat katalog novel...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-20 text-center text-slate-400">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto stroke-1" />
            <p className="mt-3 text-sm font-medium text-slate-300">
              {search ? "Tidak ada novel yang cocok dengan pencarian." : "Belum ada novel di kategori ini."}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-2 text-xs text-[#D4A843] hover:underline cursor-pointer"
              >
                Reset Pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((novel) => {
              const isSelected = selectedIds.has(novel.id);
              const isDeleting = deletingId === novel.id;
              const totalCh = novel.total_with_content || novel.total_chapters || 0;
              const transCh = novel.translated_chapters || 0;
              const percent = totalCh > 0 ? Math.min(100, Math.round((transCh / totalCh) * 100)) : 0;

              return (
                <div
                  key={novel.id}
                  className={`group/row flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4 px-4 sm:px-5 py-3.5 transition-all duration-150 ${
                    isSelected
                      ? "bg-[#B99762]/[0.08] border-l-4 border-l-[#D4A843]"
                      : "hover:bg-white/[0.025] border-l-4 border-l-transparent"
                  }`}
                >
                  {/* Left: Checkbox, Cover, Title, Metadata */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <button
                      onClick={() => toggleSelect(novel.id)}
                      className={`shrink-0 p-1 transition-colors cursor-pointer rounded-lg hover:bg-white/[0.06] ${
                        isSelected ? "text-[#D4A843]" : "text-slate-500 hover:text-slate-300"
                      }`}
                      title={isSelected ? "Batalkan pilihan" : "Pilih novel ini"}
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>

                    {/* Cover Thumbnail */}
                    <div className="w-11 h-15 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-white/[0.08] shadow-md relative group-hover/row:border-[#B99762]/30 transition-all">
                      {novel.cover_url ? (
                        <img
                          src={novel.cover_url}
                          alt={novel.title}
                          className="w-full h-full object-cover group-hover/row:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 bg-gradient-to-b from-slate-800/60 to-slate-900/80">
                          <BookOpen className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Novel Details */}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/novels/${novel.nu_slug}`}
                        className="font-semibold text-xs sm:text-sm text-slate-100 group-hover/row:text-[#F3E7C4] transition-colors truncate block max-w-xl"
                        title={novel.title}
                      >
                        {novel.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono font-medium text-slate-300 bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-white/[0.05]">
                          {novel.total_chapters || 0} ch
                        </span>
                        <span className="text-slate-600 text-[10px]">•</span>
                        <span className="text-[11px] text-slate-400 truncate max-w-[130px] sm:max-w-[200px]">
                          {novel.author || "—"}
                        </span>
                        <span className="text-slate-600 text-[10px]">•</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide ${
                            novel.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : novel.status === "draft"
                              ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                              : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
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

                  {/* Right: Columns for Synopsis, Chapter Progress, Source, and Actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 sm:gap-6 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/[0.04]">
                    {/* Status Sinopsis */}
                    <div className="w-auto lg:w-32 flex justify-start lg:justify-center">
                      {novel.has_synopsis ? (
                        novel.has_synopsis_translated ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold"
                            title="Sinopsis bahasa Indonesia sudah siap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ID Siap</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold"
                            title="Sinopsis ada namun belum diterjemahkan ke ID"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Belum ID</span>
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.02] text-slate-500 border border-white/[0.04] text-xs font-medium">
                          — Kosong
                        </span>
                      )}
                    </div>

                    {/* Progres Bab */}
                    <div className="w-auto lg:w-40 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-300 font-semibold">
                          {transCh}/{totalCh} ch
                        </span>
                        <span className={percent === 100 ? "text-emerald-400 font-bold" : percent > 0 ? "text-cyan-400 font-bold" : "text-slate-500"}>
                          {percent}%
                        </span>
                      </div>
                      <div className="w-28 sm:w-36 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            percent === 100
                              ? "bg-emerald-400"
                              : percent > 0
                              ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                              : "bg-slate-700"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Source */}
                    <div className="hidden sm:flex lg:w-32 justify-center">
                      <span className="text-[11px] px-2.5 py-1 bg-white/[0.03] border border-white/[0.06] text-slate-300 rounded-lg font-mono uppercase tracking-wider">
                        {novel.source || "general"}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 lg:w-20 justify-end">
                      <Link
                        href={`/admin/novels/${novel.nu_slug}`}
                        className="p-2 rounded-xl bg-white/[0.04] hover:bg-[#B99762]/15 text-slate-300 hover:text-[#E5C378] border border-white/[0.08] hover:border-[#B99762]/30 transition-all cursor-pointer shadow-sm"
                        title="Buka Novel Studio"
                      >
                        <Edit3 className="w-4 h-4" />
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
                        className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 border border-white/[0.08] hover:border-rose-500/30 transition-all cursor-pointer disabled:opacity-40 shadow-sm"
                        title="Hapus Novel"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0d1117] border border-white/[0.1] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] space-y-5 animate-in zoom-in-95 duration-200">
            {/* DELETE MODALS */}
            {(confirmModal.type === "single" || confirmModal.type === "bulk") && (
              <>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                      {confirmModal.type === "bulk"
                        ? `Hapus ${selectedIds.size} Novel?`
                        : "Hapus Novel Ini?"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Tindakan ini permanen dan menghapus seluruh chapter di database dan Cloudflare R2.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.06] text-xs text-slate-300 leading-relaxed">
                  {confirmModal.type === "bulk" ? (
                    <span>
                      Anda akan menghapus{" "}
                      <strong className="text-rose-300 font-bold">{selectedIds.size} novel</strong>{" "}
                      yang dipilih secara bersamaan. Data tidak dapat dipulihkan kembali.
                    </span>
                  ) : (
                    <span>
                      Novel <strong className="text-slate-100 font-semibold">"{confirmModal.novelTitle}"</strong>{" "}
                      akan dihapus dari katalog beserta seluruh chapter dan aset terkait.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setConfirmModal(null)}
                    disabled={bulkDeleting || !!deletingId}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition-all cursor-pointer disabled:opacity-40"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      confirmModal.type === "bulk"
                        ? handleBulkDelete()
                        : handleDeleteSingle(confirmModal.novelId!)
                    }
                    disabled={bulkDeleting || !!deletingId}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-rose-600 to-red-600 hover:brightness-110 text-white shadow-lg shadow-rose-950/40 border border-rose-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {bulkDeleting || deletingId ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menghapus...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Hapus Permanen</span>
                      </>
                    )}
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
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                        {confirmModal.type === "translate"
                          ? `Translate ${stats.count} Novel Terpilih`
                          : `Translate Sumber: ${confirmModal.sourceLabel}`}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Sistem akan menerjemahkan sinopsis & chapter yang belum diterjemahkan.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.06] space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Total Novel Target</span>
                      <span className="text-slate-200 font-semibold">{stats.count} judul</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Sinopsis Pending</span>
                      <span className={`font-semibold ${stats.pendingSynopsis > 0 ? "text-cyan-300" : "text-emerald-400"}`}>
                        {stats.pendingSynopsis > 0 ? `${stats.pendingSynopsis} sinopsis` : "Semua sudah diterjemahkan ✓"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Chapter Pending</span>
                      <span className={`font-semibold ${stats.pendingChapters > 0 ? "text-cyan-300" : "text-emerald-400"}`}>
                        {stats.pendingChapters > 0 ? `${stats.pendingChapters} chapter` : "Semua sudah diterjemahkan ✓"}
                      </span>
                    </div>
                    {stats.pendingChapters > 0 && (
                      <div className="flex justify-between text-xs border-t border-white/[0.06] pt-2 mt-1">
                        <span className="text-slate-400">Estimasi Durasi</span>
                        <span className="text-slate-200 font-mono font-semibold">
                          ~{formatDuration(Math.ceil((stats.pendingChapters + stats.pendingSynopsis) * 2.5))}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-300 leading-relaxed">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Translate berjalan mandiri di background server. Anda bebas menutup tab atau browser kapan saja.</span>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmModal(null)}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkTranslate(targetIds)}
                      disabled={stats.pendingChapters === 0 && stats.pendingSynopsis === 0}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 hover:brightness-110 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Globe className="w-4 h-4" />
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
