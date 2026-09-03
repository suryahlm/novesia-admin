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
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    chNum: number;
    statusText?: string;
  } | null>(null);
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
    const failedList: number[] = [];
    const MAX_RETRIES = 3;

    for (let i = 0; i < pendingList.length; i++) {
      if (abortBatchRef.current) {
        showMsg("ok", `Batch translation dihentikan (${completedCount} selesai).`);
        break;
      }

      const ch = pendingList[i];
      let chapterSuccess = false;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (abortBatchRef.current) break;

        setBatchProgress({
          current: i + 1,
          total: pendingList.length,
          chNum: ch.chapter_number,
          statusText: attempt > 1 ? `Retry ${attempt}/${MAX_RETRIES}...` : undefined,
        });

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
            chapterSuccess = true;
            break; // Success, exit retry loop
          } else {
            console.warn(`Chapter ${ch.chapter_number} attempt ${attempt} failed:`, data?.error || res.statusText);
            if (attempt < MAX_RETRIES && !abortBatchRef.current) {
              const waitSec = attempt * 3;
              setBatchProgress({
                current: i + 1,
                total: pendingList.length,
                chNum: ch.chapter_number,
                statusText: `Cooldown ${waitSec}s (Retry ${attempt + 1})...`,
              });
              await new Promise((r) => setTimeout(r, waitSec * 1000));
            }
          }
        } catch (err) {
          console.error(`Error translating chapter ${ch.chapter_number} attempt ${attempt}:`, err);
          if (attempt < MAX_RETRIES && !abortBatchRef.current) {
            const waitSec = attempt * 3;
            setBatchProgress({
              current: i + 1,
              total: pendingList.length,
              chNum: ch.chapter_number,
              statusText: `Cooldown ${waitSec}s (Retry ${attempt + 1})...`,
            });
            await new Promise((r) => setTimeout(r, waitSec * 1000));
          }
        }
      }

      if (!chapterSuccess && !abortBatchRef.current) {
        failedList.push(ch.chapter_number);
      }

      // Safe 1.85s delay between chapters (strictly under 35 RPM limit)
      await new Promise((r) => setTimeout(r, 1850));
    }

    setBatchTranslating(false);
    setBatchProgress(null);
    if (!abortBatchRef.current) {
      if (failedList.length === 0) {
        showMsg("ok", `🎉 Sukses! Semua ${completedCount} chapter berhasil diterjemahkan!`);
      } else {
        showMsg(
          "err",
          `Selesai: ${completedCount} berhasil, ${failedList.length} gagal (Ch: ${failedList.slice(0, 5).join(", ")}${failedList.length > 5 ? "..." : ""})`
        );
      }
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
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* ═══ Status Banner ═══ */}
      {isDraft && (
        <div className="rounded-xl p-4 bg-amber-400/10 border border-amber-400/25 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-bold text-sm">
              📝
            </div>
            <div>
              <p className="font-bold text-amber-300 text-xs">
                Novel ini Berstatus DRAFT
              </p>
              <p className="text-xs text-amber-200/70 mt-0.5">
                Edit metadata dan sinopsis, lalu klik Publish untuk menampilkan novel di aplikasi pembaca.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSave("active")}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 rounded-lg text-xs font-bold shadow-[0_2px_12px_-2px_rgba(221,168,58,0.45)] transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>{saving ? "Publishing..." : "Publish Sekarang"}</span>
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {message && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold animate-in slide-in-from-right-5 duration-300 border flex items-center gap-2 ${
            message.type === "ok"
              ? "bg-[#0c1815] border-emerald-900/60 text-emerald-200"
              : "bg-[#1f1013] border-red-900/60 text-red-200"
          }`}
        >
          {message.type === "ok" ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <X className="w-4 h-4 text-red-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ═══ Cover + Metadata Studio Section ═══ */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl p-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row gap-5 relative z-10">
          {/* Cover Studio Upload */}
          <div className="shrink-0 space-y-2.5 mx-auto md:mx-0">
            <div
              className="relative w-40 h-56 rounded-xl overflow-hidden cursor-pointer group border-2 border-dashed border-white/10 hover:border-amber-400/50 transition-all duration-300 bg-[#0a0c10]"
              onClick={() => fileRef.current?.click()}
            >
              {novel.cover_url ? (
                <>
                  <img
                    src={novel.cover_url}
                    alt={novel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                    <Upload className="w-5 h-5 text-amber-300" />
                    <span className="text-[11px] font-semibold text-slate-200">Ganti Cover</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500 p-4 text-center">
                  <div className="w-10 h-10 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300">Upload Cover</span>
                  <span className="text-[10px] text-slate-500 font-mono">JPG, PNG, WEBP</span>
                </div>
              )}

              {(uploading || generatingCover) && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2 backdrop-blur-sm p-3 text-center z-20">
                  <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                  <span className="text-xs font-bold text-amber-200">
                    {generatingCover ? "Membuat Cover AI..." : "Mengunggah Cover..."}
                  </span>
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
              className="w-full py-1.5 px-3 bg-[#0a0c10] hover:bg-white/5 border border-white/10 text-slate-300 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Pilih File Cover</span>
            </button>

            <button
              onClick={handleGenerateCover}
              disabled={generatingCover || uploading}
              className="w-full py-1.5 px-3 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 text-amber-300 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {generatingCover ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                  <span>Membuat Cover AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Generate Cover AI</span>
                </>
              )}
            </button>
          </div>

          {/* Editable Metadata Fields */}
          <div className="flex-1 space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                Judul Novel
              </label>
              <input
                type="text"
                value={novel.title || ""}
                onChange={(e) => setNovel({ ...novel, title: e.target.value })}
                className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3.5 py-2 text-base font-bold text-white focus:border-amber-400/70 focus:ring-1 focus:ring-amber-400/30 focus:outline-none transition-all"
                placeholder="Judul lengkap novel..."
              />
            </div>

            {/* Author + Status Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                  Penulis (Author)
                </label>
                <input
                  type="text"
                  value={novel.author || ""}
                  onChange={(e) => setNovel({ ...novel, author: e.target.value })}
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 focus:border-amber-400/70 focus:outline-none transition-all"
                  placeholder="Nama penulis..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                  Status Publikasi
                </label>
                <select
                  value={novel.status || "draft"}
                  onChange={(e) => setNovel({ ...novel, status: e.target.value })}
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 focus:border-amber-400/70 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="draft" className="bg-[#0a0c10]">
                    Draft (Privat)
                  </option>
                  <option value="active" className="bg-[#0a0c10]">
                    Active (Terbit di App)
                  </option>
                  <option value="completed" className="bg-[#0a0c10]">
                    Completed (Tamat)
                  </option>
                </select>
              </div>
            </div>

            {/* Genre Tags Studio */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400">
                  Genre & Kategori
                </label>
                <button
                  type="button"
                  onClick={handleGenerateGenre}
                  disabled={generating}
                  className="px-2.5 py-1 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 text-amber-300 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  {generating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>{generating ? "AI Generating..." : "Auto Generate Genre"}</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-[#0a0c10] border border-white/5 rounded-lg">
                {(novel.genres || []).map((genre: string) => (
                  <span
                    key={genre}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-400/10 border border-amber-400/20 text-amber-200 rounded-md text-xs font-medium"
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
                  className="flex-1 bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-amber-400/70 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={addGenre}
                  className="px-3 py-1.5 bg-[#0a0c10] hover:bg-white/5 border border-white/10 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Dual Pane Synopsis Studio ═══ */}
        <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Original Synopsis */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sinopsis (Original)</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  {novel.synopsis?.split(/\s+/).filter(Boolean).length || 0} kata
                </span>
              </div>
              <textarea
                value={novel.synopsis || ""}
                onChange={(e) => setNovel({ ...novel, synopsis: e.target.value })}
                rows={6}
                className="w-full bg-[#0a0c10] border border-white/10 focus:border-amber-400/70 focus:ring-1 focus:ring-amber-400/30 rounded-lg p-3 text-xs text-slate-300 leading-relaxed focus:outline-none transition-all resize-y"
                placeholder="Tulis atau paste sinopsis original di sini..."
              />
            </div>

            {/* Translated Synopsis */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sinopsis (Terjemahan ID)</span>
                </label>

                {/* Auto Translate Button */}
                <button
                  type="button"
                  onClick={handleTranslateSynopsis}
                  disabled={translatingSynopsis || !novel.synopsis?.trim()}
                  className="px-2.5 py-1 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/20 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Terjemahkan sinopsis original ke Bahasa Indonesia"
                >
                  {translatingSynopsis ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>{translatingSynopsis ? "Menerjemahkan..." : "Auto Translate"}</span>
                </button>
              </div>

              <textarea
                value={novel.synopsis_translated || ""}
                onChange={(e) => setNovel({ ...novel, synopsis_translated: e.target.value })}
                rows={6}
                className="w-full bg-[#0a0c10] border border-white/10 focus:border-amber-400/70 focus:ring-1 focus:ring-amber-400/30 rounded-lg p-3 text-xs text-slate-200 leading-relaxed focus:outline-none transition-all resize-y"
                placeholder="Tulis terjemahan Indonesia atau klik 'Auto Translate' untuk generate otomatis..."
              />
            </div>
          </div>
        </div>

        {/* Studio Save Actions */}
        <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 rounded-lg text-xs font-bold shadow-[0_2px_12px_-2px_rgba(221,168,58,0.45)] transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </button>

            {isDraft && (
              <button
                onClick={() => handleSave("active")}
                disabled={saving}
                className="px-4 py-2.5 bg-[#0a0c10] hover:bg-white/5 text-slate-300 border border-white/10 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Rocket className="w-3.5 h-3.5 text-amber-400" />
                <span>Publish ke App</span>
              </button>
            )}
          </div>

          <span className="text-xs text-slate-400 font-mono">
            Source: <span className="text-slate-200 font-semibold">{novel.source || "general"}</span> •{" "}
            <span className="text-slate-200 font-semibold">{novel.total_chapters || 0}</span> chapter
          </span>
        </div>
      </div>

      {/* ═══ Chapter Studio Section ═══ */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl overflow-hidden">
        {/* Header - Collapsible */}
        <button
          onClick={toggleChapters}
          className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">Chapter Studio & Translator</h2>
                <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/20 text-emerald-300">
                  {translatedCount} Selesai
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {chapters.length > 0
                  ? `${chapters.length} chapter total terarsip`
                  : `${novel.total_chapters || 0} chapter total`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 font-medium text-xs">
            <span>{chaptersExpanded ? "Tutup Editor" : "Buka Studio"}</span>
            {chaptersExpanded ? (
              <ChevronDown className="w-4 h-4 text-amber-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {chaptersExpanded && (
          <div className="border-t border-white/5">
            {chaptersLoading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span className="text-xs">Memuat daftar chapter dari database...</span>
              </div>
            ) : chapters.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-xs">
                Belum ada data chapter untuk novel ini di database.
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row" style={{ minHeight: "600px", maxHeight: "750px" }}>
                {/* Left: Chapter List Sidebar */}
                <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col shrink-0 bg-[#0a0c10]">
                  {/* Chapter Search & Batch Action */}
                  <div className="p-3 border-b border-white/5 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari chapter..."
                        value={chapterSearch}
                        onChange={(e) => setChapterSearch(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 bg-[#12151b] border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/70 transition-all"
                      />
                    </div>

                    {/* Batch Translate Button / Progress */}
                    {batchTranslating ? (
                      <div className="bg-amber-400/10 border border-amber-400/25 rounded-lg p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-amber-200 flex items-center gap-1.5 font-semibold">
                            <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
                            <span>
                              Ch {batchProgress?.chNum} ({batchProgress?.current}/{batchProgress?.total})
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={handleStopBatch}
                            className="text-[10px] font-bold bg-red-950/60 hover:bg-red-900/60 text-red-300 px-2 py-0.5 rounded transition-colors cursor-pointer"
                          >
                            Stop
                          </button>
                        </div>
                        {batchProgress?.statusText && (
                          <div className="text-[10px] text-amber-300 font-mono flex items-center gap-1">
                            <span>⏳</span>
                            <span>{batchProgress.statusText}</span>
                          </div>
                        )}
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-400 h-1.5 rounded-full transition-all duration-300"
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
                        className="w-full px-2.5 py-1.5 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 text-amber-300 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Translate semua chapter yang belum diterjemahkan secara otomatis"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Translate Semua ({pendingWithContent} pending)</span>
                      </button>
                    ) : null}
                  </div>

                  {/* Chapter Items Scrollable */}
                  <div className="flex-1 overflow-y-auto divide-y divide-white/5">
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
                          className={`w-full text-left px-3 py-2.5 transition-colors cursor-pointer flex items-center justify-between gap-2 group ${
                            isActive
                              ? "bg-amber-400/10 border-l-2 border-l-amber-400"
                              : "hover:bg-white/5 border-l-2 border-l-transparent"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs font-semibold ${
                                  isActive ? "text-amber-300" : "text-slate-200"
                                }`}
                              >
                                Ch. {ch.chapter_number}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {ch.word_count_original ? `${ch.word_count_original}w` : "0w"}
                              </span>
                            </div>
                            {ch.chapter_title && (
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {ch.chapter_title}
                              </p>
                            )}
                          </div>

                          {/* Quick Action Button */}
                          <div className="shrink-0 flex items-center gap-1">
                            {isThisTranslating ? (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-400/10 border border-amber-400/20 rounded text-[10px] text-amber-300 font-semibold">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>AI...</span>
                              </div>
                            ) : hasTranslated ? (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                                  <Check className="w-2.5 h-2.5" /> ID
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleTranslateSingleChapter(ch, e)}
                                  disabled={batchTranslating || !!translatingChapterId}
                                  className="p-1 hover:bg-white/5 text-slate-400 hover:text-amber-300 rounded transition-colors cursor-pointer"
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
                                className="px-2 py-0.5 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 text-amber-300 rounded text-[10px] font-semibold transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                title={
                                  hasOriginal
                                    ? `Translate Ch. ${ch.chapter_number}`
                                    : "Konten original kosong"
                                }
                              >
                                <Sparkles className="w-2.5 h-2.5" />
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
                <div className="flex-1 flex flex-col min-w-0 bg-[#0c0e14]">
                  {selectedChapter ? (
                    <>
                      {/* Chapter Toolbar */}
                      <div className="p-3 px-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-[#12151b]">
                        <div className="flex-1 min-w-0">
                          <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">
                            Judul Chapter ({selectedChapter.chapter_number})
                          </label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-colors"
                            placeholder="Judul chapter..."
                          />
                        </div>

                        <div className="flex items-center gap-2 shrink-0 sm:pt-3">
                          {/* Translate Button */}
                          <button
                            type="button"
                            onClick={handleTranslateCurrentChapter}
                            disabled={translatingChapter || !editOriginal.trim()}
                            className="px-3.5 py-1.5 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 text-amber-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title="Terjemahkan chapter ini via AI"
                          >
                            {translatingChapter ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            <span>{translatingChapter ? "Translating..." : "Translate Chapter"}</span>
                          </button>

                          {/* Save Button */}
                          <button
                            type="button"
                            onClick={handleSaveChapter}
                            disabled={savingChapter}
                            className="px-3.5 py-1.5 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 rounded-lg text-xs font-bold shadow-[0_2px_12px_-2px_rgba(221,168,58,0.45)] transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5 min-h-0">
                        {/* Original (EN) */}
                        <div className="flex flex-col min-h-0 bg-[#0a0c10]/40">
                          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-xs font-semibold text-slate-300">Original</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {editOriginal.split(/\s+/).filter(Boolean).length} kata
                            </span>
                          </div>
                          <textarea
                            value={editOriginal}
                            onChange={(e) => setEditOriginal(e.target.value)}
                            className="flex-1 w-full bg-transparent p-4 text-xs leading-relaxed text-slate-300 resize-none focus:outline-none placeholder:text-slate-600 font-sans"
                            placeholder="Isi teks original chapter..."
                          />
                        </div>

                        {/* Translated (ID) */}
                        <div className="flex flex-col min-h-0 bg-[#0a0c10]">
                          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between shrink-0 bg-amber-400/5">
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-xs font-semibold text-amber-300">
                                Terjemahan (ID)
                              </span>
                            </div>
                            <span className="text-[10px] text-amber-400/80 font-mono">
                              {editTranslated.split(/\s+/).filter(Boolean).length} kata
                            </span>
                          </div>
                          <textarea
                            value={editTranslated}
                            onChange={(e) => setEditTranslated(e.target.value)}
                            className="flex-1 w-full bg-transparent p-4 text-xs leading-relaxed text-slate-100 resize-none focus:outline-none placeholder:text-slate-600 font-sans"
                            placeholder="Terjemahan Indonesia..."
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 p-8">
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto text-slate-500">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-300">Pilih Chapter di Daftar Kiri</p>
                        <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
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
