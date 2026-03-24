"use client";

import { useState } from "react";
import { Loader2, Play, Globe, FileText } from "lucide-react";

interface Chapter {
  id: string;
  chapter_number: number;
  chapter_title: string | null;
  translation_status: string;
}

export default function TranslatePanel({
  novelId,
  novelSlug,
  chapters,
}: {
  novelId: string;
  novelSlug: string;
  chapters: Chapter[];
}) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [chapterNum, setChapterNum] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTranslate = async () => {
    if (!sourceUrl.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const resp = await fetch("/api/translate/chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novelId,
          chapterNumber: chapterNum,
          sourceUrl: sourceUrl.trim(),
        }),
      });
      const data = await resp.json();
      setResult({
        success: data.success,
        message: data.success
          ? `Chapter ${chapterNum} berhasil diterjemahkan! (${data.wordCount} kata)`
          : `Gagal: ${data.error}`,
      });
      if (data.success) {
        setChapterNum((prev) => prev + 1);
        setSourceUrl("");
      }
    } catch {
      setResult({ success: false, message: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold">Terjemahkan Chapter</h2>
      </div>
      
      <p className="text-xs text-gray-500">
        Paste URL halaman chapter dari situs translator (bukan NovelUpdates). Sistem akan scrape konten, terjemahkan via Groq AI, lalu simpan ke database.
      </p>

      <div className="grid grid-cols-[100px_1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Chapter #</label>
          <input
            type="number"
            value={chapterNum}
            onChange={(e) => setChapterNum(parseInt(e.target.value) || 1)}
            min={1}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">URL Halaman Chapter</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://translator-site.com/novel/chapter-1/"
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
            onKeyDown={(e) => e.key === "Enter" && handleTranslate()}
          />
        </div>
        <button
          onClick={handleTranslate}
          disabled={loading || !sourceUrl.trim()}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {loading ? "Translating..." : "Translate"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`p-3 rounded-xl text-sm ${
          result.success
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
            : "bg-red-500/10 border border-red-500/20 text-red-300"
        }`}>
          {result.message}
        </div>
      )}
    </div>
  );
}
