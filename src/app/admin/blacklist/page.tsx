"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Ban,
  Search,
  Plus,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Layers,
  Sparkles,
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

export default function BlacklistPage() {
  const [activeTab, setActiveTab] = useState<"judul" | "chapter" | "rekomendasi">("judul");

  // State Blacklist Items
  const [novelItems, setNovelItems] = useState<BlacklistItem[]>([]);
  const [chapterItems, setChapterItems] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");

  // Modal State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NovelSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [reasonFor, setReasonFor] = useState<NovelSearchResult | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Hapus Raw R2 Modal State (Komiku Style)
  const [deletingRaw, setDeletingRaw] = useState<BlacklistItem | null>(null);
  const [deletingRawBusy, setDeletingRawBusy] = useState(false);

  // Rekomendasi Novel Mati State
  const [dormantNovels, setDormantNovels] = useState<NovelSearchResult[]>([]);
  const [loadingDormant, setLoadingDormant] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
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

  // 2. Fetch Rekomendasi Novel Mati
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

  // 3. Cari Novel
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/blacklist/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data.novels) {
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

  // 4. Konfirmasi Blacklist
  const confirmAdd = async () => {
    if (!reasonFor) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novel_id: reasonFor.id,
          nu_slug: reasonFor.nu_slug,
          title: reasonFor.title,
          source: reasonFor.source,
          reason: reason.trim() || null,
          type: "novel",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memasukkan ke blacklist");

      showToast(`"${reasonFor.title}" berhasil di-blacklist!`);
      setReasonFor(null);
      setReason("");
      setSearchOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      await fetchBlacklist();
      if (activeTab === "rekomendasi") fetchDormantNovels();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Terjadi kesalahan";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Keluarkan dari Blacklist (Un-blacklist)
  const remove = async (item: BlacklistItem) => {
    if (!confirm(`Keluarin "${item.title}" dari blacklist? Scraper & translator bakal nyoba lagi update/proses novel ini.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/blacklist?id=${item.id}&novel_id=${item.novel_id || ""}&nu_slug=${item.nu_slug}&type=${item.type}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengeluarkan dari blacklist");

      showToast(`"${item.title}" berhasil dikeluarkan dari blacklist.`);
      await fetchBlacklist();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Gagal mengeluarkan dari blacklist";
      showToast(message, "error");
    }
  };

  // 6. Hapus Raw R2 & Chapter DB (Komiku Style)
  const confirmDeleteRaw = async () => {
    if (!deletingRaw) return;
    setDeletingRawBusy(true);
    try {
      const res = await fetch(`/api/blacklist/raw?slug=${encodeURIComponent(deletingRaw.nu_slug)}&id=${deletingRaw.novel_id || ""}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus file raw & chapter");

      showToast(`Selesai. ${data.deletedChapters || 0} chapter DB & cover R2 "${deletingRaw.title}" telah dibersihkan. Judul tetap aman di Blacklist.`);
      setDeletingRaw(null);
      await fetchBlacklist();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Gagal menghapus raw R2 & chapter";
      showToast(message, "error");
    } finally {
      setDeletingRawBusy(false);
    }
  };

  // 7. Bulk Blacklist Rekomendasi
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
          reason: "Novel mati / stagnan > 60-150 hari",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal blacklist massal");

      showToast(`Sukses! ${dormantNovels.length} novel mati berhasil dimasukkan ke blacklist.`);
      await fetchBlacklist();
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
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ═══ Komiku Style Tabs Navigation ═══ */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab("judul")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "judul"
              ? "bg-[#dca54c] text-slate-950 shadow-md"
              : "bg-[#161a22] text-slate-300 hover:bg-[#1e232e] hover:text-white"
          }`}
        >
          Blacklist Judul
        </button>

        <button
          onClick={() => setActiveTab("chapter")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "chapter"
              ? "bg-[#dca54c] text-slate-950 shadow-md"
              : "bg-[#161a22] text-slate-300 hover:bg-[#1e232e] hover:text-white"
          }`}
        >
          Blacklist Chapter
        </button>

        <button
          onClick={() => setActiveTab("rekomendasi")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "rekomendasi"
              ? "bg-red-600 text-white shadow-md"
              : "bg-[#161a22] text-slate-300 hover:bg-[#1e232e] hover:text-white"
          }`}
        >
          <Sparkles size={14} className={activeTab === "rekomendasi" ? "text-amber-300" : "text-amber-400"} />
          <span>Rekomendasi Novel Mati</span>
          {dormantNovels.length > 0 && (
            <span className="text-xs px-1.5 py-0.2 rounded-full bg-black/40 text-red-200">
              {dormantNovels.length}
            </span>
          )}
        </button>
      </div>

      {/* ═══ TAB 1: Blacklist Judul ═══ */}
      {activeTab === "judul" && (
        <div className="space-y-4">
          {/* Header Subtitle & Tambah Button */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Novel di daftar ini di-skip permanen SELURUHNYA sama scraper (update-chapter maupun translate) - dipakai buat
              novel yg chapter-nya kebukti rusak/mati permanen di sumber, bukan sekadar gagal sementara.
            </p>

            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#dca54c] hover:bg-[#e6b35d] text-slate-950 font-semibold text-xs shadow-md transition-all cursor-pointer shrink-0"
            >
              <Ban size={14} />
              <span>Tambah ke Blacklist</span>
            </button>
          </div>

          {/* Quick Filter Search Input */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#12151b] rounded-lg border border-white/5">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Cari judul atau alasan di daftar blacklist..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none flex-1"
            />
            {filterQuery && (
              <button onClick={() => setFilterQuery("")} className="text-slate-400 hover:text-slate-200">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Table (Komiku Style Minimalist & Compact) */}
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-[#dca54c]/30 border-t-[#dca54c] rounded-full animate-spin mx-auto mb-2" />
              Memuat data blacklist...
            </div>
          ) : filteredNovelItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-[#12151b] rounded-xl border border-white/5">
              Belum ada novel yg di-blacklist
            </div>
          ) : (
            <div className="bg-[#12151b] rounded-xl border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b border-white/5 bg-[#0e1117]">
                    <tr>
                      <th className="py-3 px-4 font-medium">Judul</th>
                      <th className="py-3 px-4 font-medium">Alasan</th>
                      <th className="py-3 px-4 font-medium whitespace-nowrap">Ditandai</th>
                      <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNovelItems.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-2.5 px-4 font-medium text-slate-100">
                          <Link
                            href={`/admin/novels/${c.nu_slug}`}
                            className="hover:text-[#dca54c] hover:underline line-clamp-1"
                          >
                            {c.title}
                          </Link>
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 max-w-md truncate">
                          {c.reason || "-"}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                          {c.blacklisted_at
                            ? new Date(c.blacklisted_at).toLocaleDateString("id-ID")
                            : "-"}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => setDeletingRaw(c)}
                              title="Hapus raw R2 & chapter DB (novel ini doang)"
                              className="p-1.5 rounded hover:bg-white/5 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                            <button
                              onClick={() => remove(c)}
                              title="Keluarin dari blacklist"
                              className="p-1.5 rounded hover:bg-white/5 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            >
                              <X size={15} className="text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Chapter tertentu doang yg di-skip permanen (novel & chapter lainnya tetap normal dicek update) - dipakai buat
            novel ONGOING yg cuma sebagian chapter lamanya rusak permanen di sumber.
          </p>

          {chapterItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-[#12151b] rounded-xl border border-white/5">
              Belum ada chapter yg di-blacklist
            </div>
          ) : (
            <div className="bg-[#12151b] rounded-xl border border-white/5 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 border-b border-white/5 bg-[#0e1117]">
                  <tr>
                    <th className="py-3 px-4 font-medium">Novel</th>
                    <th className="py-3 px-4 font-medium">Chapter</th>
                    <th className="py-3 px-4 font-medium">Alasan</th>
                    <th className="py-3 px-4 font-medium">Ditandai</th>
                    <th className="py-3 px-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {chapterItems.map((ch) => (
                    <tr
                      key={ch.id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 px-4 font-medium text-slate-100">
                        <Link
                          href={`/admin/novels/${ch.nu_slug}`}
                          className="hover:text-[#dca54c] hover:underline"
                        >
                          {ch.title}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-200">
                        Ch. {ch.chapter_number}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 max-w-sm truncate">
                        {ch.reason || "-"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">
                        {ch.blacklisted_at
                          ? new Date(ch.blacklisted_at).toLocaleDateString("id-ID")
                          : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => remove(ch)}
                          title="Keluarin dari blacklist"
                          className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <X size={14} className="text-red-400" />
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#12151b] p-4 rounded-xl border border-white/5">
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Novel-novel di bawah ini terdaftar &gt; 60–150 hari lalu tetapi chapternya tetap sedikit (≤ 15 ch) dan ditinggalkan translator aslinya.
            </p>

            {dormantNovels.length > 0 && (
              <button
                onClick={handleBulkBlacklistDormant}
                disabled={bulkProcessing}
                className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {bulkProcessing ? "Memproses..." : `Blacklist Semua (${dormantNovels.length} Novel)`}
              </button>
            )}
          </div>

          {loadingDormant ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-2" />
              Menganalisis database...
            </div>
          ) : dormantNovels.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-[#12151b] rounded-xl border border-white/5">
              Tidak ada novel mati yang belum di-blacklist.
            </div>
          ) : (
            <div className="bg-[#12151b] rounded-xl border border-white/5 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 border-b border-white/5 bg-[#0e1117]">
                  <tr>
                    <th className="py-3 px-4 font-medium">Judul</th>
                    <th className="py-3 px-4 font-medium">Sumber</th>
                    <th className="py-3 px-4 font-medium">Total Ch</th>
                    <th className="py-3 px-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {dormantNovels.map((n) => (
                    <tr
                      key={n.id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 px-4 font-medium text-slate-100 truncate max-w-sm">
                        {n.title}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">{n.source || "-"}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-300">{n.total_chapters} ch</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setReasonFor(n);
                            setReason("Novel mati di sumber (stagnan lama)");
                          }}
                          className="px-2.5 py-1 rounded bg-red-600/90 hover:bg-red-500 text-white text-xs font-medium cursor-pointer"
                        >
                          Blacklist
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

      {/* ═══ MODAL: Tambah komik/novel ke blacklist (Komiku 1:1) ═══ */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12151b] border border-white/10 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0e1117]">
              <h3 className="font-semibold text-slate-100 text-sm">Tambah novel ke blacklist</h3>
              <button
                onClick={() => setSearchOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cari judul novel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#dca54c]/50 flex-1"
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-3 py-2 rounded-lg bg-[#161a22] hover:bg-[#1e232e] text-slate-200 border border-white/10 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Search size={14} />
                </button>
              </div>

              {searching ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <div className="w-5 h-5 border-2 border-[#dca54c]/30 border-t-[#dca54c] rounded-full animate-spin mx-auto mb-1.5" />
                  Mencari novel...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="max-h-72 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {searchResults.map((novel) => (
                    <div
                      key={novel.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0e1117] border border-white/5 hover:border-white/10"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-100 truncate">{novel.title}</div>
                        <code className="text-[10px] text-slate-400">{novel.nu_slug}</code>
                      </div>
                      <button
                        onClick={() => {
                          setReasonFor(novel);
                          setReason("Novel mati di sumber / di-blacklist");
                        }}
                        className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-medium cursor-pointer shrink-0"
                      >
                        Blacklist
                      </button>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  Tidak ditemukan novel dengan kata kunci tersebut.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Blacklist Reason (Komiku 1:1) ═══ */}
      {reasonFor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12151b] border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-4 py-3 border-b border-white/5 bg-[#0e1117] flex items-center justify-between">
              <h3 className="font-semibold text-slate-100 text-sm truncate max-w-xs">
                Blacklist "{reasonFor.title}"
              </h3>
              <button
                onClick={() => setReasonFor(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <textarea
                placeholder="Alasan (opsional) - mis. 'gambar/chapter 404 permanen di sumber'"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full bg-[#0a0c10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                autoFocus
              />

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setReasonFor(null)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmAdd}
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Memproses..." : "Blacklist Sekarang"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Hapus Raw R2 & Chapter DB (Komiku 1:1) ═══ */}
      {deletingRaw && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12151b] border border-red-500/20 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-4 py-3 border-b border-white/5 bg-[#0e1117] flex items-center justify-between">
              <h3 className="font-semibold text-slate-100 text-sm truncate max-w-md">
                Hapus raw R2 & chapter DB "{deletingRaw.title}"?
              </h3>
              <button
                onClick={() => !deletingRawBusy && setDeletingRaw(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/20 text-red-300 text-xs leading-relaxed space-y-1.5">
                <p>
                  Ini IRREVERSIBLE - cover di R2 dan <strong>seluruh isi teks chapter di database Postgres</strong> akan dihapus permanen untuk menghemat kapasitas storage.
                </p>
                <p className="text-slate-300">
                  🛡️ Judul novel <strong>TETAP ADA</strong> di daftar Blacklist untuk menjaga riwayat dan memastikan scraper TIDAK AKAN PERNAH mengambilnya ulang.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeletingRaw(null)}
                  disabled={deletingRawBusy}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDeleteRaw}
                  disabled={deletingRawBusy}
                  className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {deletingRawBusy ? "Membersihkan..." : "Hapus Permanen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Toast Notification ═══ */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg border shadow-xl flex items-center gap-2 text-xs font-medium animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === "success"
              ? "bg-[#0c1815] border-emerald-500/30 text-emerald-200"
              : "bg-[#1f1013] border-red-500/30 text-red-200"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
