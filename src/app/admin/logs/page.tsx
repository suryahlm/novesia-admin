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

type SourceKey = "novelworld" | "talesinthevalley" | "98novels" | "tinytranslation" | "cuttlefishreads";

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
      id: "cuttlefishreads",
      name: "Cuttlefish Engine",
      icon: Cpu,
      color: "from-amber-500 via-orange-500 to-yellow-400",
      shadow: "shadow-amber-500/20",
      border: "hover:border-amber-500/40",
      desc: "Menangani sumber CuttlefishReads. Ekstraksi Next.js RSC & HTML dengan Cloudflare R2 otomatis.",
    },
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
      color: "from-fuchsia-500 via-purple-500 to-indigo-400",
      shadow: "shadow-fuchsia-500/20",
      border: "hover:border-fuchsia-500/40",
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
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-start gap-3 max-w-md animate-in slide-in-from-bottom-5 backdrop-blur-md ${
            toastMsg.isError
              ? "bg-[#1f1013] border-red-900/60 text-red-200"
              : "bg-[#0c1815] border-emerald-900/60 text-emerald-200"
          }`}
        >
          {toastMsg.isError ? (
            <Server className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs leading-relaxed">{toastMsg.text}</div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          Pusat Kendali Scraping
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Jalankan scraper secara instan di background server tanpa harus menunggu jadwal cron otomatis.
        </p>
      </div>

      {/* Grid of Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scrapers.map((sc) => {
          const Icon = sc.icon;
          const isBusy = triggering === sc.id;

          return (
            <div
              key={sc.id}
              className="p-5 rounded-xl border border-white/5 bg-[#12151b] flex flex-col justify-between hover:border-amber-400/30 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-400/10 border border-amber-400/20 text-amber-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{sc.name}</h3>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      Daemon Service
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{sc.desc}</p>
              </div>

              <div className="pt-4 mt-3 border-t border-white/5">
                <button
                  onClick={() => handleTrigger(sc.id)}
                  disabled={triggering !== null}
                  className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    isBusy
                      ? "bg-[#0a0c10] text-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 shadow-[0_2px_12px_-2px_rgba(221,168,58,0.45)]"
                  } disabled:opacity-50`}
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      <span>Menjalankan Background Process...</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Jalankan Manual Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture Note */}
      <div className="p-4 rounded-xl bg-[#12151b] border border-white/5 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
          <Server className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-200">Catatan:</strong> Tombol di atas mengeksekusi background daemon process terpisah (
          <code className="font-mono text-amber-300 bg-white/5 px-1 py-0.5 rounded text-[11px]">
            detached: true
          </code>
          ). Anda dapat menutup halaman ini kapan saja tanpa mengganggu scraping yang sedang berjalan.
        </div>
      </div>
    </div>
  );
}
