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
    <div className="bg-[#12151b] border border-white/5 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-bold text-slate-100">Terjemahkan Chapter</h2>
      </div>
      
      <p className="text-xs text-slate-400">
        Paste URL halaman chapter dari situs translator (bukan NovelUpdates). Sistem akan scrape konten, terjemahkan via AI, lalu simpan ke database.
      </p>

      <div className="grid grid-cols-[100px_1fr_auto] gap-2.5 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Chapter #</label>
          <input
            type="number"
            value={chapterNum}
            onChange={(e) => setChapterNum(parseInt(e.target.value) || 1)}
            min={1}
            className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/70 transition-all font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">URL Halaman Chapter</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://translator-site.com/novel/chapter-1/"
            className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/70 transition-all"
            onKeyDown={(e) => e.key === "Enter" && handleTranslate()}
          />
        </div>
        <button
          onClick={handleTranslate}
          disabled={loading || !sourceUrl.trim()}
          className="px-4 py-2 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-bold text-slate-950 shadow-[0_2px_12px_-2px_rgba(221,168,58,0.45)] transition-all flex items-center gap-1.5 cursor-pointer"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          <span>{loading ? "Translating..." : "Translate"}</span>
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`p-3 rounded-lg text-xs font-medium ${
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
