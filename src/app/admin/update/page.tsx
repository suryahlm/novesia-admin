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
  { id: "skynovelvault", label: "SkyNovelVault", icon: "⚔️", color: "from-blue-600 to-cyan-600", shadow: "shadow-blue-500/20" },
  { id: "transcendentaltls", label: "TranscendentalTLS", icon: "📖", color: "from-orange-600 to-amber-600", shadow: "shadow-orange-500/20" },
  { id: "general", label: "General", icon: "🌐", color: "from-pink-600 to-rose-600", shadow: "shadow-pink-500/20" },
];

export default function EditNovelPage() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeSource, setActiveSource] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    type: "single" | "bulk";
    novelId?: string;
    novelTitle?: string;
  } | null>(null);

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
      alert(err.message);
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
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBulkDeleting(false);
      setConfirmModal(null);
    }
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Edit Novel
          </h1>
          <p className="text-gray-500 mt-1">
            Kelola metadata, chapter, dan terjemahan untuk {novels.length} novel
          </p>
        </div>

        {/* Bulk Delete Button */}
        {selectedIds.size > 0 && (
          <button
            onClick={() => setConfirmModal({ type: "bulk" })}
            disabled={bulkDeleting}
            className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-gray-700 disabled:to-gray-700 rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all flex items-center gap-2"
          >
            {bulkDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Hapus Terpilih ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Source Tabs */}
      <div className="flex gap-3 flex-wrap">
        {SOURCE_TABS.map((src) => {
          const count = sourceCounts[src.id] || 0;
          if (src.id !== "all" && count === 0) return null;
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

      {/* Search + Select All */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Cari novel berdasarkan judul, slug, atau author..."
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

        <button
          onClick={selectAll}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            allSelected
              ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
              : "bg-gray-800/80 text-gray-400 border border-gray-700/50 hover:text-white hover:border-gray-600"
          }`}
        >
          {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          {allSelected ? "Batal Pilih" : "Pilih Semua"}
        </button>
      </div>

      {/* Novel List */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-3 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Memuat novel...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-700 mx-auto" />
            <p className="text-gray-500 mt-4">
              {search ? "Tidak ada novel yang cocok." : "Belum ada novel."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {filtered.map((novel) => {
              const isSelected = selectedIds.has(novel.id);
              const isDeleting = deletingId === novel.id;
              return (
                <div
                  key={novel.id}
                  className={`flex items-center gap-4 px-5 py-3.5 transition-all duration-200 ${
                    isSelected
                      ? "bg-violet-500/5 border-l-2 border-l-violet-500"
                      : "hover:bg-gray-800/30 border-l-2 border-l-transparent"
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(novel.id)}
                    className={`shrink-0 transition-colors ${
                      isSelected ? "text-violet-400" : "text-gray-600 hover:text-gray-400"
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  {/* Cover */}
                  {novel.cover_url ? (
                    <img
                      src={novel.cover_url}
                      alt={novel.title}
                      className="w-10 h-14 object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-gray-600" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-200 truncate">{novel.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{novel.total_chapters || 0} ch</span>
                      <span className="text-[10px] text-gray-600">•</span>
                      <span className="text-xs text-gray-500">{novel.author || "—"}</span>
                      <span className="text-[10px] text-gray-600">•</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        novel.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : novel.status === "draft"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-gray-500/10 text-gray-400"
                      }`}>
                        {novel.status === "active" ? "Published" : novel.status === "draft" ? "Draft" : novel.status}
                      </span>
                      {(novel.genres || []).slice(0, 2).map((g) => (
                        <span key={g} className="text-[10px] px-1.5 py-0.5 bg-gray-800/80 text-gray-500 rounded">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Source Badge */}
                  <span className="text-[10px] px-2 py-1 bg-gray-800/80 text-gray-500 rounded-md font-medium uppercase shrink-0">
                    {novel.source || "general"}
                  </span>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Edit Button */}
                    <Link
                      href={`/admin/novels/${novel.nu_slug}`}
                      className="p-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 hover:text-violet-300 border border-violet-500/20 transition-all"
                      title="Edit Novel"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>

                    {/* Select Button */}
                    <button
                      onClick={() => toggleSelect(novel.id)}
                      className={`p-2 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : "bg-blue-500/10 text-blue-400/60 hover:bg-blue-500/20 hover:text-blue-400 border-blue-500/20"
                      }`}
                      title="Pilih"
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() =>
                        setConfirmModal({
                          type: "single",
                          novelId: novel.id,
                          novelTitle: novel.title,
                        })
                      }
                      disabled={isDeleting}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20 transition-all disabled:opacity-50"
                      title="Hapus"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold">
                {confirmModal.type === "bulk"
                  ? `Hapus ${selectedIds.size} Novel?`
                  : "Hapus Novel?"}
              </h3>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              {confirmModal.type === "bulk"
                ? `${selectedIds.size} novel yang dipilih akan dihapus secara permanen beserta semua chapter dan cover di R2.`
                : `Novel "${confirmModal.novelTitle}" akan dihapus secara permanen beserta semua chapter dan cover di R2.`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
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
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {(bulkDeleting || deletingId) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
