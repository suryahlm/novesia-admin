"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Send,
  Trash2,
  Power,
  PowerOff,
  AlertTriangle,
  Wrench,
  Megaphone,
  Check,
  Radio,
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "maintenance";
  is_active: boolean;
  created_at: string;
}

const TYPES = [
  { value: "info", label: "📢 Info — Pengumuman umum", icon: Megaphone, color: "violet" },
  { value: "warning", label: "⚠ Warning — Peringatan penting", icon: AlertTriangle, color: "amber" },
  { value: "maintenance", label: "🔧 Maintenance — Jadwal maintenance", icon: Wrench, color: "blue" },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const activeNotif = notifications.find((n) => n.is_active);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    if (Array.isArray(data)) setNotifications(data);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, type }),
      });
      if (res.ok) {
        setTitle("");
        setMessage("");
        setType("info");
        fetchNotifications();
        showToast("✅ Notifikasi berhasil dikirim!");
      }
    } catch {
      showToast("❌ Gagal mengirim notifikasi");
    }
    setSending(false);
  };

  const handleToggle = async (id: string, activate: boolean) => {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: activate }),
    });
    fetchNotifications();
    showToast(activate ? "✅ Notifikasi diaktifkan" : "Notifikasi dinonaktifkan");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus notifikasi ini?")) return;
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    fetchNotifications();
    showToast("🗑️ Notifikasi dihapus");
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("id-ID", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold bg-[#0b1b17]/95 border border-emerald-500/40 text-emerald-300 animate-in slide-in-from-right">
          {toast}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-md">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h1
            className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Broadcast Notifikasi Aplikasi
          </h1>
          <p className="text-slate-400 text-xs font-medium">
            Kirim pengumuman, peringatan, atau jadwal maintenance yang tampil di aplikasi pembaca.
          </p>
        </div>
      </div>

      {/* Active Notification Preview Card */}
      {activeNotif && (
        <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
              Notifikasi Aktif Saat Ini
            </span>
            <button
              onClick={() => handleToggle(activeNotif.id, false)}
              className="px-3.5 py-1.5 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Nonaktifkan
            </button>
          </div>

          <div>
            <h3 className="text-base font-bold text-white">{activeNotif.title}</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed font-medium">
              {activeNotif.message}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 text-[10px] text-slate-400 font-mono">
            <span
              className={`px-2 py-0.5 rounded font-extrabold uppercase ${
                activeNotif.type === "info"
                  ? "bg-violet-500/20 text-violet-300"
                  : activeNotif.type === "warning"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-blue-500/20 text-blue-300"
              }`}
            >
              {activeNotif.type}
            </span>
            <span>•</span>
            <span>{formatDate(activeNotif.created_at)}</span>
          </div>
        </div>
      )}

      {/* Create Form */}
      <div className="bg-[#0c101c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-7 shadow-2xl space-y-5">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <Radio className="w-4 h-4 text-violet-400" />
          <span>Buat Broadcast Baru</span>
        </h2>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Judul Pengumuman
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Jadwal Maintenance Server Tengah Malam"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-xs sm:text-sm text-white focus:border-violet-500/60 focus:outline-none transition-all shadow-inner"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Pesan Detail
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tulis pesan lengkap yang akan dibaca oleh seluruh pembaca..."
            rows={3}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-200 focus:border-violet-500/60 focus:outline-none transition-all resize-y shadow-inner leading-relaxed"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Kategori Notifikasi
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-200 focus:border-violet-500/60 focus:outline-none transition-all cursor-pointer"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-slate-900">
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          className="px-6 py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-violet-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
          <span>{sending ? "Mengirim Broadcast..." : "Kirim & Siarkan Notifikasi"}</span>
        </button>
      </div>

      {/* History Table */}
      <div className="bg-[#0c101c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
        <h2 className="text-base font-extrabold text-white">Riwayat Notifikasi</h2>

        {notifications.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">Belum ada riwayat notifikasi</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-400">
                  <th className="text-left py-3 px-3 font-bold uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-3 font-bold uppercase tracking-wider">Tipe</th>
                  <th className="text-left py-3 px-3 font-bold uppercase tracking-wider">Judul</th>
                  <th className="text-left py-3 px-3 font-bold uppercase tracking-wider">Waktu</th>
                  <th className="text-right py-3 px-3 font-bold uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      {n.is_active ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Aktif
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-500">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold text-slate-300 uppercase">
                        {n.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-200">{n.title}</td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {formatDate(n.created_at)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {n.is_active ? (
                          <button
                            onClick={() => handleToggle(n.id, false)}
                            className="p-1.5 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 rounded-lg transition-colors cursor-pointer"
                            title="Nonaktifkan"
                          >
                            <PowerOff className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggle(n.id, true)}
                            className="p-1.5 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 rounded-lg transition-colors cursor-pointer"
                            title="Aktifkan"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="p-1.5 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 rounded-lg transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
