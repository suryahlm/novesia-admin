"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Loader2,
  BookOpen,
  Search,
  Trash2,
  CheckSquare,
  Square,
  Languages,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Users,
  Filter,
  Check,
  X,
  Layers,
} from "lucide-react";

interface TranslationRequestItem {
  id: string;
  novel_id: string;
  novel_slug: string;
  novel_title: string;
  novel_cover: string | null;
  chapter_id: string | null;
  chapter_number: number | null;
  user_id: string | null;
  user_email: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  request_count: number;
  created_at: string;
  updated_at: string;
  total_chapters: number;
  translated_chapters: number;
  has_synopsis_translated: boolean;
}

interface Counts {
  pending: number;
  in_progress: number;
  completed: number;
  rejected: number;
  total: number;
}

interface TranslateProgress {
  totalNovels: number;
  totalChapters: number;
  currentNovelTitle: string;
  currentNovelId: string;
  currentChapterNumber: number;
  currentChapterIndex: number;
  currentChapterTotal: number;
  completedChapters: number;
  failedChapters: number;
  synopsisTranslated: number;
  phase: "synopsis" | "chapter" | "idle";
}

export default function TranslationRequestsPage() {
  const [items, setItems] = useState<TranslationRequestItem[]>([]);
  const [counts, setCounts] = useState<Counts>({
    pending: 0,
    in_progress: 0,
    completed: 0,
    rejected: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Translating state
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [bulkTranslating, setBulkTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState<TranslateProgress | null>(null);

  // Notifications / Feedback
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/requests?status=${statusFilter}&search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error("Gagal mengambil data permintaan");
      const data = await res.json();
      setItems(data.items || []);
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (err: any) {
      showMsg("err", err.message || "Gagal memuat daftar permintaan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Polling background job status
  useEffect(() => {
    checkBackgroundJob();
    const interval = setInterval(() => {
      checkBackgroundJob();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const checkBackgroundJob = async () => {
    try {
      const res = await fetch("/api/translate/bulk");
      const data = await res.json();
      if (data?.job) {
        const job = data.job;
        if (job.status === "running") {
          setBulkTranslating(true);
          setTranslateProgress({
            totalNovels: job.totalNovels || 0,
            totalChapters: job.totalChapters || 0,
            currentNovelTitle: job.currentNovelTitle || "",
            currentNovelId: job.currentNovelId || "",
            currentChapterNumber: job.currentChapterNumber || 0,
            currentChapterIndex: job.currentChapterIndex || 0,
            currentChapterTotal: job.currentChapterTotal || 0,
            completedChapters: job.completedChapters || 0,
            failedChapters: job.failedChapters || 0,
            synopsisTranslated: job.synopsisTranslated || 0,
            phase: job.phase || "idle",
          });
        } else if (bulkTranslating) {
          setBulkTranslating(false);
          setTranslateProgress(null);
          fetchRequests();
        }
      }
    } catch (err) {
      // Ignore background job polling error
    }
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Execute Single Translation
  const handleTranslateSingle = async (item: TranslationRequestItem) => {
    if (bulkTranslating) {
      showMsg("err", "Penerjemahan background sedang berjalan. Harap tunggu.");
      return;
    }

    try {
      setTranslatingIds((prev) => new Set(prev).add(item.id));

      // 1. Update status to IN_PROGRESS
      await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: "IN_PROGRESS" }),
      });

      // 2. Trigger translation job via /api/translate/bulk
      const res = await fetch("/api/translate/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novelIds: [item.novel_id] }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai penerjemahan");

      showMsg("ok", `Penerjemahan untuk "${item.novel_title}" telah dimulai di background!`);
      setBulkTranslating(true);
      fetchRequests();
    } catch (err: any) {
      showMsg("err", err.message || "Gagal mengeksekusi penerjemahan");
    } finally {
      setTranslatingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Execute Bulk Translation
  const handleTranslateBulk = async () => {
    if (selectedIds.size === 0) {
      showMsg("err", "Pilih minimal 1 novel untuk diterjemahkan.");
      return;
    }

    if (bulkTranslating) {
      showMsg("err", "Penerjemahan background sedang berjalan. Harap tunggu.");
      return;
    }

    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    const novelIds = [...new Set(selectedItems.map((i) => i.novel_id))];

    try {
      setBulkTranslating(true);

      // Update selected items to IN_PROGRESS
      await Promise.all(
        selectedItems.map((item) =>
          fetch("/api/requests", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id, status: "IN_PROGRESS" }),
          })
        )
      );

      // Trigger bulk translation
      const res = await fetch("/api/translate/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novelIds }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai penerjemahan masal");

      showMsg("ok", `Penerjemahan masal untuk ${novelIds.length} novel berhasil dimulai!`);
      setSelectedIds(new Set());
      fetchRequests();
    } catch (err: any) {
      showMsg("err", err.message || "Gagal memulai penerjemahan masal");
      setBulkTranslating(false);
    }
  };

  // Update Status Manually
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Gagal mengubah status");
      showMsg("ok", `Status berhasil diubah menjadi ${newStatus}`);
      fetchRequests();
    } catch (err: any) {
      showMsg("err", err.message || "Gagal mengupdate status");
    }
  };

  // Delete Request
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus permintaan terjemahan untuk novel "${title}"?`)) return;

    try {
      const res = await fetch(`/api/requests?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus permintaan");
      showMsg("ok", "Permintaan berhasil dihapus");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchRequests();
    } catch (err: any) {
      showMsg("err", err.message || "Gagal menghapus permintaan");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {message && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-medium transition-all ${
            message.type === "ok"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-800/80"
              : "bg-rose-950/90 text-rose-200 border-rose-800/80"
          }`}
        >
          {message.type === "ok" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Languages className="w-7 h-7 text-[#B99762]" />
            Request Terjemahan Novel
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Daftar novel yang diminta oleh pembaca di aplikasi untuk diterjemahkan ke Bahasa Indonesia.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 text-sm font-medium transition-colors flex items-center gap-2"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin text-[#B99762]" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleTranslateBulk}
            disabled={selectedIds.size === 0 || bulkTranslating}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg transition-all ${
              selectedIds.size === 0 || bulkTranslating
                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700"
                : "bg-gradient-to-r from-[#B99762] to-[#8C6D3B] text-black hover:opacity-95 shadow-[#B99762]/20"
            }`}
          >
            {bulkTranslating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Terjemahkan Terpilih ({selectedIds.size})
          </button>
        </div>
      </div>

      {/* Live Background Progress Bar if translating */}
      {bulkTranslating && translateProgress && (
        <div className="p-4 rounded-xl bg-[#1a1610] border border-[#B99762]/40 shadow-xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B99762] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#B99762]"></span>
              </span>
              <span className="font-semibold text-white">
                Sedang Menerjemahkan: {translateProgress.currentNovelTitle || "Memproses..."}
              </span>
            </div>
            <span className="text-xs text-[#B99762] font-mono font-medium">
              Bab {translateProgress.currentChapterNumber || translateProgress.currentChapterIndex} / {translateProgress.currentChapterTotal || translateProgress.totalChapters}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-neutral-900 rounded-full h-2.5 overflow-hidden border border-neutral-800">
            <div
              className="bg-gradient-to-r from-[#B99762] to-[#dab376] h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${
                  translateProgress.currentChapterTotal > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (translateProgress.currentChapterIndex /
                            translateProgress.currentChapterTotal) *
                            100
                        )
                      )
                    : 15
                }%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Fase: {translateProgress.phase === "synopsis" ? "Sinopsis Novel" : "Bab Cerita"}</span>
            <span>
              Berhasil: <strong className="text-emerald-400">{translateProgress.completedChapters}</strong> | Gagal: <strong className="text-rose-400">{translateProgress.failedChapters}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-neutral-900/70 border border-neutral-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Total Permintaan</span>
            <Layers className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{counts.total}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Seluruh request terdaftar</div>
        </div>

        <div className="p-4 rounded-xl bg-[#B99762]/10 border border-[#B99762]/25">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#D4A843]">Menunggu (Pending)</span>
            <Clock className="w-4 h-4 text-[#D4A843]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#f3e7c4]">{counts.pending}</div>
          <div className="text-[11px] text-[#B99762]/70 mt-0.5">Belum dieksekusi</div>
        </div>

        <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-400">Sedang Diproses</span>
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-200">{counts.in_progress}</div>
          <div className="text-[11px] text-blue-400/60 mt-0.5">Dalam antrean AI</div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">Selesai (Completed)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-200">{counts.completed}</div>
          <div className="text-[11px] text-emerald-400/60 mt-0.5">Sudah diterjemahkan</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900/90 border border-neutral-800 rounded-xl overflow-x-auto">
          {[
            { id: "ALL", label: `Semua (${counts.total})` },
            { id: "PENDING", label: `Menunggu (${counts.pending})` },
            { id: "IN_PROGRESS", label: `Diproses (${counts.in_progress})` },
            { id: "COMPLETED", label: `Selesai (${counts.completed})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? "bg-[#B99762] text-black font-semibold shadow"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul atau slug novel..."
            className="w-full pl-9 pr-3 py-2 bg-neutral-900/90 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#B99762] transition-colors"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-900/80 border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-400">
              <tr>
                <th className="p-4 w-10">
                  <button
                    onClick={handleSelectAll}
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    {selectedIds.size > 0 && selectedIds.size === items.length ? (
                      <CheckSquare className="w-4 h-4 text-[#B99762]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-3">Novel</th>
                <th className="py-4 px-3">Konteks Request</th>
                <th className="py-4 px-3">Progress Terjemahan</th>
                <th className="py-4 px-3 text-center">Permintaan</th>
                <th className="py-4 px-3">Status</th>
                <th className="py-4 px-4 text-right">Aksi Eksekusi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-neutral-500">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#B99762] mb-2" />
                    Memuat daftar request...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-neutral-500">
                    <BookOpen className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                    Tidak ada permintaan terjemahan yang cocok.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isTranslating = translatingIds.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-neutral-800/40 transition-colors ${
                        isSelected ? "bg-[#B99762]/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4">
                        <button
                          onClick={() => toggleSelect(item.id)}
                          className="text-neutral-400 hover:text-white transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#B99762]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Novel Title & Cover */}
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-3">
                          {item.novel_cover ? (
                            <img
                              src={item.novel_cover}
                              alt={item.novel_title}
                              className="w-10 h-14 object-cover rounded-md bg-neutral-800 border border-neutral-700/60 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-neutral-800 rounded-md flex items-center justify-center text-neutral-600 shrink-0 border border-neutral-700/60">
                              <BookOpen className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0 max-w-[280px]">
                            <a
                              href={`https://novesia.cc/novel/${item.novel_slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-white hover:text-[#B99762] transition-colors line-clamp-1 flex items-center gap-1.5"
                            >
                              {item.novel_title}
                              <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                            </a>
                            <p className="text-xs text-neutral-500 font-mono line-clamp-1 mt-0.5">
                              {item.novel_slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Request Context (Chapter / Whole Novel) */}
                      <td className="py-4 px-3">
                        <div className="text-xs">
                          {item.chapter_number !== null ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                              Bab #{item.chapter_number}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-800/80 text-neutral-400">
                              Seluruh Novel
                            </span>
                          )}
                          {item.user_email && (
                            <div className="text-[11px] text-neutral-500 mt-1 truncate max-w-[150px]">
                              oleh {item.user_email}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Translation Progress */}
                      <td className="py-4 px-3">
                        <div className="space-y-1 max-w-[160px]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-400 font-mono">
                              {item.translated_chapters} / {item.total_chapters} Bab
                            </span>
                            <span className="text-[11px] text-neutral-500">
                              {item.total_chapters > 0
                                ? `${Math.round(
                                    (item.translated_chapters / item.total_chapters) * 100
                                  )}%`
                                : "0%"}
                            </span>
                          </div>
                          <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[#B99762] h-1.5 rounded-full"
                              style={{
                                width: `${
                                  item.total_chapters > 0
                                    ? Math.min(
                                        100,
                                        (item.translated_chapters / item.total_chapters) * 100
                                      )
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            Sinopsis:{" "}
                            {item.has_synopsis_translated ? (
                              <span className="text-emerald-400">Sudah ID</span>
                            ) : (
                              <span className="text-neutral-500">Belum ID</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Request Count */}
                      <td className="py-4 px-3 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#B99762]/15 text-[#e6ca91] border border-[#B99762]/30">
                          <Users className="w-3 h-3" />
                          {item.request_count}x
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3">
                        <select
                          value={item.status}
                          onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none transition-colors cursor-pointer ${
                            item.status === "PENDING"
                              ? "bg-[#B99762]/15 text-[#e6ca91] border-[#B99762]/40"
                              : item.status === "IN_PROGRESS"
                              ? "bg-blue-950/40 text-blue-300 border-blue-800/60"
                              : item.status === "COMPLETED"
                              ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
                              : "bg-rose-950/40 text-rose-300 border-rose-800/60"
                          }`}
                        >
                          <option value="PENDING" className="bg-neutral-900 text-[#e6ca91]">
                            PENDING
                          </option>
                          <option value="IN_PROGRESS" className="bg-neutral-900 text-blue-300">
                            IN_PROGRESS
                          </option>
                          <option value="COMPLETED" className="bg-neutral-900 text-emerald-300">
                            COMPLETED
                          </option>
                          <option value="REJECTED" className="bg-neutral-900 text-rose-300">
                            REJECTED
                          </option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleTranslateSingle(item)}
                            disabled={isTranslating || bulkTranslating}
                            title="Terjemahkan Novel Ini"
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-all ${
                              isTranslating || bulkTranslating
                                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                : "bg-[#B99762] text-black hover:bg-[#a38350]"
                            }`}
                          >
                            {isTranslating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            )}
                            Terjemahkan
                          </button>

                          <button
                            onClick={() => handleDelete(item.id, item.novel_title)}
                            title="Hapus Permintaan"
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
