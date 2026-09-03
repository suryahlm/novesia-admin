"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Ban,
  Search,
  Plus,
  Trash2,
  RotateCcw,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BookOpen,
  Filter,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Layers,
} from "lucide-react";

interface BlacklistItem {
  id: string;
  novel_id?: string;
  nu_slug: string;
  title: string;
  source?: string;
  reason?: string;
  type: "novel" | "chapter";
  chapter_number?: number;
  blacklisted_at: string;
  created_at: string;
  novel?: {
    cover_url?: string;
    total_chapters?: number;
    status?: string;
    original_status?: string;
  };
}

interface NovelSearchResult {
  id: string;
  title: string;
  nu_slug: string;
  source: string;
  cover_url?: string;
  total_chapters: number;
  status: string;
  is_blacklisted?: boolean;
  created_at: string;
}

const SOURCE_COLORS: Record<string, { label: string; color: string; border: string }> = {
  novelworld: { label: "NovelWorld", color: "bg-emerald-500/10 text-emerald-400", border: "border-emerald-500/20" },
  talesinthevalley: { label: "TalesInTheValley", color: "bg-blue-500/10 text-blue-400", border: "border-blue-500/20" },
  tinytranslation: { label: "TinyTranslation", color: "bg-amber-500/10 text-amber-400", border: "border-amber-500/20" },
  cuttlefishreads: { label: "CuttleFishReads", color: "bg-purple-500/10 text-purple-400", border: "border-purple-500/20" },
  "98novels": { label: "98Novels", color: "bg-pink-500/10 text-pink-400", border: "border-pink-500/20" },
};

