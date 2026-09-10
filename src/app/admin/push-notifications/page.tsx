"use client";

import { useState, useEffect } from "react";
import {
  BellRing,
  Send,
  Smartphone,
  Info,
  Clock,
  ExternalLink,
  Users,
  RefreshCw,
} from "lucide-react";

interface PushLog {
  id: string;
  title: string;
  message: string;
  target: string;
  deepLinkSlug?: string | null;
  sentCount: number;
  createdAt: string;
}

export default function PushNotificationsPage() {
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [totalDevices, setTotalDevices] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("ALL");
  const [deepLinkSlug, setDeepLinkSlug] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchPushData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/push-notifications");
      const data = await res.json();
      if (data && Array.isArray(data.logs)) {
        setLogs(data.logs);
        setTotalDevices(data.totalDevices || 0);
      }
    } catch (err: unknown) {
      console.error("Gagal mengambil data push notifikasi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPushData();
  }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast("Judul dan pesan notifikasi wajib diisi", "error");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/push-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          target: target.trim(),
          deepLinkSlug: deepLinkSlug.trim() || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error || "Gagal mengirim notifikasi");
      }

      if (result.warning) {
        showToast(`⚠️ ${result.warning}`, "error");
      } else {
        showToast(`✅ Berhasil mengirim notifikasi ke ${result.sentCount ?? 0} perangkat!`);
      }

      // Reset form & reload data
      setTitle("");
      setMessage("");
      setDeepLinkSlug("");
      fetchPushData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat mengirim notifikasi";
      showToast(errMsg, "error");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold border animate-in slide-in-from-right ${
            toast.type === "success"
              ? "bg-[#0c1815] border-emerald-900/60 text-emerald-200"
              : "bg-red-950/80 border-red-900/60 text-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <BellRing className="text-[#D4A843]" size={24} />
            Push Notifikasi
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Kirim notifikasi tingkat OS (FCM) langsung ke smartphone pembaca Novesia.
          </p>
        </div>

        <button
          onClick={fetchPushData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Info Callout Banner (Gaya Komiku) */}
      <div className="rounded-xl p-4 bg-[#B99762]/10 border border-[#B99762]/30 flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-[#B99762]/20 text-[#e6ca91] mt-0.5 shrink-0">
          <Info size={18} />
        </div>
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-[#e6ca91]">Push notification OS-level ASLI</span> (muncul di atas layar HP kayak notifikasi pada umumnya) — beda dari &quot;Notifikasi&quot; (itu banner in-app doang). Di sini buat kirim MANUAL ke semua device pembaca atau target spesifik.
        </div>
      </div>

      {/* Stats Counter Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#0e1117] border border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-400">Total Device Terdaftar</div>
            <div className="text-2xl font-bold text-[#e6ca91]">{totalDevices}</div>
            <div className="text-[11px] text-slate-500">Perangkat Android aktif siap menerima broadcast</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#B99762]/10 border border-[#B99762]/20 flex items-center justify-center text-[#e6ca91]">
            <Smartphone size={24} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1117] border border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-400">Total Broadcast Dikirim</div>
            <div className="text-2xl font-bold text-slate-100">{logs.length}</div>
            <div className="text-[11px] text-slate-500">Riwayat pengiriman tersimpan di log server</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* Form Kirim Push Notifikasi */}
      <div className="p-5 rounded-xl bg-[#0e1117] border border-white/5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Send size={15} className="text-[#D4A843]" />
          Kirim Notifikasi Baru
        </h2>

        <form onSubmit={handleSend} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Judul</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="mis. Promo VIP Akhir Bulan!"
              className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#B99762]/60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Pesan</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Isi notifikasi yang tampil ke user..."
              className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#B99762]/60 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Target</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#B99762]/60 cursor-pointer"
              >
                <option value="ALL">Semua device (broadcast)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Buka novel tertentu pas di-tap (opsional)
              </label>
              <input
                type="text"
                value={deepLinkSlug}
                onChange={(e) => setDeepLinkSlug(e.target.value)}
                placeholder="slug-novel (kosongkan kalau gak perlu)"
                className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#B99762]/60"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#D4A843] to-[#8C6D3B] hover:brightness-110 text-black flex items-center gap-2 transition cursor-pointer shadow-lg disabled:opacity-50"
            >
              <Send size={14} />
              {sending ? "Mengirim Notifikasi…" : "Kirim Notifikasi"}
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Riwayat Notifikasi */}
      <div className="p-5 rounded-xl bg-[#0e1117] border border-white/5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Clock size={15} className="text-slate-400" />
          Riwayat Notifikasi
        </h2>

        {logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            Belum ada riwayat broadcast notifikasi manual.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Notifikasi</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Terkirim</th>
                  <th className="py-3 px-4">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4 space-y-1">
                      <div className="font-bold text-slate-100">{log.title}</div>
                      <div className="text-slate-400 text-[11px] leading-relaxed max-w-md">
                        {log.message}
                      </div>
                      {log.deepLinkSlug && (
                        <div className="text-[10px] text-[#e6ca91] flex items-center gap-1">
                          <ExternalLink size={10} />
                          Buka: {log.deepLinkSlug}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                        {log.target === "ALL" ? "Broadcast" : log.target}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#e6ca91]">
                        {log.sentCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {formatDate(log.createdAt)}
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
