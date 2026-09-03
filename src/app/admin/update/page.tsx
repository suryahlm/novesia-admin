"use client";

import { useState, useEffect, useMemo } from "react";
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
}

const SOURCE_TABS = [
  { id: "all", label: "Semua", icon: "📋", color: "from-violet-600 to-indigo-600", shadow: "shadow-violet-500/20" },
  { id: "novelworld", label: "NovelWorld", icon: "📚", color: "from-emerald-600 to-teal-600", shadow: "shadow-emerald-500/20" },
  { id: "talesinthevalley", label: "TalesInTheValley", icon: "⚔️", color: "from-blue-600 to-cyan-600", shadow: "shadow-blue-500/20" },
  { id: "98novels", label: "98Novels", icon: "💎", color: "from-rose-500 to-pink-600", shadow: "shadow-rose-500/20" },
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
    type: "single" | "bulk";
    novelId?: string;
    novelTitle?: string;
  } | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    fetchNovels();
  }, []);

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
      await fetchNovels(); // Refresh data
      setSelectedIds(new Set()); // Clear selection
    } catch (err: any) {
      showMsg("err", err.message);
    } finally {
      setBulkGenerating(false);
    }
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

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
          <h1
            className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-violet-300 bg-clip-text text-transparent"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Pusat Pengelolaan & Bulk Novel
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">
            Kelola metadata, chapter, dan jalankan aksi massal untuk {novels.length} novel terdaftar
          </p>
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={handleBulkGenerate}
              disabled={bulkGenerating || bulkDeleting}
              className="px-4 py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-violet-500/25 transition-all flex items-center gap-2 hover:scale-[1.02] cursor-pointer"
            >
              {bulkGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              )}
              <span>Auto Generate Genre ({selectedIds.size})</span>
            </button>

            <button
              onClick={() => setConfirmModal({ type: "bulk" })}
              disabled={bulkDeleting || bulkGenerating}
              className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-rose-500/25 transition-all flex items-center gap-2 hover:scale-[1.02] cursor-pointer"
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

      {/* Source Luxury Tabs */}
      <div className="flex gap-3 flex-wrap">
        {SOURCE_TABS.map((src) => {
          const count = sourceCounts[src.id] || 0;
          if (src.id !== "all" && count === 0) return null;
          const isActive = activeSource === src.id;

          return (
            <button
              key={src.id}
              onClick={() => setActiveSource(src.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                isActive
                  ? `bg-gradient-to-r ${src.color} shadow-xl ${src.shadow} scale-[1.02] border border-white/20 text-white`
                  : "bg-[#0c101c]/70 border border-white/[0.06] hover:border-white/[0.15] text-slate-300 hover:bg-white/[0.03]"
              }`}
            >
              <span className="text-xl">{src.icon}</span>
              <div className="text-left">
                <p className={`text-xs font-bold ${isActive ? "text-white" : "text-slate-200"}`}>
                  {src.label}
                </p>
                <p
                  className={`text-[10px] font-mono mt-0.5 ${
                    isActive ? "text-white/80" : "text-slate-400"
                  }`}
                >
                  {count} novel
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & Selection Bar */}
      <div className="bg-[#0c101c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-4 shadow-xl flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari novel berdasarkan judul, slug, atau author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-all shadow-inner"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={selectAll}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            allSelected
              ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30 border border-violet-400/40"
              : "bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08]"
          }`}
        >
          {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          <span>{allSelected ? "Batal Pilih" : "Pilih Semua"}</span>
        </button>
      </div>

      {/* Novel List Container */}
      <div className="bg-[#0c101c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl shadow-black/70 w-full min-w-0">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
            <span className="text-xs font-bold">Memuat koleksi novel...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <BookOpen className="w-12 h-12 text-slate-700 mx-auto" />
            <p className="mt-4 text-xs font-medium">
              {search ? "Tidak ada novel yang cocok dengan pencarian." : "Belum ada novel di kategori ini."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((novel) => {
              const isSelected = selectedIds.has(novel.id);
              const isDeleting = deletingId === novel.id;

              return (
                <div
                  key={novel.id}
                  className={`flex items-center justify-between gap-3 sm:gap-4 px-3 sm:px-5 py-3.5 transition-all duration-200 min-w-0 ${
                    isSelected
                      ? "bg-violet-600/15 border-l-4 border-l-violet-400"
                      : "hover:bg-white/[0.02] border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(novel.id)}
                      className={`shrink-0 transition-colors cursor-pointer p-1 ${
                        isSelected ? "text-violet-400" : "text-slate-600 hover:text-slate-400"
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    {/* Cover */}
                    <div className="w-10 h-14 sm:w-12 sm:h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-white/[0.08] relative shadow-md">
                      {novel.cover_url ? (
                        <img
                          src={novel.cover_url}
                          alt={novel.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                        {novel.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                        <span className="text-[11px] sm:text-xs text-slate-400 font-mono">
                          {novel.total_chapters || 0} ch
                        </span>
                        <span className="text-slate-600 text-[10px]">•</span>
                        <span className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[110px] sm:max-w-[160px]">
                          {novel.author || "—"}
                        </span>
                        <span className="text-slate-600 text-[10px]">•</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ${
                            novel.status === "active"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : novel.status === "draft"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-slate-500/15 text-slate-400 border border-slate-500/30"
                          }`}
                        >
                          {novel.status === "active"
                            ? "Published"
                            : novel.status === "draft"
                            ? "Draft"
                            : novel.status}
                        </span>
                        {(novel.genres || []).slice(0, 2).map((g) => (
                          <span
                            key={g}
                            className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 bg-white/[0.04] text-slate-400 border border-white/[0.06] rounded-md font-semibold"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Source Badge & Action Buttons */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Source Badge */}
                    <span className="text-[9px] px-2 py-1 bg-white/[0.03] border border-white/[0.06] text-emerald-400 rounded-lg font-bold uppercase hidden md:inline-block">
                      {novel.source || "general"}
                    </span>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Link
                        href={`/admin/novels/${novel.nu_slug}`}
                        className="p-2 sm:p-2.5 rounded-xl bg-violet-600/15 text-violet-300 hover:bg-violet-600 hover:text-white border border-violet-500/30 transition-all cursor-pointer shadow-sm"
                        title="Edit Studio Novel"
                      >
                        <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                        className="p-2 sm:p-2.5 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all cursor-pointer shadow-sm disabled:opacity-40"
                        title="Hapus Novel"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c101c] border border-white/[0.12] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {confirmModal.type === "bulk"
                    ? `Hapus ${selectedIds.size} Novel?`
                    : "Hapus Novel Ini?"}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Tindakan ini tidak dapat dibatalkan
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-white/[0.02] border border-white/[0.05] p-3.5 rounded-2xl font-medium">
              {confirmModal.type === "bulk"
                ? `${selectedIds.size} novel yang dipilih akan dihapus secara permanen beserta semua chapter dan aset di Cloudflare R2.`
                : `Novel "${confirmModal.novelTitle}" akan dihapus permanen beserta seluruh chapter dan aset terkait.`}
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
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
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-rose-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {bulkDeleting || deletingId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
