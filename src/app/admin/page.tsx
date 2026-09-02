import { supabase } from "@/lib/supabase";
import {
  Library,
  BookOpen,
  Languages,
  Clock,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  Zap,
  Activity,
  ChevronRight,
  Layers,
} from "lucide-react";
import Link from "next/link";

async function getStats() {
  const [novels, logs, translatedChs] = await Promise.all([
    supabase
      .from("nu_novels")
      .select("id, nu_slug, total_chapters, title, cover_url, genres, rating, created_at, status")
      .order("created_at", { ascending: false }),
    supabase.from("nu_scrape_log").select("*").order("scraped_at", { ascending: false }).limit(6),
    supabase
      .from("nu_chapter_content")
      .select("id", { count: "exact", head: true })
      .not("content_translated", "is", null),
  ]);

  const novelList = novels.data || [];
  const totalNovels = novelList.length;
  const totalChapters = novelList.reduce((sum, n) => sum + (n.total_chapters || 0), 0);
  const totalTranslated = translatedChs.count || 0;
  const recentLogs = logs.data || [];

  return { totalNovels, totalChapters, totalTranslated, novelList, recentLogs };
}

export default async function DashboardPage() {
  const { totalNovels, totalChapters, totalTranslated, novelList, recentLogs } = await getStats();

  const stats = [
    {
      label: "Koleksi Novel",
      value: totalNovels.toLocaleString(),
      sub: "Judul terdaftar",
      icon: Library,
      gradient: "from-violet-600 via-indigo-600 to-purple-600",
      glow: "rgba(139, 92, 246, 0.25)",
      border: "border-violet-500/20",
    },
    {
      label: "Total Chapter",
      value: totalChapters.toLocaleString(),
      sub: "Konten original terarsip",
      icon: BookOpen,
      gradient: "from-cyan-600 via-teal-600 to-emerald-600",
      glow: "rgba(20, 184, 166, 0.25)",
      border: "border-teal-500/20",
    },
    {
      label: "Chapter Diterjemahkan",
      value: totalTranslated.toLocaleString(),
      sub: "Gemini 3.7 Flash AI",
      icon: Languages,
      gradient: "from-amber-500 via-orange-600 to-yellow-600",
      glow: "rgba(245, 158, 11, 0.25)",
      border: "border-amber-500/20",
    },
    {
      label: "Status Mesin Scraping",
      value: "Ready",
      sub: "ScraperAPI + Guts AI Active",
      icon: Zap,
      gradient: "from-rose-600 via-pink-600 to-fuchsia-600",
      glow: "rgba(244, 63, 94, 0.25)",
      border: "border-rose-500/20",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* ═══ Hero Studio Banner ═══ */}
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-[#111728] via-[#0d1322] to-[#15122a] border border-white/[0.08] shadow-2xl shadow-black/80">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Novesia Royal Studio
            </div>
            <h1
              className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Executive Command Studio
            </h1>
            <p className="text-slate-400 text-sm max-w-xl leading-relaxed font-medium">
              Kelola katalog novel, terjemahkan ribuan chapter dengan Gemini 3.7 Flash, dan pantau
              scraping secara realtime dalam satu pusat kendali premium.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/novels"
              className="px-5 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.12] text-slate-200 text-xs font-bold transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Library className="w-4 h-4 text-violet-400" />
              <span>Buka Katalog</span>
            </Link>
            <Link
              href="/admin/novels/new"
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xl shadow-violet-500/30 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>+ Tambah Novel Baru</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ 4 Luxury KPI Metric Cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`relative overflow-hidden rounded-2xl p-6 bg-[#0c101c]/70 backdrop-blur-xl border ${stat.border} shadow-xl shadow-black/40 hover:translate-y-[-2px] transition-all duration-300 group`}
              style={{
                boxShadow: `0 10px 30px -10px ${stat.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400">{stat.label}</span>
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shadow-lg shadow-black/30 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-1">
                <p
                  className="text-3xl font-extrabold text-white tracking-tight"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {stat.value}
                </p>
                <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {stat.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ Content Grid: Recent Showcase & Activity ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Novel Terbaru Showcase */}
        <div className="lg:col-span-2 rounded-3xl p-6 bg-[#0c101c]/70 backdrop-blur-xl border border-white/[0.07] shadow-xl shadow-black/50 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Novel Terbaru di Katalog</h2>
                <p className="text-xs text-slate-400 font-medium">Update & publikasi terbaru</p>
              </div>
            </div>
            <Link
              href="/admin/novels"
              className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {novelList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Belum ada novel di katalog. Klik &quot;+ Tambah Novel&quot; untuk mulai.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {novelList.slice(0, 6).map((novel) => (
                <Link
                  key={novel.id}
                  href={`/admin/novels/${novel.nu_slug}`}
                  className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] hover:border-violet-500/30 transition-all duration-200 flex items-center gap-3.5 group"
                >
                  <div className="w-14 h-20 rounded-xl overflow-hidden bg-slate-800 shrink-0 shadow-md relative border border-white/[0.08]">
                    {novel.cover_url ? (
                      <img
                        src={novel.cover_url}
                        alt={novel.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <BookOpen className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-200 group-hover:text-violet-300 transition-colors truncate">
                      {novel.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {novel.total_chapters || 0} Chapter
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(novel.genres || []).slice(0, 2).map((g: string) => (
                        <span
                          key={g}
                          className="px-2 py-0.5 rounded text-[9px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Live Scraping & Translate Log */}
        <div className="rounded-3xl p-6 bg-[#0c101c]/70 backdrop-blur-xl border border-white/[0.07] shadow-xl shadow-black/50 space-y-5 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Aktivitas Scraping</h2>
                <p className="text-xs text-slate-400 font-medium">Log sync otomatis</p>
              </div>
            </div>
            <Link
              href="/admin/logs"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
            >
              <span>Logs</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 space-y-3">
            {recentLogs.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center">Belum ada riwayat scraping.</p>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-200 truncate">{log.nu_slug}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      {new Date(log.scraped_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      • {log.duration_sec ? `${log.duration_sec.toFixed(1)}s` : "–"}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      log.status === "success"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : log.status === "partial"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "bg-red-500/15 text-red-400 border border-red-500/30"
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