export default function BlacklistPage() {
  const [activeTab, setActiveTab] = useState<"judul" | "chapter" | "rekomendasi">("judul");

  // State Blacklist Items
  const [novelItems, setNovelItems] = useState<BlacklistItem[]>([]);
  const [chapterItems, setChapterItems] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");

  // Modal State
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NovelSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedNovel, setSelectedNovel] = useState<NovelSearchResult | null>(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Rekomendasi Novel Mati State
  const [dormantNovels, setDormantNovels] = useState<NovelSearchResult[]>([]);
  const [loadingDormant, setLoadingDormant] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch Blacklist
  const fetchBlacklist = async () => {
    setLoading(true);
    try {
      const [resNovels, resChapters] = await Promise.all([
        fetch("/api/blacklist?type=novel"),
        fetch("/api/blacklist?type=chapter"),
      ]);

      const dataN = await resNovels.json();
      const dataC = await resChapters.json();

      if (dataN.items) setNovelItems(dataN.items);
      if (dataC.items) setChapterItems(dataC.items);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Gagal memuat data blacklist";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Rekomendasi Novel Mati (Stagnan > 90 hari & <= 15 chapters)
  const fetchDormantNovels = async () => {
    setLoadingDormant(true);
    try {
      const res = await fetch("/api/blacklist/search?q=a&limit=100");
      const data = await res.json();
      if (data.novels) {
        const now = new Date();
        const dormant = data.novels.filter((n: NovelSearchResult) => {
          if (n.is_blacklisted) return false;
          const created = new Date(n.created_at);
          const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return days >= 60 && n.total_chapters <= 15;
        });
        setDormantNovels(dormant);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDormant(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  useEffect(() => {
    if (activeTab === "rekomendasi") {
      fetchDormantNovels();
    }
  }, [activeTab]);

  // 3. Cari Novel untuk Ditambahkan
  const handleSearchNovels = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/blacklist/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data.novels) {
        // Filter yang sudah di-blacklist
        const blacklistedSlugs = new Set(novelItems.map((i) => i.nu_slug));
        setSearchResults(data.novels.filter((n: NovelSearchResult) => !blacklistedSlugs.has(n.nu_slug)));
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Gagal mencari novel";
      showToast(message, "error");
    } finally {
      setSearching(false);
    }
  };

  // 4. Tambah ke Blacklist
  const handleConfirmBlacklist = async () => {
    if (!selectedNovel) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novel_id: selectedNovel.id,
          nu_slug: selectedNovel.nu_slug,
          title: selectedNovel.title,
          source: selectedNovel.source,
          reason: blacklistReason.trim() || "Novel mati / di-blacklist oleh Admin",
          type: "novel",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memasukkan ke blacklist");

      showToast(`"${selectedNovel.title}" berhasil dimasukkan ke blacklist!`);
      setSelectedNovel(null);
      setBlacklistReason("");
      setSearchModalOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      fetchBlacklist();
      if (activeTab === "rekomendasi") fetchDormantNovels();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Terjadi kesalahan";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Hapus dari Blacklist (Un-blacklist)
  const handleRemoveFromBlacklist = async (item: BlacklistItem) => {
    if (!confirm(`Keluarkan "${item.title}" dari blacklist? Scraper & translator akan dapat memproses novel ini kembali.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/blacklist?id=${item.id}&novel_id=${item.novel_id || ""}&nu_slug=${item.nu_slug}&type=${item.type}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengeluarkan dari blacklist");

      showToast(`"${item.title}" berhasil dikeluarkan dari blacklist.`);
      fetchBlacklist();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Gagal mengeluarkan dari blacklist";
      showToast(message, "error");
    }
  };

  // 6. Blacklist Massal Rekomendasi Novel Mati
  const handleBulkBlacklistDormant = async () => {
    if (dormantNovels.length === 0) return;
    if (!confirm(`Yakin ingin memasukkan ${dormantNovels.length} novel mati ini sekaligus ke dalam Blacklist?`)) {
      return;
    }

    setBulkProcessing(true);
    try {
      const res = await fetch("/api/blacklist/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novels: dormantNovels,
          reason: "Novel mati / stagnan > 60-150 hari (ditinggalkan sumber asli)",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal blacklist massal");

      showToast(`Sukses! ${dormantNovels.length} novel mati berhasil dimasukkan ke blacklist.`);
      fetchBlacklist();
      fetchDormantNovels();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Gagal blacklist massal";
      showToast(message, "error");
    } finally {
      setBulkProcessing(false);
    }
  };

  // Filter List
  const filteredNovelItems = useMemo(() => {
    if (!filterQuery.trim()) return novelItems;
    const q = filterQuery.toLowerCase();
    return novelItems.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.nu_slug.toLowerCase().includes(q) ||
        (i.source && i.source.toLowerCase().includes(q)) ||
        (i.reason && i.reason.toLowerCase().includes(q))
    );
  }, [novelItems, filterQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ═══ Header Section ═══ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-[#12151b] via-[#161a22] to-[#12151b] p-5 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 shadow-lg shadow-red-500/10">
              <Ban size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Daftar Blacklist Novel
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 font-normal">
                  {novelItems.length} Judul Diblokir
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Novel di daftar ini di-skip permanen oleh Scraper & Auto-Translator agar tidak mengotori aplikasi.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setSearchModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-sm shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus size={16} className="stroke-[2.5]" />
          Tambah ke Blacklist
        </button>
      </div>

      {/* ═══ Tabs Navigation ═══ */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab("judul")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "judul"
              ? "bg-amber-400/15 text-amber-300 border border-amber-400/30 shadow-md shadow-amber-400/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
          }`}
        >
          <BookOpen size={16} />
          <span>Blacklist Judul</span>
          <span className="text-xs px-2 py-0.2 rounded-full bg-black/40 border border-white/10 text-slate-300">
            {novelItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("chapter")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "chapter"
              ? "bg-amber-400/15 text-amber-300 border border-amber-400/30 shadow-md shadow-amber-400/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
          }`}
        >
          <Layers size={16} />
          <span>Blacklist Chapter</span>
          <span className="text-xs px-2 py-0.2 rounded-full bg-black/40 border border-white/10 text-slate-300">
            {chapterItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("rekomendasi")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "rekomendasi"
              ? "bg-red-400/15 text-red-300 border border-red-400/30 shadow-md shadow-red-400/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
          }`}
        >
          <Sparkles size={16} className="text-amber-400" />
          <span>Rekomendasi Novel Mati</span>
          {dormantNovels.length > 0 && (
            <span className="text-xs px-2 py-0.2 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
              {dormantNovels.length}
            </span>
          )}
        </button>
      </div>

      {/* ═══ TAB 1: Blacklist Judul Novel ═══ */}
      {activeTab === "judul" && (
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="flex items-center gap-3 bg-[#12151b] p-3 rounded-xl border border-white/5">
            <Search size={16} className="text-slate-400 ml-1" />
            <input
              type="text"
              placeholder="Filter judul, slug, sumber, atau alasan blacklist..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none flex-1"
            />
            {filterQuery && (
              <button onClick={() => setFilterQuery("")} className="text-slate-400 hover:text-slate-200 text-xs">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Table of Blacklisted Novels */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[#12151b] rounded-2xl border border-white/5">
              <div className="w-8 h-8 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mb-3" />
              <p className="text-sm text-slate-400">Memuat daftar blacklist...</p>
            </div>
          ) : filteredNovelItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[#12151b] rounded-2xl border border-white/5 text-center">
              <div className="p-3 rounded-full bg-slate-800/60 text-slate-400 mb-3">
                <Ban size={24} />
              </div>
              <p className="text-base font-semibold text-slate-200">
                {filterQuery ? "Tidak ada hasil yang cocok" : "Belum Ada Novel yang Di-Blacklist"}
              </p>
              <p className="text-xs text-slate-400 max-w-md mt-1">
                {filterQuery
                  ? "Coba gunakan kata kunci pencarian yang lain."
                  : "Semua novel saat ini aktif. Gunakan tombol 'Tambah ke Blacklist' atau tab 'Rekomendasi Novel Mati' untuk menyaring novel yang tidak diinginkan."}
              </p>
            </div>
          ) : (
            <div className="bg-[#12151b] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0e1117] text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Novel</th>
                      <th className="py-3.5 px-4 font-semibold">Sumber</th>
                      <th className="py-3.5 px-4 font-semibold">Chapter</th>
                      <th className="py-3.5 px-4 font-semibold">Alasan Blacklist</th>
                      <th className="py-3.5 px-4 font-semibold">Ditandai</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredNovelItems.map((item) => {
                      const srcConfig = SOURCE_COLORS[item.source || ""] || {
                        label: item.source || "General",
                        color: "bg-slate-500/10 text-slate-300",
                        border: "border-slate-500/20",
                      };

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-white/[0.02] transition-colors group"
                        >
                          {/* Title & Cover */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {item.novel?.cover_url ? (
                                <img
                                  src={item.novel.cover_url}
                                  alt={item.title}
                                  className="w-10 h-14 object-cover rounded-md border border-white/10 shrink-0 bg-slate-800"
                                />
                              ) : (
                                <div className="w-10 h-14 rounded-md border border-white/10 bg-slate-800/80 flex items-center justify-center text-slate-500 shrink-0">
                                  <BookOpen size={16} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <Link
                                  href={`/admin/novels/${item.nu_slug}`}
                                  className="font-medium text-slate-100 hover:text-amber-300 transition-colors line-clamp-1 group-hover:underline flex items-center gap-1.5"
                                >
                                  <span>{item.title}</span>
                                  <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />
                                </Link>
                                <span className="text-xs font-mono text-slate-500 block truncate">
                                  {item.nu_slug}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Source */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-md border font-medium ${srcConfig.color} ${srcConfig.border}`}
                            >
                              {srcConfig.label}
                            </span>
                          </td>

                          {/* Total Chapters */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="text-xs font-mono text-slate-300">
                              {item.novel?.total_chapters !== undefined
                                ? `${item.novel.total_chapters} ch`
                                : "-"}
                            </span>
                          </td>

                          {/* Reason */}
                          <td className="py-3 px-4 max-w-xs">
                            <div className="text-xs text-slate-300 line-clamp-2 bg-[#0d0f14] px-2.5 py-1.5 rounded-lg border border-white/5">
                              {item.reason || "Di-blacklist oleh Admin"}
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-400">
                            {item.blacklisted_at
                              ? new Date(item.blacklisted_at).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleRemoveFromBlacklist(item)}
                              title="Keluarkan dari Blacklist (Un-blacklist)"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition-colors cursor-pointer"
                            >
                              <RotateCcw size={13} />
                              <span>Batal Blacklist</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 2: Blacklist Chapter ═══ */}
      {activeTab === "chapter" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#12151b] border border-white/5 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed">
              Blacklist Chapter digunakan khusus untuk novel yang masih berjalan (Ongoing), namun memiliki satu atau
              beberapa chapter lama tertentu yang rusak permanen di sumbernya. Scraper akan melewati chapter yang ada
              di daftar ini tanpa memblokir seluruh novel.
            </p>
          </div>

          {chapterItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[#12151b] rounded-2xl border border-white/5 text-center">
              <Layers size={24} className="text-slate-500 mb-2" />
              <p className="text-base font-semibold text-slate-200">Belum Ada Chapter yang Di-Blacklist</p>
              <p className="text-xs text-slate-400 mt-1">
                Semua chapter dari novel aktif berjalan normal.
              </p>
            </div>
          ) : (
            <div className="bg-[#12151b] rounded-2xl border border-white/5 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0e1117] text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Novel</th>
                    <th className="py-3 px-4 font-semibold">Chapter</th>
                    <th className="py-3 px-4 font-semibold">Alasan</th>
                    <th className="py-3 px-4 font-semibold">Ditandai</th>
                    <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {chapterItems.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-medium text-slate-100">{c.title}</td>
                      <td className="py-3 px-4 font-mono text-amber-300">Ch. {c.chapter_number}</td>
                      <td className="py-3 px-4 text-xs text-slate-300">{c.reason || "-"}</td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {new Date(c.blacklisted_at).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRemoveFromBlacklist(c)}
                          className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 3: Rekomendasi Novel Mati ═══ */}
      {activeTab === "rekomendasi" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-red-950/30 via-[#161a22] to-[#12151b] p-4 rounded-2xl border border-red-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100">
                  Deteksi Otomatis Novel Mati ({dormantNovels.length} Novel Terdeteksi)
                </h2>
                <p className="text-xs text-slate-400">
                  Novel-novel ini terdaftar &gt; 60–150 hari lalu tetapi chapternya tetap sedikit (≤ 15 ch) dan ditinggalkan translator aslinya.
                </p>
              </div>
            </div>

            {dormantNovels.length > 0 && (
              <button
                onClick={handleBulkBlacklistDormant}
                disabled={bulkProcessing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Ban size={14} />
                {bulkProcessing ? "Memproses..." : `Blacklist Semua (${dormantNovels.length} Novel)`}
              </button>
            )}
          </div>

          {loadingDormant ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[#12151b] rounded-2xl border border-white/5">
              <div className="w-8 h-8 border-2 border-red-400/20 border-t-red-400 rounded-full animate-spin mb-3" />
              <p className="text-sm text-slate-400">Menganalisis novel-novel yang stagnan...</p>
            </div>
          ) : dormantNovels.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[#12151b] rounded-2xl border border-white/5 text-center">
              <CheckCircle2 size={28} className="text-emerald-400 mb-2" />
              <p className="text-base font-semibold text-slate-200">Database Bersih!</p>
              <p className="text-xs text-slate-400 mt-1">
                Tidak ada novel stagnan/mati yang belum di-blacklist.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dormantNovels.map((n) => {
                const srcConfig = SOURCE_COLORS[n.source || ""] || {
                  label: n.source || "General",
                  color: "bg-slate-500/10 text-slate-300",
                  border: "border-slate-500/20",
                };

                return (
                  <div
                    key={n.id}
                    className="p-3.5 rounded-xl bg-[#12151b] border border-white/5 hover:border-red-500/30 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex gap-3">
                      {n.cover_url ? (
                        <img
                          src={n.cover_url}
                          alt={n.title}
                          className="w-12 h-16 object-cover rounded-lg border border-white/10 shrink-0 bg-slate-800"
                        />
                      ) : (
                        <div className="w-12 h-16 rounded-lg border border-white/10 bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                          <BookOpen size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-100 line-clamp-1 group-hover:text-amber-300">
                          {n.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${srcConfig.color} ${srcConfig.border}`}>
                            {srcConfig.label}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {n.total_chapters} Chapter
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-1">
                          Masuk sejak {new Date(n.created_at).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedNovel(n);
                        setBlacklistReason("Novel mati di sumber (stagnan > 60-150 hari)");
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Ban size={13} />
                      Blacklist Judul Ini
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ MODAL 1: Search Novel to Blacklist ═══ */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12151b] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0e1117]">
              <div className="flex items-center gap-2">
                <Ban size={18} className="text-red-400" />
                <h3 className="font-bold text-slate-100 text-base">Tambah Novel ke Blacklist</h3>
              </div>
              <button
                onClick={() => setSearchModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-[#0a0c10] rounded-xl border border-white/10 flex-1">
                  <Search size={16} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ketik judul novel atau slug..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchNovels()}
                    className="bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none flex-1"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleSearchNovels}
                  disabled={searching}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {searching ? "Mencari..." : "Cari"}
                </button>
              </div>

              {/* Search Results */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {searching ? (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    <div className="w-6 h-6 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mx-auto mb-2" />
                    Mencari novel di database...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((novel) => {
                    const srcConfig = SOURCE_COLORS[novel.source || ""] || {
                      label: novel.source || "General",
                      color: "bg-slate-500/10 text-slate-300",
                      border: "border-slate-500/20",
                    };

                    return (
                      <div
                        key={novel.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#0a0c10] border border-white/5 hover:border-amber-400/30 transition-all gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {novel.cover_url ? (
                            <img
                              src={novel.cover_url}
                              alt={novel.title}
                              className="w-9 h-12 object-cover rounded border border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-12 rounded border border-white/10 bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                              <BookOpen size={14} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-slate-100 truncate">{novel.title}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${srcConfig.color} ${srcConfig.border}`}>
                                {srcConfig.label}
                              </span>
                              <span className="text-xs font-mono text-slate-400">{novel.total_chapters} ch</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedNovel(novel)}
                          className="px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white font-medium text-xs shadow-md shadow-red-600/20 transition-all cursor-pointer shrink-0"
                        >
                          Pilih
                        </button>
                      </div>
                    );
                  })
                ) : searchQuery ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Tidak ditemukan novel dengan kata kunci tersebut.
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Ketik kata kunci judul novel di atas lalu tekan enter.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL 2: Konfirmasi Alasan Blacklist ═══ */}
      {selectedNovel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12151b] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-white/5 bg-[#0e1117] flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-base">Konfirmasi Blacklist Novel</h3>
              <button
                onClick={() => setSelectedNovel(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5">
                <AlertTriangle size={18} className="shrink-0 text-red-400 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Novel: {selectedNovel.title}</span>
                  Novel ini akan di-skip permanen oleh Scraper dan Auto-Translator di VPS.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Alasan Blacklist (Opsional):
                </label>
                <textarea
                  placeholder="Contoh: Novel mati di sumber asli, halaman 404, translator drop, atau novel rusak..."
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                  autoFocus
                />
              </div>

              {/* Quick Reason Templates */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1.5">Pilihan Cepat Alasan:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Novel mati di sumber asli (stagnan lama)",
                    "Halaman 404 / Dihapus oleh sumber",
                    "Ditinggalkan oleh translator asli (Dropped)",
                    "Konten chapter rusak / berantakan",
                    "Novel testing / sampah",
                  ].map((temp) => (
                    <button
                      key={temp}
                      type="button"
                      onClick={() => setBlacklistReason(temp)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-[#0e1117] hover:bg-white/5 border border-white/10 text-slate-300 transition-colors"
                    >
                      {temp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedNovel(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBlacklist}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Ban size={15} />
                  {submitting ? "Memproses..." : "Blacklist Sekarang"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Toast Notification ═══ */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-2.5 text-sm animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200"
              : "bg-red-950/90 border-red-500/30 text-red-200"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
