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
  Smartphone,
  Globe,
  Layers,
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "maintenance";
  target?: "all" | "web" | "app";
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
  const [target, setTarget] = useState<"all" | "web" | "app">("all");
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
        body: JSON.stringify({ title, message, type, target }),
      });
      if (res.ok) {
        setTitle("");
        setMessage("");
        setType("info");
        setTarget("all");
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
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold bg-[#0c1815] border border-emerald-900/60 text-emerald-200 animate-in slide-in-from-right">
          {toast}
        </div>
      )}

      {/* Header Banner */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          Broadcast Notifikasi
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Kirim pengumuman, peringatan, atau jadwal maintenance yang tampil di aplikasi pembaca.
        </p>
      </div>

      {/* Active Notification Preview Card */}
      {activeNotif && (
        <div className="rounded-xl p-4 bg-amber-400/10 border border-amber-400/25 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
              Notifikasi Aktif Saat Ini
            </span>
            <button
              onClick={() => handleToggle(activeNotif.id, false)}
              className="px-2.5 py-1 bg-red-950/60 text-red-300 hover:bg-red-900/60 border border-red-900/60 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Nonaktifkan
            </button>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-100">{activeNotif.title}</h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {activeNotif.message}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400 font-mono">
            <span
              className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                activeNotif.type === "info"
                  ? "bg-amber-400/20 text-amber-300"
                  : activeNotif.type === "warning"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-blue-500/20 text-blue-300"
              }`}
            >
              {activeNotif.type}
            </span>
            <span>•</span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold ${
                activeNotif.target === "app"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : activeNotif.target === "web"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              }`}
            >
              {activeNotif.target === "app"
                ? "📱 Target: App"
                : activeNotif.target === "web"
                ? "🌐 Target: Web"
                : "⚡ Target: Semua"}
            </span>
            <span>•</span>
            <span>{formatDate(activeNotif.created_at)}</span>
          </div>
        </div>
      )}

      {/* Create Form */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-400" />
            <span>Buat Broadcast Baru</span>
          </h2>

          {/* 3 Tombol Pilihan Target: App - Web - Semua */}
          <div className="flex items-center gap-1.5 p-1 bg-[#0a0c10] border border-white/10 rounded-xl">
            <button
              type="button"
              onClick={() => setTarget("app")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                target === "app"
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-[0_2px_10px_rgba(251,191,36,0.3)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>App</span>
            </button>

            <button
              type="button"
              onClick={() => setTarget("web")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                target === "web"
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-[0_2px_10px_rgba(251,191,36,0.3)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Web</span>
            </button>

            <button
              type="button"
              onClick={() => setTarget("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                target === "all"
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-[0_2px_10px_rgba(251,191,36,0.3)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua</span>
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
            Judul Pengumuman
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Jadwal Maintenance Server Tengah Malam"
            className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white focus:border-amber-400/70 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
            Pesan Detail
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tulis pesan lengkap yang akan dibaca oleh seluruh pembaca..."
            rows={3}
            className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-200 focus:border-amber-400/70 focus:outline-none transition-all resize-y leading-relaxed"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
            Kategori Notifikasi
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-amber-400/70 focus:outline-none transition-all cursor-pointer"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-[#0a0c10]">
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          className="px-5 py-2.5 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 rounded-lg text-xs font-bold shadow-[0_2px_12px_-2px_rgba(221,168,58,0.45)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
          <span>{sending ? "Mengirim Broadcast..." : "Kirim Notifikasi"}</span>
        </button>
      </div>

      {/* History Table */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl overflow-hidden p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-100">Riwayat Notifikasi</h2>

        {notifications.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">Belum ada riwayat notifikasi</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-slate-400 text-left">
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Tipe</th>
                  <th className="py-2.5 px-3 font-semibold">Target</th>
                  <th className="py-2.5 px-3 font-semibold">Judul</th>
                  <th className="py-2.5 px-3 font-semibold">Waktu</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3">
                      {n.is_active ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                          Aktif
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-semibold text-slate-300 uppercase">
                        {n.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          n.target === "app"
                            ? "bg-sky-500/15 text-sky-300 border-sky-500/25"
                            : n.target === "web"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                            : "bg-purple-500/15 text-purple-300 border-purple-500/25"
                        }`}
                      >
                        {n.target === "app" ? "📱 App" : n.target === "web" ? "🌐 Web" : "⚡ Semua"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-200">{n.title}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {formatDate(n.created_at)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {n.is_active ? (
                          <button
                            onClick={() => handleToggle(n.id, false)}
                            className="p-1.5 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 rounded transition-colors cursor-pointer"
                            title="Nonaktifkan"
                          >
                            <PowerOff className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggle(n.id, true)}
                            className="p-1.5 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 rounded transition-colors cursor-pointer"
                            title="Aktifkan"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="p-1.5 bg-red-950/60 text-red-300 hover:bg-red-900/60 rounded transition-colors cursor-pointer"
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
