import { supabase } from "@/lib/supabase";
import { ScrollText, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

async function getLogs() {
  const { data } = await supabase
    .from("nu_scrape_log")
    .select("*")
    .order("scraped_at", { ascending: false })
    .limit(50);
  return data || [];
}

export default async function LogsPage() {
  const logs = await getLogs();

  const statusIcon = (status: string) => {
    if (status === "success") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (status === "partial") return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Log Scraping
        </h1>
        <p className="text-gray-500 mt-1">History scraping — {logs.length} log</p>
      </div>

      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="w-12 h-12 text-gray-700 mx-auto" />
            <p className="text-gray-500 mt-4">Belum ada log scraping.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800/50 bg-gray-900/50">
                  <th className="text-left py-4 px-4">Novel</th>
                  <th className="text-center py-4">Status</th>
                  <th className="text-right py-4">Chapter</th>
                  <th className="text-right py-4">Durasi</th>
                  <th className="text-left py-4 px-4">Error</th>
                  <th className="text-right py-4 px-4">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-800/20 hover:bg-gray-800/20 transition-colors">
                    <td className="py-3 px-4 font-medium">{log.nu_slug}</td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {statusIcon(log.status)}
                        <span className={`text-xs font-medium ${
                          log.status === "success" ? "text-emerald-400" :
                          log.status === "partial" ? "text-amber-400" : "text-red-400"
                        }`}>{log.status}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-gray-400">{log.chapters_found}</td>
                    <td className="py-3 text-right text-gray-400">{log.duration_sec?.toFixed(1)}s</td>
                    <td className="py-3 px-4 text-gray-500 text-xs max-w-48 truncate">{log.error_message || "—"}</td>
                    <td className="py-3 px-4 text-right text-gray-500 text-xs whitespace-nowrap">
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
