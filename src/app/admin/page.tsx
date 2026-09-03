import { supabase } from "@/lib/supabase";
import {
  BookOpen,
  Layers,
  Tags,
  Languages,
  Clock,
  PlayCircle,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface NovelItem {
  id: string;
  nu_slug: string;
  title: string;
  total_chapters: number;
  status: string | null;
  genres: string[] | null;
  total_views?: number;
  created_at: string;
  updated_at?: string;
}

async function getStats() {
  const [novelsRes, translatedRes] = await Promise.all([
    supabase
      .from("nu_novels")
      .select("id, nu_slug, total_chapters, title, cover_url, genres, rating, created_at, updated_at, status, total_views")
      .order("updated_at", { ascending: false }),
    supabase
      .from("nu_chapter_content")
      .select("id", { count: "exact", head: true })
      .not("content_translated", "is", null),
  ]);

  const novels: NovelItem[] = novelsRes.data || [];
  const totalNovels = novels.length;
  const totalChapters = novels.reduce((sum, n) => sum + (n.total_chapters || 0), 0);
  const totalTranslated = translatedRes.count || 0;
  const totalViews = novels.reduce((sum, n) => sum + (n.total_views || 0), 0);

  // Genre counts
  const genreMap: Record<string, number> = {};
  novels.forEach((n) => {
    (n.genres || []).forEach((g) => {
      const trimmed = g.trim();
      if (trimmed && trimmed.toLowerCase() !== "general") {
        genreMap[trimmed] = (genreMap[trimmed] || 0) + 1;
      }
    });
  });
  const totalGenres = Object.keys(genreMap).length;
  const topGenres = Object.entries(genreMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Status breakdown
  const statusCounts: Record<string, number> = {
    ONGOING: 0,
    COMPLETED: 0,
    HIATUS: 0,
    DROPPED: 0,
  };

  novels.forEach((n) => {
    const s = (n.status || "").toUpperCase();
    if (s.includes("COMPLET")) {
      statusCounts.COMPLETED++;
    } else if (s.includes("HIATUS")) {
      statusCounts.HIATUS++;
    } else if (s.includes("DROP")) {
      statusCounts.DROPPED++;
    } else {
      statusCounts.ONGOING++;
    }
  });

  const pendingChapters = Math.max(0, totalChapters - totalTranslated);

  return {
    totalNovels,
    totalChapters,
    totalTranslated,
    totalGenres,
    totalViews,
    pendingChapters,
    statusCounts,
    topGenres,
    recentNovels: novels.slice(0, 10),
  };
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="bg-[#12151b] border border-white/5 rounded-xl p-4 flex items-center gap-3.5 hover:border-white/10 transition-colors">
      <div className="shrink-0 rounded-lg bg-amber-400/10 border border-amber-400/20 w-10 h-10 flex items-center justify-center">
        <Icon size={18} className="text-amber-400" />
      </div>
      <div className="min-w-0">
        <span className="text-xs sm:text-sm text-slate-400 font-medium">{label}</span>
        <div className="font-bold tracking-tight text-xl sm:text-2xl text-slate-100 mt-0.5 font-mono">
          {value}
        </div>
        {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#12151b] border border-white/5 rounded-xl p-5 ${className}`}>{children}</div>;
}

export default async function DashboardPage() {
  const {
    totalNovels,
    totalChapters,
    totalTranslated,
    totalGenres,
    totalViews,
    pendingChapters,
    statusCounts,
    topGenres,
    recentNovels,
  } = await getStats();

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ═══ 8 StatCards Grid (Komiku Style) ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="Novel" value={totalNovels.toLocaleString()} />
        <StatCard icon={Layers} label="Chapter" value={totalChapters.toLocaleString()} />
        <StatCard icon={Tags} label="Genre" value={totalGenres.toLocaleString()} />
        <StatCard
          icon={Languages}
          label="Chapter Diterjemahkan"
          value={totalTranslated.toLocaleString()}
          sub={`${totalChapters.toLocaleString()} total, ${pendingChapters.toLocaleString()} pending`}
        />
        <StatCard
          icon={Clock}
          label="Belum Diterjemahkan"
          value={pendingChapters.toLocaleString()}
          sub="pending terjemahan AI"
        />
        <StatCard icon={PlayCircle} label="Novel Ongoing" value={statusCounts.ONGOING.toLocaleString()} />
        <StatCard icon={CheckCircle2} label="Novel Completed" value={statusCounts.COMPLETED.toLocaleString()} />
        <StatCard
          icon={TrendingUp}
          label="Total Views"
          value={totalViews.toLocaleString()}
          sub="akumulasi pembaca"
        />
      </div>

      {/* ═══ Breakdown Grid (2 Columns) ═══ */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Novel per Status */}
        <Card>
          <h2 className="font-semibold mb-3 text-slate-100 text-sm">Novel per Status</h2>
          <div className="space-y-1">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div
                key={status}
                className="flex justify-between items-center text-sm py-2 border-b border-white/5 last:border-0"
              >
                <span className="text-slate-300 font-medium">{status}</span>
                <span className="font-mono font-semibold text-slate-100">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Novel per Kategori / Genre */}
        <Card>
          <h2 className="font-semibold mb-3 text-slate-100 text-sm">Novel per Kategori</h2>
          <div className="space-y-1">
            {topGenres.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">Belum ada kategori terdata.</p>
            ) : (
              topGenres.map(([genre, count]) => (
                <div
                  key={genre}
                  className="flex justify-between items-center text-sm py-2 border-b border-white/5 last:border-0"
                >
                  <span className="text-slate-300 font-medium">{genre}</span>
                  <span className="font-mono font-semibold text-slate-100">{count}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ═══ 10 Novel Terbaru Diupdate ═══ */}
      <Card>
        <h2 className="font-semibold mb-3 text-slate-100 text-sm">10 Novel Terbaru Diupdate</h2>
        <div className="space-y-0.5">
          {recentNovels.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Belum ada novel di katalog.</p>
          ) : (
            recentNovels.map((novel) => {
              const dateStr = novel.updated_at || novel.created_at;
              return (
                <Link
                  key={novel.id}
                  href={`/admin/novels/${novel.nu_slug}`}
                  className="flex justify-between items-center text-sm py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <span className="text-slate-200 group-hover:text-amber-300 transition-colors font-medium truncate max-w-[65%]">
                    {novel.title}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400 text-xs shrink-0 font-mono">
                    {new Date(dateStr).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                    <ChevronRight
                      size={14}
                      className="text-slate-600 group-hover:text-amber-400 transition-colors ml-1"
                    />
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
