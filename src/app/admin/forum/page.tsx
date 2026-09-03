"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Pin,
  Lock,
  Unlock,
  Eye,
  MessageSquare,
  MessagesSquare,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  FolderPlus,
  User as UserIcon,
} from "lucide-react";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  threadCount: number;
}

interface ThreadListItem {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  locked: boolean;
  createdAt: string;
  lastActivityAt: string;
  user: {
    id: string | null;
    name: string;
    avatarUrl: string | null;
    role: string;
  };
  category: {
    id?: string;
    name: string;
    slug: string;
  };
  postCount: number;
}

interface ThreadDetail extends ThreadListItem {
  posts: {
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string | null;
      name: string;
      avatarUrl: string | null;
      role: string;
    };
  }[];
}

// ════════════════════════════════════════════════════════════
// KATEGORI FORUM COMPONENT
// ════════════════════════════════════════════════════════════
function CategoriesSection({ onToast }: { onToast: (msg: string) => void }) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [confirmDel, setConfirmDel] = useState<CategoryItem | null>(null);
  const [formError, setFormError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState("0");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/forum/categories");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat kategori");
      setCategories(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Gagal memuat kategori");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setOrder("0");
    setFormError("");
  };

  const handleAdd = async () => {
    if (!name.trim()) return setFormError("Nama kategori wajib diisi");
    setBusy(true);
    setFormError("");
    try {
      const res = await fetch("/api/forum/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined, order: Number(order) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat kategori");

      onToast(`Kategori "${name}" berhasil dibuat`);
      resetForm();
      setAdding(false);
      await load();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (c: CategoryItem) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description || "");
    setOrder(String(c.order));
    setFormError("");
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!name.trim()) return setFormError("Nama kategori wajib diisi");
    setBusy(true);
    setFormError("");
    try {
      const res = await fetch(`/api/forum/categories/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined, order: Number(order) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui kategori");

      onToast(`Kategori "${name}" berhasil diperbarui`);
      setEditing(null);
      await load();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (c: CategoryItem) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/forum/categories/${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus kategori");

      onToast(`Kategori "${c.name}" berhasil dihapus`);
      setConfirmDel(null);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-400">
          Kelola urutan dan daftar kategori forum diskusi pembaca.
        </p>
        <button
          onClick={() => {
            resetForm();
            setAdding(true);
          }}
          className="px-4 py-2 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-[0_2px_10px_-2px_rgba(221,168,58,0.4)] transition-all"
        >
          <Plus size={15} />
          <span>Kategori Baru</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-[#12151b] border border-white/5 rounded-xl p-12 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
          <p className="text-xs">Memuat kategori forum...</p>
        </div>
      ) : error ? (
        <div className="bg-[#12151b] border border-red-900/40 rounded-xl p-8 text-center text-xs text-red-300">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-[#12151b] border border-white/5 rounded-xl p-12 text-center text-slate-500 text-xs">
          Belum ada kategori forum. Klik tombol "Kategori Baru" untuk membuatnya.
        </div>
      ) : (
        <div className="bg-[#12151b] border border-white/5 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-400 text-left border-b border-white/5 bg-[#12151b]">
                <tr>
                  <th className="py-3 px-4 font-semibold w-16">Urutan</th>
                  <th className="py-3 px-4 font-semibold">Nama Kategori</th>
                  <th className="py-3 px-4 font-semibold">Deskripsi</th>
                  <th className="py-3 px-4 font-semibold">Jumlah Thread</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">{c.order}</td>
                    <td className="py-3 px-4 font-semibold text-slate-100">{c.name}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{c.description || "-"}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                        {c.threadCount} Thread
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 bg-[#0a0c10] hover:bg-white/10 text-slate-300 rounded transition-colors cursor-pointer"
                          title="Edit kategori"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmDel(c)}
                          className="p-1.5 bg-[#0a0c10] hover:bg-red-950/60 text-slate-400 hover:text-red-300 rounded transition-colors cursor-pointer"
                          title="Hapus kategori"
                        >
                          <Trash2 size={13} />
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

      {/* Modal Add Category */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12151b] border border-white/10 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FolderPlus size={16} className="text-amber-400" />
                <span>Kategori Forum Baru</span>
              </h3>
              <button onClick={() => setAdding(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {formError && <div className="p-2.5 bg-red-950/50 border border-red-900/60 rounded-lg text-xs text-red-300">{formError}</div>}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Nama Kategori</label>
                <input
                  type="text"
                  placeholder="Mis. Diskusi Teori & Plot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Deskripsi Singkat (Opsional)</label>
                <textarea
                  placeholder="Jelaskan topik yang dibahas dalam kategori ini..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all resize-y"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Urutan Tampil (Angka kecil muncul lebih awal)</label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setAdding(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={busy || !name.trim()}
                className="px-4 py-2 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-[0_2px_10px_-2px_rgba(221,168,58,0.4)] disabled:opacity-50"
              >
                {busy ? "Membuat..." : "Buat Kategori"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Category */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12151b] border border-white/10 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Pencil size={16} className="text-amber-400" />
                <span>Edit Kategori Forum</span>
              </h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {formError && <div className="p-2.5 bg-red-950/50 border border-red-900/60 rounded-lg text-xs text-red-300">{formError}</div>}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Nama Kategori</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Deskripsi Singkat</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all resize-y"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Urutan Tampil</label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={busy || !name.trim()}
                className="px-4 py-2 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-[0_2px_10px_-2px_rgba(221,168,58,0.4)] disabled:opacity-50"
              >
                {busy ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete Category */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12151b] border border-red-900/60 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Hapus Kategori Forum?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Hapus kategori <strong className="text-white font-semibold">"{confirmDel.name}"</strong>? Seluruh thread ({confirmDel.threadCount}) di dalam kategori ini akan ikut terhapus permanen.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDel(null)}
                disabled={busy}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(confirmDel)}
                disabled={busy}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-[0_2px_12px_-2px_rgba(220,38,38,0.5)] disabled:opacity-50"
              >
                {busy ? "Menghapus..." : "Hapus Kategori"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MODERASI THREADS COMPONENT
// ════════════════════════════════════════════════════════════
function ThreadsSection({ onToast }: { onToast: (msg: string) => void }) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [rows, setRows] = useState<ThreadListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(30);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDel, setConfirmDel] = useState<ThreadListItem | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/forum/categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: String(limit),
          ...(q.trim() ? { q: q.trim() } : {}),
          ...(categoryId ? { categoryId } : {}),
        });

        const res = await fetch(`/api/forum/threads?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat thread forum");

        setRows(data.rows || []);
        setTotal(data.total || 0);
        setPage(targetPage);
      } catch (e: any) {
        setError(e.message || "Gagal memuat thread");
      } finally {
        setLoading(false);
      }
    },
    [limit, q, categoryId]
  );

  useEffect(() => {
    load(1);
  }, [categoryId, load]);

  const search = () => load(1);

  const toggleFlag = async (t: ThreadListItem, flag: "pinned" | "locked") => {
    try {
      const res = await fetch(`/api/forum/threads/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [flag]: !t[flag] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal update status thread");

      onToast(
        flag === "pinned"
          ? !t.pinned
            ? "📌 Thread di-Pin ke atas"
            : "Pin thread dilepas"
          : !t.locked
          ? "🔒 Thread dikunci dari balasan baru"
          : "Kunci thread dibuka"
      );
      await load(page);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const del = async (t: ThreadListItem) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/forum/threads/${t.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus thread");

      onToast("Thread berhasil dihapus");
      setConfirmDel(null);
      setDetail(null);
      await load(page);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (t: ThreadListItem) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/forum/threads/${t.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat detail thread");
      setDetail(data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const delPost = async (postId: string) => {
    if (!confirm("Hapus balasan komentar ini?")) return;
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus balasan");

      onToast("Balasan berhasil dihapus");
      if (detail) {
        const refreshed = await fetch(`/api/forum/threads/${detail.id}`).then((r) => r.json());
        setDetail(refreshed);
      }
      await load(page);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-4">
      {/* Search & Category Filter */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl p-4">
        <div className="flex flex-wrap gap-2.5 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari judul thread, isi, atau nama penulis..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="w-full bg-[#0a0c10] border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all"
            />
          </div>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-amber-400/70 focus:outline-none transition-all cursor-pointer min-w-[160px]"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={search}
            className="px-4 py-2 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-bold rounded-lg text-xs cursor-pointer transition-all shadow-[0_2px_10px_-2px_rgba(221,168,58,0.4)]"
          >
            Cari
          </button>
        </div>
      </div>

      {/* Threads Table */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Memuat thread forum...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-300 space-y-2">
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto" />
            <p>{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Belum ada thread diskusi di forum.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[68vh] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-400 text-left border-b border-white/5 sticky top-0 bg-[#12151b] z-10">
                <tr>
                  <th className="py-3 px-4 font-semibold">Judul Thread</th>
                  <th className="py-3 px-4 font-semibold">Kategori</th>
                  <th className="py-3 px-4 font-semibold">Penulis</th>
                  <th className="py-3 px-4 font-semibold">Balasan</th>
                  <th className="py-3 px-4 font-semibold">Aktivitas Terakhir</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-4 max-w-xs">
                      <div className="flex items-center gap-1.5">
                        {t.pinned && <Pin size={13} className="text-amber-400 shrink-0" />}
                        {t.locked && <Lock size={13} className="text-slate-400 shrink-0" />}
                        <span className="font-semibold text-slate-100 truncate">{t.title}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300">
                        {t.category?.name || "Umum"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="text-slate-200 font-medium">{t.user.name}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-mono">
                      <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[10px] font-bold">
                        {t.postCount}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(t.lastActivityAt).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDetail(t)}
                          className="p-1.5 bg-[#0a0c10] hover:bg-white/10 text-slate-300 rounded transition-colors cursor-pointer"
                          title="Lihat thread & balasan"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => toggleFlag(t, "pinned")}
                          className={`p-1.5 rounded transition-colors cursor-pointer ${
                            t.pinned
                              ? "bg-amber-400/20 text-amber-300 hover:bg-amber-400/30"
                              : "bg-[#0a0c10] hover:bg-white/10 text-slate-400 hover:text-amber-400"
                          }`}
                          title={t.pinned ? "Lepas Pin" : "Pin Thread ke Atas"}
                        >
                          <Pin size={13} />
                        </button>
                        <button
                          onClick={() => toggleFlag(t, "locked")}
                          className={`p-1.5 rounded transition-colors cursor-pointer ${
                            t.locked
                              ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                              : "bg-[#0a0c10] hover:bg-white/10 text-slate-400 hover:text-slate-200"
                          }`}
                          title={t.locked ? "Buka Kunci Thread" : "Kunci Thread (Tutup Balasan)"}
                        >
                          {t.locked ? <Unlock size={13} /> : <Lock size={13} />}
                        </button>
                        <button
                          onClick={() => setConfirmDel(t)}
                          className="p-1.5 bg-[#0a0c10] hover:bg-red-950/60 text-slate-400 hover:text-red-300 rounded transition-colors cursor-pointer"
                          title="Hapus Thread"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
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
            Total <strong className="text-slate-200">{total}</strong> thread • Halaman{" "}
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

      {/* Modal Detail Thread & Replies */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12151b] border border-white/10 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-slate-100 truncate pr-4">
                {detailLoading ? "Memuat Thread..." : detail?.title}
              </h3>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-16 text-center">
                <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 mt-2">Memuat isi thread dan balasan...</p>
              </div>
            ) : detail ? (
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Meta badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300">
                    {detail.category?.name}
                  </span>
                  {detail.pinned && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                      <Pin size={10} /> Pinned
                    </span>
                  )}
                  {detail.locked && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                      <Lock size={10} /> Locked
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 ml-auto font-mono">
                    {detail.user.name} • {new Date(detail.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>

                {/* Original Post Content */}
                <div className="p-3.5 bg-[#0a0c10] border border-white/5 rounded-xl text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {detail.content}
                </div>

                {/* Replies / Posts List */}
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Balasan ({detail.posts.length})</span>
                  </div>

                  {detail.posts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-[#0a0c10] rounded-xl border border-white/5">
                      Belum ada balasan di thread ini.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {detail.posts.map((p) => (
                        <div key={p.id} className="p-3 bg-[#0a0c10] border border-white/5 rounded-xl flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-200 text-xs">{p.user.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(p.createdAt).toLocaleString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{p.content}</p>
                          </div>
                          <button
                            onClick={() => delPost(p.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded cursor-pointer transition-colors"
                            title="Hapus balasan"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => setDetail(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={() => setConfirmDel(detail)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    Hapus Thread
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal Delete Thread */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12151b] border border-red-900/60 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Hapus Thread Diskusi?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Hapus thread <strong className="text-white font-semibold">"{confirmDel.title}"</strong>? Seluruh balasan ({confirmDel.postCount}) di dalamnya akan ikut terhapus permanen.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDel(null)}
                disabled={busy}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => del(confirmDel)}
                disabled={busy}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-[0_2px_12px_-2px_rgba(220,38,38,0.5)] disabled:opacity-50"
              >
                {busy ? "Menghapus..." : "Hapus Thread"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN FORUM PAGE COMPONENT
// ════════════════════════════════════════════════════════════
export default function ForumPage() {
  const [activeTab, setActiveTab] = useState<"threads" | "categories">("threads");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold bg-[#0c1815] border border-emerald-900/60 text-emerald-200 animate-in slide-in-from-right">
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
          <MessagesSquare className="w-6 h-6 text-amber-400" />
          <span>Forum Komunitas</span>
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Kelola thread diskusi pembaca, pin pengumuman penting, kunci perdebatan, dan atur kategori forum.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab("threads")}
          className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
            activeTab === "threads"
              ? "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-950 shadow-[0_2px_10px_-2px_rgba(221,168,58,0.4)]"
              : "bg-[#12151b] hover:bg-white/5 text-slate-300 border border-white/5"
          }`}
        >
          Moderasi Thread
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
            activeTab === "categories"
              ? "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-950 shadow-[0_2px_10px_-2px_rgba(221,168,58,0.4)]"
              : "bg-[#12151b] hover:bg-white/5 text-slate-300 border border-white/5"
          }`}
        >
          Kategori Forum
        </button>
      </div>

      {activeTab === "threads" ? <ThreadsSection onToast={showToast} /> : <CategoriesSection onToast={showToast} />}
    </div>
  );
}
