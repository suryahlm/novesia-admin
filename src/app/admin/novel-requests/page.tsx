"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Trash2,
  BookPlus,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  User as UserIcon,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Edit3,
  Globe,
  MessageSquare,
  Users,
  Copy,
  Check,
} from "lucide-react";

interface NovelRequestItem {
  id: string;
  title: string;
  author: string | null;
  source_url: string | null;
  sourceUrl?: string | null;
  language: string | null;
  notes: string | null;
  user_id: string | null;
  userId?: string | null;
  user_name: string;
  userName?: string;
  user_email: string | null;
  userEmail?: string | null;
  status: "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED";
  admin_notes: string | null;
  adminNotes?: string | null;
  request_count: number;
  requestCount?: number;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
}

interface Counts {
  total: number;
  pending: number;
  in_progress: number;
  approved: number;
  rejected: number;
}

export default function NovelRequestsPage() {
  const [items, setItems] = useState<NovelRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Counts>({
    total: 0,
    pending: 0,
    in_progress: 0,
    approved: 0,
    rejected: 0,
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Modal Detail & Edit
  const [activeItem, setActiveItem] = useState<NovelRequestItem | null>(null);
  const [editStatus, setEditStatus] = useState<string>("PENDING");
  const [editAdminNotes, setEditAdminNotes] = useState<string>("");
  const [savingStatus, setSavingStatus] = useState(false);

  // Modal Delete
  const [confirmDel, setConfirmDel] = useState<NovelRequestItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Copied state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("Disalin ke clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadData = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: String(limit),
          status: statusFilter,
          ...(q.trim() ? { q: q.trim() } : {}),
        });

        const res = await fetch(`/api/novel-requests?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat request novel");

        setItems(data.items || []);
        setTotal(data.total || 0);
        if (data.counts) {
          setCounts(data.counts);
        }
        setPage(targetPage);
      } catch (err: any) {
        showToast(`❌ Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [limit, q, statusFilter]
  );

  useEffect(() => {
    loadData(1);
  }, [loadData, statusFilter]);

  const handleOpenDetail = (item: NovelRequestItem) => {
    setActiveItem(item);
    setEditStatus(item.status);
    setEditAdminNotes(item.admin_notes || item.adminNotes || "");
  };

  const handleUpdateStatus = async () => {
    if (!activeItem) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/novel-requests/${activeItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          adminNotes: editAdminNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui status");

      showToast("Status permohonan berhasil diperbarui!");
      setActiveItem(null);
      await loadData(page);
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDelete = async (item: NovelRequestItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/novel-requests/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus permohonan");

      showToast("Permohonan novel berhasil dihapus");
      setConfirmDel(null);
      await loadData(page);
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={12} /> Disetujui
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <Clock size={12} /> Diproses
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle size={12} /> Ditolak
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <HelpCircle size={12} /> Menunggu
          </span>
        );
    }
  };

  const getLanguageLabel = (lang: string | null) => {
    if (!lang) return "Lainnya";
    const l = lang.toLowerCase();
    if (l.includes("korea") || l.includes("kr")) return "🇰🇷 Korea";
    if (l.includes("china") || l.includes("cn") || l.includes("tiongkok")) return "🇨🇳 China";
    if (l.includes("jepang") || l.includes("jp") || l.includes("japan")) return "🇯🇵 Jepang";
    if (l.includes("inggris") || l.includes("en") || l.includes("english")) return "🇬🇧 Inggris";
    return `🌐 ${lang}`;
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-[#151921] border border-[#B99762]/40 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium animate-fade-in">
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookPlus size={24} className="text-[#D4A843]" />
            <h1 className="text-xl md:text-2xl font-bold text-slate-100">
              Permintaan Novel Baru
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Daftar permohonan judul novel dari pengguna mobile app dan web untuk ditambahkan ke platform.
          </p>
        </div>

        <button
          onClick={() => loadData(page)}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-colors cursor-pointer w-fit"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-[#D4A843]" : ""} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-[#0e1117] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-slate-400 font-medium">Total Permohonan</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{counts.total}</div>
        </div>

        <div className="bg-[#0e1117] border border-amber-500/20 rounded-2xl p-4">
          <div className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Menunggu
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{counts.pending}</div>
        </div>

        <div className="bg-[#0e1117] border border-sky-500/20 rounded-2xl p-4">
          <div className="text-xs text-sky-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span> Sedang Diproses
          </div>
          <div className="text-2xl font-bold text-sky-300 mt-1">{counts.in_progress}</div>
        </div>

        <div className="bg-[#0e1117] border border-emerald-500/20 rounded-2xl p-4">
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Disetujui
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">{counts.approved}</div>
        </div>

        <div className="bg-[#0e1117] border border-rose-500/20 rounded-2xl p-4">
          <div className="text-xs text-rose-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span> Ditolak
          </div>
          <div className="text-2xl font-bold text-rose-300 mt-1">{counts.rejected}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#0e1117] p-1 rounded-xl border border-white/5 overflow-x-auto">
          {[
            { key: "ALL", label: "Semua", count: counts.total },
            { key: "PENDING", label: "Menunggu", count: counts.pending },
            { key: "IN_PROGRESS", label: "Diproses", count: counts.in_progress },
            { key: "APPROVED", label: "Disetujui", count: counts.approved },
            { key: "REJECTED", label: "Ditolak", count: counts.rejected },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-[#B99762] text-[#0D1117] shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari judul, penulis, pemohon..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadData(1)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0e1117] border border-white/10 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-[#D4A843] transition-colors"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#0e1117] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="px-4 py-3.5">Judul Novel & Bahasa</th>
                <th className="px-4 py-3.5">Penulis</th>
                <th className="px-4 py-3.5">Pemohon</th>
                <th className="px-4 py-3.5 text-center">Permohonan</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Waktu</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <RefreshCw size={24} className="animate-spin mx-auto text-[#D4A843] mb-2" />
                    Memuat data request novel...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    Tidak ada permohonan novel yang cocok dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => handleOpenDetail(item)}
                  >
                    {/* Judul & Bahasa */}
                    <td className="px-4 py-3.5 max-w-[280px]">
                      <div className="flex items-start gap-2">
                        <div>
                          <div className="font-bold text-slate-100 text-sm group-hover:text-[#D4A843] transition-colors line-clamp-1 flex items-center gap-1.5">
                            {item.title}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(item.title, item.id);
                              }}
                              className="text-slate-500 hover:text-[#D4A843] transition-colors"
                              title="Salin judul novel"
                            >
                              {copiedId === item.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                              {getLanguageLabel(item.language)}
                            </span>
                            {item.source_url && (
                              <a
                                href={item.source_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] text-[#D4A843] hover:underline"
                              >
                                Link Sumber <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Penulis */}
                    <td className="px-4 py-3.5 text-slate-400">
                      {item.author ? (
                        <span className="font-medium text-slate-200">{item.author}</span>
                      ) : (
                        <span className="text-slate-600 italic">Tidak dicantumkan</span>
                      )}
                    </td>

                    {/* Pemohon */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                          <UserIcon size={12} />
                        </div>
                        <div>
                          <div className="font-medium text-slate-200 line-clamp-1">
                            {item.user_name || item.userName || "Pembaca"}
                          </div>
                          <div className="text-[10.5px] text-slate-500 line-clamp-1">
                            {item.user_email || item.userEmail || (item.user_id ? "Akun Terdaftar" : "Mode Tamu")}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Permohonan Count */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-[#B99762]/15 text-[#D4A843] border border-[#B99762]/30 text-xs">
                        <Users size={11} />
                        {item.request_count || item.requestCount || 1}x
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Waktu */}
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                      {new Date(item.created_at || item.createdAt || "").toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDetail(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
                          title="Tinjau & Ubah Status"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDel(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Hapus Permohonan"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <div>
            Menampilkan <span className="font-bold text-slate-200">{items.length}</span> dari{" "}
            <span className="font-bold text-slate-200">{total}</span> permohonan
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-medium text-slate-300">
              Hal {page} dari {totalPages}
            </span>
            <button
              onClick={() => loadData(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Detail / Ubah Status */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0e1117] border border-[#B99762]/30 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#D4A843] font-bold tracking-wider uppercase">
                    Detail Permohonan Novel
                  </span>
                  <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-slate-400">
                    Diminta {activeItem.request_count || activeItem.requestCount || 1} kali
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-100 mt-1">{activeItem.title}</h3>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-white/[0.02] p-3.5 rounded-xl border border-white/5">
              <div>
                <span className="text-slate-500 block">Penulis:</span>
                <span className="font-medium text-slate-200">{activeItem.author || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Bahasa Asal:</span>
                <span className="font-medium text-slate-200">{getLanguageLabel(activeItem.language)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Pemohon:</span>
                <span className="font-medium text-slate-200">
                  {activeItem.user_name || activeItem.userName || "Pembaca"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Email Kontak:</span>
                <span className="font-medium text-slate-200">{activeItem.user_email || activeItem.userEmail || "-"}</span>
              </div>
            </div>

            {/* Link Sumber */}
            {activeItem.source_url && (
              <div className="text-xs">
                <span className="text-slate-400 font-medium block mb-1">Link Sumber / Referensi:</span>
                <a
                  href={activeItem.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[#D4A843] bg-[#B99762]/10 p-2 rounded-lg border border-[#B99762]/30 hover:underline break-all"
                >
                  <ExternalLink size={12} className="shrink-0" />
                  <span>{activeItem.source_url}</span>
                </a>
              </div>
            )}

            {/* Catatan Pembaca */}
            <div>
              <span className="text-xs text-slate-400 font-medium block mb-1">
                Catatan / Alasan dari Pembaca:
              </span>
              <div className="bg-black/40 border border-white/5 p-3 rounded-xl text-xs text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                {activeItem.notes || "Tidak ada catatan tambahan."}
              </div>
            </div>

            {/* Status Selector & Admin Notes */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Ubah Status Permohonan:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: "PENDING", label: "Menunggu", color: "border-amber-500/50 text-amber-300" },
                    { key: "IN_PROGRESS", label: "Diproses", color: "border-sky-500/50 text-sky-300" },
                    { key: "APPROVED", label: "Disetujui", color: "border-emerald-500/50 text-emerald-300" },
                    { key: "REJECTED", label: "Ditolak", color: "border-rose-500/50 text-rose-300" },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setEditStatus(s.key)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        editStatus === s.key
                          ? `bg-white/10 ${s.color} shadow-lg`
                          : "border-white/5 text-slate-400 hover:bg-white/5"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Catatan Internal Admin (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  placeholder="Contoh: Sudah masuk daftar antrean scraping bab RAW..."
                  className="w-full bg-[#12151b] border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#D4A843]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={savingStatus}
                className="px-4 py-2 rounded-xl bg-[#B99762] hover:bg-[#a3834e] text-[#0D1117] text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingStatus ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0e1117] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle size={24} />
              <h3 className="text-base font-bold text-slate-100">Hapus Permohonan Novel</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Apakah Anda yakin ingin menghapus permohonan novel{" "}
              <strong className="text-slate-200">"{confirmDel.title}"</strong>? Data yang dihapus tidak
              dapat dikembalikan.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDel(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(confirmDel)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
