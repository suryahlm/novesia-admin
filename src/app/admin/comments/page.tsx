"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Trash2,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  User as UserIcon,
} from "lucide-react";

interface CommentItem {
  id: string;
  user_id: string | null;
  user_name: string;
  user_email: string | null;
  user_avatar: string | null;
  target: "NOVEL" | "CHAPTER";
  novel_id: string | null;
  chapter_id: string | null;
  content: string;
  created_at: string;
  novel?: {
    id: string;
    title: string;
    nu_slug: string;
  } | null;
}

export default function CommentsPage() {
  const [rows, setRows] = useState<CommentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(30);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDel, setConfirmDel] = useState<CommentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: String(limit),
          ...(q.trim() ? { q: q.trim() } : {}),
        });

        const res = await fetch(`/api/comments?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat komentar");

        setRows(data.rows || []);
        setTotal(data.total || 0);
        setPage(targetPage);
      } catch (e: any) {
        setError(e.message || "Gagal memuat komentar");
      } finally {
        setLoading(false);
      }
    },
    [limit, q]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const search = () => load(1);

  const del = async (c: CommentItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/comments/${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus komentar");

      showToast("Komentar berhasil dihapus");
      setConfirmDel(null);
      await load(page);
    } catch (e: any) {
      showToast(`❌ Error: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold bg-[#0c1815] border border-emerald-900/60 text-emerald-200 animate-in slide-in-from-right">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-amber-400" />
            <span>Moderasi Komentar</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Pantau dan moderasi komentar pembaca di halaman detail novel maupun chapter baca.
          </p>
        </div>
        <button
          onClick={() => load(page)}
          disabled={loading}
          className="px-3.5 py-2 bg-[#12151b] hover:bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-slate-300 flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? "animate-spin" : ""}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl p-4">
        <div className="flex flex-wrap gap-2.5 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari isi komentar, nama pengguna, atau email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="w-full bg-[#0a0c10] border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all"
            />
          </div>
          <button
            onClick={search}
            className="px-4 py-2 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-bold rounded-lg text-xs cursor-pointer transition-all shadow-[0_2px_10px_-2px_rgba(221,168,58,0.4)]"
          >
            Cari
          </button>
        </div>
      </div>

      {/* Comments Table */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Memuat komentar...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-300 space-y-2">
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto" />
            <p>{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Belum ada komentar yang ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[68vh] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-400 text-left border-b border-white/5 sticky top-0 bg-[#12151b] z-10">
                <tr>
                  <th className="py-3 px-4 font-semibold">Pengguna</th>
                  <th className="py-3 px-4 font-semibold">Target</th>
                  <th className="py-3 px-4 font-semibold">Novel Terkait</th>
                  <th className="py-3 px-4 font-semibold">Isi Komentar</th>
                  <th className="py-3 px-4 font-semibold">Waktu</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#0a0c10] border border-white/10 shrink-0 flex items-center justify-center">
                          {c.user_avatar ? (
                            <img src={c.user_avatar} alt={c.user_name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <UserIcon size={12} className="text-slate-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-100">{c.user_name}</div>
                          {c.user_email && <div className="text-[10px] text-slate-400 font-mono">{c.user_email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${
                          c.target === "NOVEL"
                            ? "bg-amber-400/10 text-amber-300 border border-amber-400/20"
                            : "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                        }`}
                      >
                        {c.target === "NOVEL" ? <BookOpen size={10} /> : <FileText size={10} />}
                        <span>{c.target === "NOVEL" ? "Novel" : "Chapter"}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 max-w-[200px] truncate font-medium">
                      {c.novel?.title || "-"}
                      {c.chapter_id && <span className="text-[10px] text-slate-500 block font-mono">Ch. {c.chapter_id}</span>}
                    </td>
                    <td className="py-2.5 px-4 text-slate-200 max-w-sm">
                      <div className="flex items-start gap-2">
                        <MessageSquare size={13} className="text-slate-500 mt-0.5 shrink-0" />
                        <span className="line-clamp-2 leading-relaxed">{c.content}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(c.created_at).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setConfirmDel(c)}
                        className="p-1.5 bg-[#0a0c10] hover:bg-red-950/60 text-slate-400 hover:text-red-300 rounded transition-colors cursor-pointer"
                        title="Hapus komentar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <div>
            Total <strong className="text-slate-200">{total}</strong> komentar • Halaman{" "}
            <strong className="text-slate-200">{page}</strong> dari{" "}
            <strong className="text-slate-200">{totalPages}</strong>
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1)}
              className="px-3 py-1.5 bg-[#0a0c10] hover:bg-white/5 border border-white/10 rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={14} />
              <span>Sebelumnya</span>
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => load(page + 1)}
              className="px-3 py-1.5 bg-[#0a0c10] hover:bg-white/5 border border-white/10 rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            >
              <span>Berikutnya</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12151b] border border-red-900/60 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Hapus Komentar?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Hapus komentar dari <strong className="text-white font-semibold">"{confirmDel.user_name}"</strong>? Tindakan ini permanen dan tidak dapat dibatalkan.
            </p>
            <div className="p-3 bg-[#0a0c10] rounded-lg border border-white/5 text-xs text-slate-300 italic">
              "{confirmDel.content}"
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDel(null)}
                disabled={deleting}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => del(confirmDel)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-[0_2px_12px_-2px_rgba(220,38,38,0.5)] disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Hapus Komentar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
