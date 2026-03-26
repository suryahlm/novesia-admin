"use client";

import { useState, useEffect } from "react";
import { Bell, Send, Trash2, Power, PowerOff, AlertTriangle, Wrench, Megaphone } from "lucide-react";

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
      day: "numeric", month: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

  const typeConfig = (t: string) => TYPES.find((x) => x.value === t) || TYPES[0];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium bg-emerald-500/90 text-white animate-in slide-in-from-right">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Bell className="w-7 h-7 text-violet-400" />
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Notifikasi Admin
        </h1>
      </div>

      {/* Active Notification Preview */}
      {activeNotif && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              Notifikasi Aktif
            </span>
            <button
              onClick={() => handleToggle(activeNotif.id, false)}
              className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-colors"
            >
              Nonaktifkan
            </button>
          </div>
          <p className="font-semibold text-white">{activeNotif.title}</p>
          <p className="text-sm text-gray-300 mt-1">{activeNotif.message}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
              activeNotif.type === "info" ? "bg-violet-500/20 text-violet-300" :
              activeNotif.type === "warning" ? "bg-amber-500/20 text-amber-300" :
              "bg-blue-500/20 text-blue-300"
            }`}>
              {activeNotif.type === "info" ? "📢" : activeNotif.type === "warning" ? "⚠" : "🔧"} {activeNotif.type}
            </span>
            <span className="text-xs text-gray-500">{formatDate(activeNotif.created_at)}</span>
          </div>
        </div>
      )}

      {/* Create Form */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Buat Notifikasi Baru</h2>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Judul</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Maintenance Server"
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-sm focus:border-violet-500/50 focus:outline-none transition-all placeholder-gray-600"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Pesan</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Contoh: Server akan maintenance jam 22:00 - 02:00 WIB"
            rows={3}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-sm focus:border-violet-500/50 focus:outline-none transition-all resize-y placeholder-gray-600"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipe</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-sm focus:border-violet-500/50 focus:outline-none transition-all"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl text-sm font-semibold shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          {sending ? "Mengirim..." : "Kirim Notifikasi"}
        </button>

        <p className="text-xs text-gray-600">
          * Mengirim notifikasi baru akan otomatis menonaktifkan notifikasi sebelumnya
        </p>
      </div>

      {/* History */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Riwayat Notifikasi</h2>

        {notifications.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Belum ada notifikasi</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800/50">
                  <th className="text-left py-3 px-3 text-gray-400 font-semibold text-xs">Status</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-semibold text-xs">Tipe</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-semibold text-xs">Judul</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-semibold text-xs">Pesan</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-semibold text-xs">Waktu</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-semibold text-xs">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id} className="border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors">
                    <td className="py-3 px-3">
                      {n.is_active ? (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Aktif
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-500/15 text-gray-500 flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
                        n.type === "info" ? "bg-violet-500/20 text-violet-300" :
                        n.type === "warning" ? "bg-amber-500/20 text-amber-300" :
                        "bg-blue-500/20 text-blue-300"
                      }`}>
                        {n.type === "info" ? "📢" : n.type === "warning" ? "⚠" : "🔧"} {n.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-white max-w-[140px] truncate">{n.title}</td>
                    <td className="py-3 px-3 text-gray-400 max-w-[200px] truncate">{n.message}</td>
                    <td className="py-3 px-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(n.created_at)}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {n.is_active ? (
                          <button
                            onClick={() => handleToggle(n.id, false)}
                            className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-500/30 transition-colors flex items-center gap-1"
                          >
                            <PowerOff className="w-3 h-3" /> Nonaktifkan
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggle(n.id, true)}
                            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
                          >
                            <Power className="w-3 h-3" /> Aktifkan
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Hapus
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
