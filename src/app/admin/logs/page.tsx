"use client";

import { useState } from "react";
import { Server, Globe, BookOpen, Cpu, CheckCircle2, Loader2, PlayCircle, Fingerprint } from "lucide-react";

type SourceKey = "novelworld" | "talesinthevalley" | "98novels";

export default function UpdateScrapingPage() {
  const [isHovered, setIsHovered] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<SourceKey | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const scrapers: { id: SourceKey; name: string; icon: any; color: string; bg: string; desc: string }[] = [
    {
      id: "98novels",
      name: "98Novels Engine",
      icon: Fingerprint,
      color: "from-blue-400 to-cyan-400",
      bg: "bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40",
      desc: "Autopilot Cron. Aktif menarik puluhan novel dengan pengenalan HTML pintar dan CDN Novesia."
    },
    {
      id: "talesinthevalley",
      name: "TITV Protocol",
      icon: Globe,
      color: "from-emerald-400 to-teal-400",
      bg: "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40",
      desc: "Menangani sumber TalesInTheValley. Ekstraksi mulus Bypass batas limit koneksi Cloudflare."
    },
    {
      id: "novelworld",
      name: "NovelWorld Scraper",
      icon: BookOpen,
      color: "from-purple-400 to-pink-400",
      bg: "bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40",
      desc: "Pemrosesan masif untuk direktori Novelworld. Jadwal subuh dan sore."
    }
  ];

  const handleTrigger = async (sourceId: SourceKey) => {
    setTriggering(sourceId);
    setToastMsg(null);

    try {
      const res = await fetch("/api/scraper/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: sourceId })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghubungi server tujuan.");
      }

      setToastMsg({ text: data.message, isError: false });
    } catch (err: any) {
      setToastMsg({ text: err.message, isError: true });
    } finally {
      // Tunggu 1 dtk untuk sensasi "sedang mengeksekusi bash command"
      setTimeout(() => setTriggering(null), 1000);
      
      // Hapus toast setelah 8 dtk
      setTimeout(() => setToastMsg(null), 8000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed bottom-8 right-8 z-50 p-5 rounded-2xl shadow-2xl shadow-black/50 border flex items-start gap-4 max-w-sm transition-all duration-300 animate-in slide-in-from-bottom-5 ${
          toastMsg.isError ? "bg-red-950/80 border-red-500/30 text-red-200" : "bg-emerald-950/80 border-emerald-500/30 text-emerald-100"
        } backdrop-blur-xl`}>
          {toastMsg.isError ? <Server className="w-6 h-6 text-red-400 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />}
          <div className="text-sm font-medium leading-relaxed">{toastMsg.text}</div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
          <Cpu className="w-8 h-8 text-violet-400" />
          Update Scraping
        </h1>
        <p className="text-gray-400 mt-2 text-sm max-w-2xl">
          Pusat kendali eksekusi instan. Anda dapat memicu Scraper untuk langsung berjalan di <i>background</i> server VPS tanpa harus menunggu cron otomatis. Log pekerjaan akan otomatis di-broadcast via WhatsApp saat semua chapter tuntas.
        </p>
      </div>

      {/* Grid of Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {scrapers.map((sc) => {
          const Icon = sc.icon;
          const isBusy = triggering === sc.id;

          return (
            <div 
              key={sc.id}
              className={`p-6 rounded-3xl border transition-all duration-300 backdrop-blur-md relative overflow-hidden group ${sc.bg}`}
              onMouseEnter={() => setIsHovered(sc.id)}
              onMouseLeave={() => setIsHovered(null)}
            >
              {/* Glow overlay */}
              <div className={`absolute -right-20 -top-20 w-40 h-40 bg-gradient-to-br ${sc.color} rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity`} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-900/50 shadow-inner border border-gray-700/50`}>
                    <Icon className={`w-6 h-6 bg-gradient-to-br ${sc.color} text-transparent bg-clip-text`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-100">{sc.name}</h3>
                </div>
                
                <p className="text-sm text-gray-400 mb-8 leading-relaxed flex-1">
                  {sc.desc}
                </p>

                <button
                  onClick={() => handleTrigger(sc.id)}
                  disabled={triggering !== null} // Disable all while one is triggering
                  className={`w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all duration-300 overflow-hidden relative
                    ${isBusy 
                      ? "bg-gray-800 text-gray-400 cursor-not-allowed" 
                      : `bg-gradient-to-r ${sc.color} text-gray-950 hover:shadow-lg hover:shadow-[var(--tw-gradient-from)]/20 hover:scale-[1.02] active:scale-95`
                    } disabled:opacity-70`}
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Menjalankan Sistem...</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className={`w-5 h-5 transition-transform duration-300 ${isHovered === sc.id ? 'translate-x-1' : ''}`} />
                      <span>Jalankan Manual</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Decorative Warning Element */}
      <div className="mt-8 p-4 rounded-2xl bg-gray-800/30 border border-gray-700/30 flex items-start gap-4">
        <Server className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
        <div className="text-xs text-gray-400 leading-relaxed">
          <strong className="text-gray-300">Catatan Arsitektur:</strong> Tombol di atas menerapkan teknik <span className="font-mono text-gray-300 bg-gray-800 px-1 py-0.5 rounded">child_process.spawn()</span> dengan metode <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1 py-0.5 rounded">detached: true</span>. Artinya, saat Bapak mengklik eksekusinya, website tidak akan nge-<i>jam</i> atau <i>loading timeout</i>. Bapak bisa langsung menutup web ini dan beraktivitas seperti biasa karena Scraper VPS sudah lepas kandang bekerja secara mandiri di Node Process.
        </div>
      </div>
    </div>
  );
}
