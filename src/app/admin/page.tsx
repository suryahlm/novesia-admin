import { supabase } from "@/lib/supabase";
import { Library, BookOpen, Languages, Clock } from "lucide-react";

async function getStats() {
  const [novels, logs] = await Promise.all([
    supabase.from("nu_novels").select("id, total_chapters, title, cover_url, genres, rating, created_at").order("created_at", { ascending: false }),
    supabase.from("nu_scrape_log").select("*").order("scraped_at", { ascending: false }).limit(5),
  ]);
  
  const novelList = novels.data || [];
  const totalNovels = novelList.length;
  const totalChapters = novelList.reduce((sum, n) => sum + (n.total_chapters || 0), 0);
  const recentLogs = logs.data || [];
  
  return { totalNovels, totalChapters, novelList, recentLogs };
}

export default async function DashboardPage() {
  const { totalNovels, totalChapters, novelList, recentLogs } = await getStats();
  
  const stats = [
    { label: "Total Novel", value: totalNovels, icon: Library, color: "from-violet-500 to-indigo-500", shadow: "shadow-violet-500/20" },
    { label: "Total Chapter", value: totalChapters.toLocaleString(), icon: BookOpen, color: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/20" },
    { label: "Terjemahan", value: "0", icon: Languages, color: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/20" },
    { label: "Scrape Terakhir", value: recentLogs.length > 0 ? "Hari ini" : "–", icon: Clock, color: "from-rose-500 to-pink-500", shadow: "shadow-rose-500/20" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-500 mt-1">Selamat datang di Novesia Admin Portal</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 hover:border-gray-700/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadow}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Novels */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Novel Terbaru</h2>
        {novelList.length === 0 ? (
          <p className="text-gray-500 text-sm">Belum ada novel. Mulai dengan menambahkan novel baru.</p>
        ) : (
          <div className="space-y-3">
            {novelList.slice(0, 5).map((novel) => (
              <div key={novel.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-800/30 transition-colors">
                {novel.cover_url ? (
                  <img src={novel.cover_url} alt={novel.title} className="w-12 h-16 object-cover rounded-lg" />
                ) : (
                  <div className="w-12 h-16 bg-gray-800 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{novel.title}</p>
                  <p className="text-xs text-gray-500">{novel.total_chapters} chapter • {(novel.genres || []).slice(0, 3).join(", ")}</p>
                </div>
                {novel.rating && (
                  <div className="text-sm font-medium text-amber-400">★ {novel.rating}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Scrape Logs */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Log Scraping Terbaru</h2>
        {recentLogs.length === 0 ? (
          <p className="text-gray-500 text-sm">Belum ada log scraping.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800/50">
                  <th className="text-left py-3 px-2">Novel</th>
                  <th className="text-center py-3">Status</th>
                  <th className="text-right py-3 px-2">Durasi</th>
                  <th className="text-right py-3 px-2">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                    <td className="py-3 px-2 font-medium">{log.nu_slug}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.status === "success" ? "bg-emerald-500/15 text-emerald-400" :
                        log.status === "partial" ? "bg-amber-500/15 text-amber-400" :
                        "bg-red-500/15 text-red-400"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-gray-400">{log.duration_sec?.toFixed(1)}s</td>
                    <td className="py-3 px-2 text-right text-gray-500 text-xs">
                      {new Date(log.scraped_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
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
