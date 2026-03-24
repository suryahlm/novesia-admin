"use client";

import { useState } from "react";
import { Search, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface ScrapeResult {
  success: boolean;
  title?: string;
  slug?: string;
  genres?: string[];
  rating?: number;
  totalChapters?: number;
  coverUrl?: string;
  error?: string;
}

export default function NewNovelPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  const handleScrape = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const resp = await fetch("/api/scrape/novel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await resp.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Tambah Novel
        </h1>
        <p className="text-gray-500 mt-1">Paste URL novel dari NovelUpdates untuk scraping</p>
      </div>

      {/* Input */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 space-y-4">
        <label className="block text-sm font-medium text-gray-400">URL Novel</label>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.novelupdates.com/series/solo-leveling/"
            className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            onKeyDown={(e) => e.key === "Enter" && handleScrape()}
          />
          <button
            onClick={handleScrape}
            disabled={loading || !url.trim()}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl text-sm font-semibold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {loading ? "Scraping..." : "Scrape"}
          </button>
        </div>
        <p className="text-xs text-gray-600">
          Sumber yang didukung: NovelUpdates (novelupdates.com)
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto" />
          <p className="text-violet-300 mt-3 font-medium">Sedang scraping...</p>
          <p className="text-violet-400/60 text-sm mt-1">Mengambil metadata via ScraperAPI + upload cover ke R2</p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className={`border rounded-2xl p-6 ${
          result.success
            ? "bg-emerald-500/5 border-emerald-500/20"
            : "bg-red-500/5 border-red-500/20"
        }`}>
          {result.success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Berhasil!</span>
              </div>
              <div className="flex gap-4">
                {result.coverUrl && (
                  <img src={result.coverUrl} alt={result.title} className="w-24 h-32 object-cover rounded-xl shadow-lg" />
                )}
                <div className="space-y-2">
                  <h3 className="text-lg font-bold">{result.title}</h3>
                  <p className="text-sm text-gray-400">
                    {result.totalChapters} chapter • {(result.genres || []).slice(0, 4).join(", ")}
                  </p>
                  {result.rating && (
                    <p className="text-sm text-amber-400">★ {result.rating}</p>
                  )}
                  <p className="text-xs text-gray-500">Slug: {result.slug}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Gagal: {result.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
