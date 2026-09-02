"use client";

import { useState } from "react";
import {
  Server,
  Globe,
  BookOpen,
  Cpu,
  CheckCircle2,
  Loader2,
  PlayCircle,
  Fingerprint,
  Zap,
  Activity,
  ShieldAlert,
} from "lucide-react";

type SourceKey = "novelworld" | "talesinthevalley" | "98novels" | "tinytranslation";

export default function UpdateScrapingPage() {
  const [isHovered, setIsHovered] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<SourceKey | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const scrapers: {
    id: SourceKey;
    name: string;
    icon: any;
    color: string;
    shadow: string;
    border: string;
    desc: string;
  }[] = [
    {
      id: "98novels",
      name: "98Novels Engine",
      icon: Fingerprint,
      color: "from-blue-500 via-indigo-500 to-cyan-400",
      shadow: "shadow-blue-500/20",
      border: "hover:border-blue-500/40",
      desc: "Autopilot Cron. Aktif menarik novel dengan pengenalan HTML cerdas dan aset terenkripsi ke Cloudflare R2.",
    },
    {
      id: "talesinthevalley",
      name: "TITV Protocol",
      icon: Globe,
      color: "from-emerald-500 via-teal-500 to-green-400",
      shadow: "shadow-emerald-500/20",
      border: "hover:border-emerald-500/40",
      desc: "Menangani sumber TalesInTheValley. Ekstraksi mulus bypass proteksi batas koneksi Cloudflare.",
    },
    {
      id: "novelworld",
      name: "NovelWorld Scraper",
      icon: BookOpen,
      color: "from-violet-500 via-purple-500 to-pink-400",
      shadow: "shadow-violet-500/20",
      border: "hover:border-violet-500/40",
      desc: "Pemrosesan masif untuk direktori Novelworld dengan multi-thread parser terorganisir.",
    },
    {
      id: "tinytranslation",
      name: "TinyTranslation Sync",
      icon: CheckCircle2,
      color: "from-amber-500 via-orange-500 to-yellow-400",
      shadow: "shadow-amber-500/20",
      border: "hover:border-amber-500/40",
      desc: "Sinkronisasi delta update eksklusif untuk TinyTranslation dengan penghematan bandwidth tinggi.",
    },
  ];

  const handleTrigger = async (sourceId: SourceKey) => {
    setTriggering(sourceId);
    setToastMsg(null);

    try {
      const res = await fetch("/api/scraper/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: sourceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menghubungi server tujuan.");
      }

      setToastMsg({ text: data.message, isError: false });
    } catch (err: any) {
      setToastMsg({ text: err.message, isError: true });
    } finally {
      setTimeout(() => setTriggering(null), 1000);
      setTimeout(() => setToastMsg(null), 8000);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-500 relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-8 right-8 z-50 p-5 rounded-2xl shadow-2xl border flex items-start gap-4 max-w-md transition-all duration-300 animate-in slide-in-from-bottom-5 backdrop-blur-2xl ${
            toastMsg.isError
              ? "bg-[#220d11]/95 border-rose-500/40 text-rose-200"
              : "bg-[#0b1b17]/95 border-emerald-500/40 text-emerald-100"
          }`}
        >
          {toastMsg.isError ? (
            <Server className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs font-semibold leading-relaxed">{toastMsg.text}</div>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-7 bg-[#0c101c]/80 backdrop-blur-2xl border border-white/[0.08] shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-md">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1
              className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Pusat Kendali Eksekusi Scraping
            </h1>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">
              Jalankan scraper secara instan di background server tanpa harus menunggu jadwal cron
              otomatis.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scrapers.map((sc) => {
          const Icon = sc.icon;
          const isBusy = triggering === sc.id;

          return (
            <div
              key={sc.id}
              className={`p-7 rounded-3xl border border-white/[0.08] ${sc.border} transition-all duration-300 backdrop-blur-2xl bg-[#0c101c]/70 relative overflow-hidden group shadow-xl shadow-black/40 flex flex-col justify-between`}
              onMouseEnter={() => setIsHovered(sc.id)}
              onMouseLeave={() => setIsHovered(null)}
            >
              {/* Glow overlay */}
              <div
                className={`absolute -right-20 -top-20 w-48 h-48 bg-gradient-to-br ${sc.color} rounded-full blur-[90px] opacity-15 group-hover:opacity-30 transition-opacity`}
              />

              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-13 h-13 rounded-2xl flex items-center justify-center bg-white/[0.03] border border-white/[0.08] shadow-inner">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{sc.name}</h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Daemon Service
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-medium">{sc.desc}</p>
              </div>

              <div className="relative z-10 pt-6 mt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => handleTrigger(sc.id)}
                  disabled={triggering !== null}
                  className={`w-full py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-extrabold transition-all duration-300 cursor-pointer shadow-lg ${
                    isBusy
                      ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                      : `bg-gradient-to-r ${sc.color} text-white hover:scale-[1.02] active:scale-[0.98] ${sc.shadow}`
                  } disabled:opacity-50`}
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Menjalankan Background Process...</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      <span>Jalankan Manual Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Decorative Architecture Note */}
      <div className="p-5 rounded-3xl bg-[#0c101c]/80 border border-white/[0.08] flex items-start gap-4 shadow-xl">
        <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
          <Server className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-400 leading-relaxed font-medium">
          <strong className="text-slate-200 font-bold">Catatan Arsitektur:</strong> Tombol di atas
          mengeksekusi background daemon process terpisah (
          <code className="font-mono text-violet-300 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">
            detached: true
          </code>
          ). Anda dapat menutup halaman ini kapan saja tanpa mengganggu scraping yang sedang
          berjalan.
        </div>
      </div>
    </div>
  );
}
