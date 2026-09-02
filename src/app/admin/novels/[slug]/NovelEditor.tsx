"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  Wand2,
  Save,
  Rocket,
  X,
  Plus,
  Trash2,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Globe,
  Loader2,
  Search,
  Check,
  Sparkles,
  Zap,
  Square,
  Play,
  RotateCcw,
} from "lucide-react";

interface NovelEditorProps {
  novel: any;
}

interface Chapter {
  id: string;
  chapter_number: number;
  chapter_title: string | null;
  content_original: string | null;
  content_translated: string | null;
  word_count_original: number;
  word_count_translated: number;
  translation_status: string;
}

export default function NovelEditor({ novel: initialNovel }: NovelEditorProps) {
  const [novel, setNovel] = useState(initialNovel);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [translatingSynopsis, setTranslatingSynopsis] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [newGenre, setNewGenre] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Chapter Editor State
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chaptersExpanded, setChaptersExpanded] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [editOriginal, setEditOriginal] = useState("");
  const [editTranslated, setEditTranslated] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [savingChapter, setSavingChapter] = useState(false);
  const [translatingChapter, setTranslatingChapter] = useState(false);
  const [translatingChapterId, setTranslatingChapterId] = useState<string | null>(null);
  const [chapterSearch, setChapterSearch] = useState("");

  // Batch Translation State
  const [batchTranslating, setBatchTranslating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; chNum: number } | null>(null);
  const abortBatchRef = useRef(false);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  // === SAVE NOVEL ===
  const handleSave = async (publishStatus?: string) => {
    setSaving(true);
    try {
      const body: any = {
        title: novel.title,
        author: novel.author,
        genres: novel.genres,
        synopsis: novel.synopsis,
        synopsis_translated: novel.synopsis_translated,
        novel_type: novel.novel_type,
        original_status: novel.original_status,
      };

      if (publishStatus) {
        body.status = publishStatus;
      }

      const res = await fetch(`/api/novels/${novel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (publishStatus) {
        setNovel({ ...novel, ...body, status: publishStatus });
      }
      showMsg("ok", publishStatus === "active" ? "✅ Novel di-publish!" : "✅ Tersimpan!");
    } catch (e: any) {
      showMsg("err", e.message);
    } finally {
      setSaving(false);
    }
  };

  // === UPLOAD COVER ===
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("cover", file);

      const res = await fetch(`/api/novels/${novel.id}/cover`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setNovel({ ...novel, cover_url: data.cover_url, cover_r2_key: data.cover_r2_key });
      showMsg("ok", "✅ Cover berhasil diupload!");
    } catch (e: any) {
      showMsg("err", e.message);
    } finally {
      setUploading(false);
    }
  };

  // === AUTO GENERATE COVER AI ===
  const handleGenerateCover = async () => {
    setGeneratingCover(true);
    try {
      showMsg("ok", "🎨 Sedang membuat cover dengan AI FLUX, mohon tunggu sebentar...");
      const res = await fetch(`/api/novels/${novel.id}/cover/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal generate cover AI.");

      setNovel((prev: any) => ({
        ...prev,
        cover_url: data.cover_url,
        cover_r2_key: data.cover_r2_key,
      }));
      showMsg("ok", "🎉 Cover AI berhasil dibuat dan disimpan!");
    } catch (e: any) {
      showMsg("err", e.message);
    } finally {
      setGeneratingCover(false);
    }
  };

  // === AUTO GENERATE GENRE ===
  const handleGenerateGenre = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/novels/generate-genre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: novel.title, synopsis: novel.synopsis }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setNovel({ ...novel, genres: data.genres });
      showMsg("ok", `✅ Genre di-generate: ${data.genres.join(", ")}`);
    } catch (e: any) {
      showMsg("err", e.message);
    } finally {
      setGenerating(false);
    }
  };

  // === GENRE MANAGEMENT ===
  const removeGenre = (genre: string) => {
    setNovel({ ...novel, genres: (novel.genres || []).filter((g: string) => g !== genre) });
  };

  const addGenre = () => {
    if (newGenre.trim() && !(novel.genres || []).includes(newGenre.trim())) {
      setNovel({ ...novel, genres: [...(novel.genres || []), newGenre.trim()] });
      setNewGenre("");
    }
  };

  // === LOAD CHAPTERS ===
  const loadChapters = async () => {
    if (chapters.length > 0) return; // Already loaded
    setChaptersLoading(true);
    try {
      const res = await fetch(`/api/chapters/${novel.id}`);
      const data = await res.json();
      setChapters(data.chapters || []);
    } catch (e) {
      showMsg("err", "Gagal memuat chapter");
    } finally {
      setChaptersLoading(false);
    }
  };

  const toggleChapters = () => {
    const next = !chaptersExpanded;
    setChaptersExpanded(next);
    if (next) loadChapters();
  };

  // === SELECT CHAPTER ===
  const selectChapter = (ch: Chapter) => {
    setSelectedChapter(ch);
    setEditOriginal(ch.content_original || "");
    setEditTranslated(ch.content_translated || "");
    setEditTitle(ch.chapter_title || "");
  };

  // === SAVE CHAPTER ===
  const handleSaveChapter = async () => {
    if (!selectedChapter) return;
    setSavingChapter(true);
    try {
      const res = await fetch(`/api/chapters/${novel.id}/${selectedChapter.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_original: editOriginal,
          content_translated: editTranslated,
          chapter_title: editTitle,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Update local state
      setChapters((prev) =>
        prev.map((ch) =>
          ch.id === selectedChapter.id
            ? {
                ...ch,
                content_original: editOriginal,
                content_translated: editTranslated,
                chapter_title: editTitle,
                word_count_original: editOriginal.split(/\s+/).filter(Boolean).length,
                word_count_translated: editTranslated.split(/\s+/).filter(Boolean).length,
                translation_status: editTranslated.trim() ? "done" : "pending",
              }
            : ch
        )
      );

      showMsg("ok", `✅ Chapter ${selectedChapter.chapter_number} tersimpan!`);
    } catch (e: any) {
      showMsg("err", e.message);
    } finally {
      setSavingChapter(false);
    }
  };

  // === TRANSLATE SYNOPSIS ===
  const handleTranslateSynopsis = async () => {
    if (!novel.synopsis || !novel.synopsis.trim()) {
      showMsg("err", "Sinopsis original masih kosong");
      return;
    }
    setTranslatingSynopsis(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: novel.synopsis,
          type: "synopsis",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menerjemahkan sinopsis");
      }
      setNovel({ ...novel, synopsis_translated: data.translatedText });
      showMsg("ok", "✨ Sinopsis berhasil diterjemahkan!");
    } catch (e: any) {
      showMsg("err", e.message);
    } finally {
      setTranslatingSynopsis(false);
    }
  };

  // === TRANSLATE CURRENT CHAPTER ===
  const handleTranslateCurrentChapter = async () => {
    if (!editOriginal || !editOriginal.trim()) {
      showMsg("err", "Konten original chapter masih kosong");
      return;
    }
    setTranslatingChapter(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: editOriginal,
          type: "chapter",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menerjemahkan chapter");
      }
      setEditTranslated(data.translatedText);
      showMsg("ok", `✨ Chapter ${selectedChapter?.chapter_number || ""} berhasil diterjemahkan!`);
    } catch (e: any) {
      showMsg("err", e.message);
    } finally {
      setTranslatingChapter(false);
    }
  };

  // === TRANSLATE SINGLE CHAPTER FROM LIST ===
  const handleTranslateSingleChapter = async (ch: Chapter, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!ch.content_original || ch.content_original.trim().length < 20) {
      showMsg("err", `Konten original Ch. ${ch.chapter_number} masih kosong.`);
      return;
    }

    setTranslatingChapterId(ch.id);
    selectChapter(ch);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: ch.content_original,
          type: "chapter",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.translatedText) {
        throw new Error(data.error || "Gagal menerjemahkan chapter");
      }

      const trans = data.translatedText;

      // Save directly to DB
      await fetch(`/api/chapters/${novel.id}/${ch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_translated: trans,
        }),
      });

      // Update state in chapters list
      setChapters((prev) =>
        prev.map((item) =>
          item.id === ch.id
            ? {
                ...item,
                content_translated: trans,
                word_count_translated: trans.split(/\s+/).filter(Boolean).length,
                translation_status: "done",
              }
            : item
        )
      );

      setEditTranslated(trans);
      showMsg("ok", `✨ Ch. ${ch.chapter_number} berhasil diterjemahkan & disimpan!`);
    } catch (e: any) {
      showMsg("err", e.message);
    } finally {
      setTranslatingChapterId(null);
    }
  };

  // === BATCH TRANSLATE PENDING CHAPTERS ===
  const handleBatchTranslate = async () => {
    const pendingList = chapters.filter(
      (ch) =>
        (!ch.content_translated || !ch.content_translated.trim()) &&
        ch.content_original &&
        ch.content_original.trim().length > 50
    );

    if (pendingList.length === 0) {
      showMsg("ok", "Semua chapter dengan konten sudah diterjemahkan!");
      return;
    }

    setBatchTranslating(true);
    abortBatchRef.current = false;
    let completedCount = 0;

    for (let i = 0; i < pendingList.length; i++) {
      if (abortBatchRef.current) {
        showMsg("ok", `Batch translation dihentikan (${completedCount} selesai).`);
        break;
      }

      const ch = pendingList[i];
      setBatchProgress({ current: i + 1, total: pendingList.length, chNum: ch.chapter_number });

      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: ch.content_original,
            type: "chapter",
          }),
        });
        const data = await res.json();

        if (res.ok && data.success && data.translatedText) {
          const trans = data.translatedText;
          // Save directly to DB
          await fetch(`/api/chapters/${novel.id}/${ch.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content_translated: trans,
            }),
          });

          // Update local state in chapter list
          setChapters((prev) =>
            prev.map((item) =>
              item.id === ch.id
                ? {
                    ...item,
                    content_translated: trans,
                    word_count_translated: trans.split(/\s+/).filter(Boolean).length,
                    translation_status: "done",
                  }
                : item
            )
          );

          if (selectedChapter?.id === ch.id) {
            setEditTranslated(trans);
          }

          completedCount++;
        }
      } catch (err) {
        console.error(`Error translating chapter ${ch.chapter_number}:`, err);
      }

      // 1.5s delay to stay comfortably below 40 RPM limit
      await new Promise((r) => setTimeout(r, 1500));
    }

    setBatchTranslating(false);
    setBatchProgress(null);
    if (!abortBatchRef.current) {
      showMsg("ok", `🎉 Selesai menerjemahkan ${completedCount}/${pendingList.length} chapter!`);
    }
  };

  const handleStopBatch = () => {
    abortBatchRef.current = true;
  };

  const filteredChapters = chapters.filter((ch) => {
    if (!chapterSearch) return true;
    const q = chapterSearch.toLowerCase();
    return (
      ch.chapter_number.toString().includes(q) ||
      (ch.chapter_title && ch.chapter_title.toLowerCase().includes(q))
    );
  });

  const isDraft = novel.status === "draft";
  const translatedCount = chapters.filter(
    (ch) => !!ch.content_translated?.trim() || ch.translation_status === "completed" || ch.translation_status === "done"
  ).length;
  const pendingWithContent = chapters.filter(
    (ch) =>
      (!ch.content_translated || !ch.content_translated.trim()) &&
      !!ch.content_original &&
      ch.content_original.trim().length > 50
  ).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ═══ Status Banner ═══ */}
      {isDraft && (
        <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 shadow-xl shadow-amber-500/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-lg shadow-inner">
              📝
            </div>
            <div>
              <p className="font-extrabold text-amber-300 text-sm tracking-wide">
                Novel ini Berstatus DRAFT
              </p>
              <p className="text-xs text-amber-200/60 font-medium mt-0.5">
                Edit metadata dan sinopsis, lalu klik Publish untuk menampilkan novel di aplikasi
                pembaca.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSave("active")}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Rocket className="w-4 h-4" />
            <span>{saving ? "Publishing..." : "Publish Sekarang"}</span>
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {message && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl text-xs font-bold animate-in slide-in-from-right-5 duration-300 border flex items-center gap-2.5 ${
            message.type === "ok"
              ? "bg-[#0b1b17]/95 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10"
              : "bg-[#220d11]/95 border-rose-500/40 text-rose-300 shadow-rose-500/10"
          }`}
        >
          {message.type === "ok" ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <X className="w-4 h-4 text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ═══ Cover + Metadata Studio Section ═══ */}
      <div className="bg-[#0c101c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-7 shadow-2xl shadow-black/70 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-80 h-40 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-7 relative z-10">
          {/* Cover Studio Upload */}
          <div className="shrink-0 space-y-3 mx-auto md:mx-0">
            <div
              className="relative w-44 h-64 rounded-2xl overflow-hidden cursor-pointer group border-2 border-dashed border-white/[0.12] hover:border-violet-500/60 transition-all duration-300 shadow-xl shadow-black/60 bg-slate-900"
              onClick={() => fileRef.current?.click()}
            >
              {novel.cover_url ? (
                <>
                  <img
                    src={novel.cover_url}
                    alt={novel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <Upload className="w-7 h-7 text-violet-300" />
                    <span className="text-[11px] font-bold text-slate-200">Ganti Cover</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500 p-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-400 group-hover:text-violet-300 group-hover:scale-110 transition-all">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-400">Upload Cover</span>
                  <span className="text-[10px] text-slate-600">JPG, PNG, WEBP</span>
                </div>
              )}

              {(uploading || generatingCover) && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2 backdrop-blur-sm p-4 text-center z-20">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                  <span className="text-xs font-bold text-amber-200">
                    {generatingCover ? "Membuat Cover AI..." : "Mengunggah Cover..."}
                  </span>
                  {generatingCover && (
                    <span className="text-[10px] text-slate-400 max-w-[130px]">
                      Rendering FLUX model...
                    </span>
                  )}
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />

            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || generatingCover}
              className="w-full py-2.5 px-3 bg-white/[0.04] hover:bg-violet-600/20 border border-white/[0.08] hover:border-violet-500/40 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-violet-400" />
              <span>Pilih File Cover</span>
            </button>

            <button
              onClick={handleGenerateCover}
              disabled={generatingCover || uploading}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500/20 via-violet-600/25 to-indigo-600/25 hover:from-amber-500/35 hover:via-violet-600/35 hover:to-indigo-600/35 border border-amber-500/30 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              {generatingCover ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                  <span>Membuat Cover AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>✨ Generate Cover AI</span>
                </>
              )}
            </button>
          </div>


          {/* Editable Metadata Fields */}
          <div className="flex-1 space-y-5">
            {/* Title */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                Judul Novel
              </label>
              <input
                type="text"
                value={novel.title || ""}
                onChange={(e) => setNovel({ ...novel, title: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-lg font-bold text-white focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all shadow-inner"
                placeholder="Judul lengkap novel..."
              />
            </div>

            {/* Author + Status Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Penulis (Author)
                </label>
                <input
                  type="text"
                  value={novel.author || ""}
                  onChange={(e) => setNovel({ ...novel, author: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-200 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all shadow-inner"
                  placeholder="Nama penulis..."
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Status Publikasi
                </label>
                <select
                  value={novel.status || "draft"}
                  onChange={(e) => setNovel({ ...novel, status: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-200 focus:border-violet-500/60 focus:outline-none transition-all shadow-inner cursor-pointer"
                >
                  <option value="draft" className="bg-slate-900">
                    📝 Draft (Privat)
                  </option>
                  <option value="active" className="bg-slate-900">
                    ✅ Active (Terbit di App)
                  </option>
                  <option value="completed" className="bg-slate-900">
                    ✓ Completed (Tamat)
                  </option>
                </select>
              </div>
            </div>

            {/* Genre Tags Studio */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Genre & Kategori
                </label>
                <button
                  type="button"
                  onClick={handleGenerateGenre}
                  disabled={generating}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-sm"
                >
                  {generating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>{generating ? "AI Generating..." : "✨ Auto Generate Genre"}</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                {(novel.genres || []).map((genre: string) => (
                  <span
                    key={genre}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-500/15 border border-violet-500/25 text-violet-300 rounded-xl text-xs font-semibold shadow-sm"
                  >
                    <span>{genre}</span>
                    <button
                      type="button"
                      onClick={() => removeGenre(genre)}
                      className="hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGenre()}
                  placeholder="Ketik genre lalu tekan Enter..."
                  className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:border-violet-500/60 focus:outline-none transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={addGenre}
                  className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Dual Pane Synopsis Studio ═══ */}
        <div className="mt-8 pt-7 border-t border-white/[0.06] space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Original Synopsis */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-violet-400" />
                  <span>Sinopsis (Original)</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  {novel.synopsis?.split(/\s+/).filter(Boolean).length || 0} kata
                </span>
              </div>
              <textarea
                value={novel.synopsis || ""}
                onChange={(e) => setNovel({ ...novel, synopsis: e.target.value })}
                rows={7}
                className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 rounded-2xl p-4 text-xs sm:text-sm text-slate-300 leading-relaxed focus:outline-none transition-all resize-y shadow-inner"
                placeholder="Tulis atau paste sinopsis original di sini..."
              />
            </div>

            {/* Translated Synopsis */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Sinopsis (Terjemahan ID)</span>
                </label>

                {/* 🌟 Glowing Auto Translate Button */}
                <button
                  type="button"
                  onClick={handleTranslateSynopsis}
                  disabled={translatingSynopsis || !novel.synopsis?.trim()}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-violet-500/25 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  title="Terjemahkan sinopsis original ke Bahasa Indonesia via Gemini 3.7 Flash"
                >
                  {translatingSynopsis ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  )}
                  <span>{translatingSynopsis ? "Menerjemahkan..." : "✨ Auto Translate"}</span>
                </button>
              </div>

              <textarea
                value={novel.synopsis_translated || ""}
                onChange={(e) => setNovel({ ...novel, synopsis_translated: e.target.value })}
                rows={7}
                className="w-full bg-[#061410]/40 border border-emerald-500/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl p-4 text-xs sm:text-sm text-emerald-100 leading-relaxed focus:outline-none transition-all resize-y shadow-inner"
                placeholder="Tulis terjemahan Indonesia atau klik '✨ Auto Translate' untuk generate otomatis..."
              />
            </div>
          </div>
        </div>

        {/* Studio Save Actions */}
        <div className="mt-7 pt-5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-xl shadow-violet-500/25 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </button>

            {isDraft && (
              <button
                onClick={() => handleSave("active")}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-xl shadow-emerald-500/25 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <Rocket className="w-4 h-4" />
                <span>Publish ke App</span>
              </button>
            )}
          </div>

          <span className="text-xs text-slate-400 font-medium font-mono">
            Source: <span className="text-slate-200 font-semibold">{novel.source || "general"}</span> •{" "}
            <span className="text-slate-200 font-semibold">{novel.total_chapters || 0}</span> chapter
          </span>
        </div>
      </div>

      {/* ═══ Luxury Chapter Studio Section ═══ */}
      <div className="bg-[#0c101c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl shadow-black/70">
        {/* Header - Collapsible */}
        <button
          onClick={toggleChapters}
          className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-extrabold text-white">Chapter Studio & Translator</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  {translatedCount} Selesai
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {chapters.length > 0
                  ? `${chapters.length} chapter total terarsip • Gemini 3.7 Flash Enabled`
                  : `${novel.total_chapters || 0} chapter total`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs">
            <span>{chaptersExpanded ? "Tutup Editor" : "Buka Studio"}</span>
            {chaptersExpanded ? (
              <ChevronDown className="w-5 h-5 text-violet-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </button>

        {chaptersExpanded && (
          <div className="border-t border-white/[0.06]">
            {chaptersLoading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
                <span className="text-xs font-bold">Memuat daftar chapter dari database...</span>
              </div>
            ) : chapters.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-sm">
                Belum ada data chapter untuk novel ini di database.
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row" style={{ minHeight: "650px", maxHeight: "780px" }}>
                {/* Left: Chapter List Sidebar */}
                <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/[0.06] flex flex-col shrink-0 bg-slate-950/40">
                  {/* Chapter Search & Batch Action */}
                  <div className="p-4 border-b border-white/[0.06] space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari nomor/judul chapter..."
                        value={chapterSearch}
                        onChange={(e) => setChapterSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-all shadow-inner"
                      />
                    </div>

                    {/* Batch Translate Button / Progress */}
                    {batchTranslating ? (
                      <div className="bg-violet-950/60 border border-violet-500/40 rounded-2xl p-3 space-y-2 animate-in fade-in shadow-lg">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-violet-200 flex items-center gap-1.5 font-bold">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                            <span>
                              Ch {batchProgress?.chNum} ({batchProgress?.current}/{batchProgress?.total})
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={handleStopBatch}
                            className="text-[10px] font-extrabold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                          >
                            Stop
                          </button>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-300 shadow-sm"
                            style={{
                              width: `${((batchProgress?.current || 0) / (batchProgress?.total || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : pendingWithContent > 0 ? (
                      <button
                        type="button"
                        onClick={handleBatchTranslate}
                        className="w-full px-3 py-2 bg-gradient-to-r from-violet-600/30 to-indigo-600/30 hover:from-violet-600 hover:to-indigo-600 border border-violet-500/40 text-violet-200 hover:text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                        title="Translate semua chapter yang belum diterjemahkan secara otomatis"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>Translate Semua ({pendingWithContent} pending)</span>
                      </button>
                    ) : null}
                  </div>

                  {/* Chapter Items Scrollable */}
                  <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
                    {filteredChapters.map((ch) => {
                      const isActive = selectedChapter?.id === ch.id;
                      const hasTranslated =
                        !!ch.content_translated && ch.content_translated.trim().length > 0;
                      const isThisTranslating = translatingChapterId === ch.id;
                      const hasOriginal =
                        !!ch.content_original && ch.content_original.trim().length > 20;

                      return (
                        <div
                          key={ch.id}
                          onClick={() => selectChapter(ch)}
                          className={`w-full text-left px-4 py-3 transition-all cursor-pointer flex items-center justify-between gap-2.5 group ${
                            isActive
                              ? "bg-violet-600/20 border-l-4 border-l-violet-400"
                              : "hover:bg-white/[0.03] border-l-4 border-l-transparent"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-bold ${
                                  isActive ? "text-violet-300" : "text-slate-200"
                                }`}
                              >
                                Ch. {ch.chapter_number}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {ch.word_count_original ? `${ch.word_count_original}w` : "0w"}
                              </span>
                            </div>
                            {ch.chapter_title && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                                {ch.chapter_title}
                              </p>
                            )}
                          </div>

                          {/* Quick Action Button */}
                          <div className="shrink-0 flex items-center gap-1.5">
                            {isThisTranslating ? (
                              <div className="flex items-center gap-1 px-2 py-1 bg-violet-900/60 border border-violet-500/40 rounded-lg text-[10px] text-violet-200 font-bold">
                                <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
                                <span>AI...</span>
                              </div>
                            ) : hasTranslated ? (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <Check className="w-2.5 h-2.5" /> ID
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleTranslateSingleChapter(ch, e)}
                                  disabled={batchTranslating || !!translatingChapterId}
                                  className="p-1 hover:bg-violet-500/20 text-slate-400 hover:text-violet-300 rounded-md transition-colors cursor-pointer"
                                  title={`Re-translate Ch. ${ch.chapter_number}`}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleTranslateSingleChapter(ch, e)}
                                disabled={batchTranslating || !!translatingChapterId || !hasOriginal}
                                className="px-2.5 py-1 bg-gradient-to-r from-violet-600/30 to-indigo-600/30 hover:from-violet-600 hover:to-indigo-600 border border-violet-500/30 hover:border-violet-400 text-violet-200 hover:text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                title={
                                  hasOriginal
                                    ? `Translate Ch. ${ch.chapter_number} via Gemini 3.7 Flash`
                                    : "Konten original kosong"
                                }
                              >
                                <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                                <span>Translate</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Studio Chapter Editor */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#080b13]">
                  {selectedChapter ? (
                    <>
                      {/* Chapter Toolbar */}
                      <div className="p-4 px-6 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-slate-900/40">
                        <div className="flex-1 min-w-0">
                          <label className="text-[10px] text-slate-400 block mb-1 font-bold uppercase tracking-wider">
                            Judul Chapter ({selectedChapter.chapter_number})
                          </label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:border-violet-500/60 focus:outline-none transition-colors shadow-inner"
                            placeholder="Judul chapter..."
                          />
                        </div>

                        <div className="flex items-center gap-2 shrink-0 sm:pt-4">
                          {/* Translate Button */}
                          <button
                            type="button"
                            onClick={handleTranslateCurrentChapter}
                            disabled={translatingChapter || !editOriginal.trim()}
                            className="px-4 py-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-violet-500/25 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title="Terjemahkan chapter ini via Gemini 3.7 Flash"
                          >
                            {translatingChapter ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            )}
                            <span>{translatingChapter ? "Translating..." : "✨ Translate Chapter"}</span>
                          </button>

                          {/* Save Button */}
                          <button
                            type="button"
                            onClick={handleSaveChapter}
                            disabled={savingChapter}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            {savingChapter ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            <span>{savingChapter ? "Saving..." : "Simpan Chapter"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Dual Content Panes */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06] min-h-0">
                        {/* Original (EN) */}
                        <div className="flex flex-col min-h-0 bg-black/20">
                          <div className="px-5 py-2.5 border-b border-white/[0.05] flex items-center justify-between shrink-0 bg-white/[0.01]">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-blue-400" />
                              <span className="text-xs font-bold text-blue-400">Original (EN)</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono font-semibold">
                              {editOriginal.split(/\s+/).filter(Boolean).length} kata
                            </span>
                          </div>
                          <textarea
                            value={editOriginal}
                            onChange={(e) => setEditOriginal(e.target.value)}
                            className="flex-1 w-full bg-transparent p-5 text-xs sm:text-sm leading-relaxed text-slate-300 resize-none focus:outline-none placeholder-slate-600 font-sans selection:bg-blue-500/30"
                            placeholder="Isi teks original chapter..."
                          />
                        </div>

                        {/* Translated (ID) */}
                        <div className="flex flex-col min-h-0 bg-[#05110d]/30">
                          <div className="px-5 py-2.5 border-b border-emerald-500/20 flex items-center justify-between shrink-0 bg-emerald-950/20">
                            <div className="flex items-center gap-2">
                              <Globe className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-xs font-bold text-emerald-400">
                                Terjemahan (ID)
                              </span>
                            </div>
                            <span className="text-[10px] text-emerald-400/80 font-mono font-semibold">
                              {editTranslated.split(/\s+/).filter(Boolean).length} kata
                            </span>
                          </div>
                          <textarea
                            value={editTranslated}
                            onChange={(e) => setEditTranslated(e.target.value)}
                            className="flex-1 w-full bg-transparent p-5 text-xs sm:text-sm leading-relaxed text-emerald-100 resize-none focus:outline-none placeholder-slate-600 font-sans selection:bg-emerald-500/30"
                            placeholder="Terjemahan Indonesia..."
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 p-8">
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto text-slate-600">
                          <BookOpen className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold text-slate-300">Pilih Chapter di Daftar Kiri</p>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">
                          Pilih nomor chapter untuk membaca, menerjemahkan, atau mengedit teks secara langsung.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
