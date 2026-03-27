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
  const [generating, setGenerating] = useState(false);
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
  const [chapterSearch, setChapterSearch] = useState("");

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // === SAVE NOVEL ===
  const handleSave = async (publishStatus?: string) => {
    setSaving(true);
    try {
      const body: any = {
        title: novel.title,
        synopsis: novel.synopsis,
        genres: novel.genres,
        author: novel.author,
        status: publishStatus || novel.status || "draft",
        original_status: novel.original_status,
      };

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

  const filteredChapters = chapters.filter((ch) => {
    if (!chapterSearch) return true;
    const q = chapterSearch.toLowerCase();
    return (
      ch.chapter_number.toString().includes(q) ||
      (ch.chapter_title && ch.chapter_title.toLowerCase().includes(q))
    );
  });

  const isDraft = novel.status === "draft";
  const translatedCount = chapters.filter((ch) => ch.translation_status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {isDraft && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <div>
              <p className="font-semibold text-amber-400">Novel ini masih DRAFT</p>
              <p className="text-sm text-amber-400/70">Edit metadata dan upload cover, lalu klik Publish untuk menampilkan di app.</p>
            </div>
          </div>
          <button
            onClick={() => handleSave("active")}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Rocket className="w-4 h-4" />
            {saving ? "Publishing..." : "Publish"}
          </button>
        </div>
      )}

      {/* Toast Message */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-in slide-in-from-right ${
          message.type === "ok" ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
        }`}>
          {message.text}
        </div>
      )}

      {/* Cover + Metadata Grid */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6">
        <div className="flex gap-6">
          {/* Cover Upload */}
          <div className="shrink-0 space-y-3">
            <div
              className="relative w-40 h-56 rounded-xl overflow-hidden cursor-pointer group border-2 border-dashed border-gray-700 hover:border-violet-500/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {novel.cover_url ? (
                <>
                  <img src={novel.cover_url} alt={novel.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center gap-2">
                  <Upload className="w-8 h-8 text-gray-600" />
                  <span className="text-xs text-gray-500">Upload Cover</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
              className="w-full px-3 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg text-xs font-medium hover:bg-violet-500/20 transition-colors flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Cover
            </button>
          </div>

          {/* Editable Metadata */}
          <div className="flex-1 space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Judul Novel</label>
              <input
                type="text"
                value={novel.title || ""}
                onChange={(e) => setNovel({ ...novel, title: e.target.value })}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-lg font-semibold focus:border-violet-500/50 focus:outline-none transition-colors"
              />
            </div>

            {/* Author + Status Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Author</label>
                <input
                  type="text"
                  value={novel.author || ""}
                  onChange={(e) => setNovel({ ...novel, author: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm focus:border-violet-500/50 focus:outline-none transition-colors"
                  placeholder="Author name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                <select
                  value={novel.status || "draft"}
                  onChange={(e) => setNovel({ ...novel, status: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm focus:border-violet-500/50 focus:outline-none transition-colors"
                >
                  <option value="draft">📝 Draft</option>
                  <option value="active">✅ Active (Published)</option>
                  <option value="completed">✓ Completed</option>
                </select>
              </div>
            </div>

            {/* Genre Tags */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500">Genre</label>
                <button
                  onClick={handleGenerateGenre}
                  disabled={generating}
                  className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  {generating ? "Generating..." : "Auto Generate"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {(novel.genres || []).map((genre: string) => (
                  <span
                    key={genre}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-lg text-xs"
                  >
                    {genre}
                    <button onClick={() => removeGenre(genre)} className="hover:text-red-400 transition-colors">
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
                  placeholder="Tambah genre..."
                  className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-xs focus:border-violet-500/50 focus:outline-none transition-colors"
                />
                <button
                  onClick={addGenre}
                  className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Synopsis */}
        <div className="mt-6 pt-6 border-t border-gray-800/50">
          <label className="text-xs font-medium text-gray-500 mb-2 block">Sinopsis</label>
          <textarea
            value={novel.synopsis || ""}
            onChange={(e) => setNovel({ ...novel, synopsis: e.target.value })}
            rows={5}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-sm leading-relaxed focus:border-violet-500/50 focus:outline-none transition-colors resize-y"
            placeholder="Tulis sinopsis novel..."
          />
        </div>

        {/* Save Buttons */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl text-sm font-semibold shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>

          {isDraft && (
            <button
              onClick={() => handleSave("active")}
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Rocket className="w-4 h-4" />
              Publish ke App
            </button>
          )}

          <div className="flex-1" />

          <span className="text-xs text-gray-600">
            Source: {novel.source || "–"} • {novel.total_chapters || 0} chapter
          </span>
        </div>
      </div>

      {/* ═══ Chapter Editor Section ═══ */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl overflow-hidden">
        {/* Header - Collapsible */}
        <button
          onClick={toggleChapters}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-800/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-violet-400" />
            </div>
            <div className="text-left">
              <h2 className="text-base font-semibold">Chapter Editor</h2>
              <p className="text-xs text-gray-500">
                {chapters.length > 0
                  ? `${chapters.length} chapter • ${translatedCount} diterjemahkan`
                  : `${novel.total_chapters || 0} chapter total`}
              </p>
            </div>
          </div>
          {chaptersExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {chaptersExpanded && (
          <div className="border-t border-gray-800/50">
            {chaptersLoading ? (
              <div className="p-8 flex items-center justify-center gap-3 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" /> Memuat chapter...
              </div>
            ) : chapters.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                Belum ada chapter di database.
              </div>
            ) : (
              <div className="flex" style={{ height: "600px" }}>
                {/* Left: Chapter List */}
                <div className="w-72 border-r border-gray-800/50 flex flex-col shrink-0">
                  {/* Chapter Search */}
                  <div className="p-3 border-b border-gray-800/50">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Cari chapter..."
                        value={chapterSearch}
                        onChange={(e) => setChapterSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Chapter Items Scrollable */}
                  <div className="flex-1 overflow-y-auto">
                    {filteredChapters.map((ch) => {
                      const isActive = selectedChapter?.id === ch.id;
                      const isTranslated = ch.translation_status === "completed";
                      return (
                        <button
                          key={ch.id}
                          onClick={() => selectChapter(ch)}
                          className={`w-full text-left px-4 py-2.5 border-b border-gray-800/30 transition-all ${
                            isActive
                              ? "bg-violet-500/10 border-l-2 border-l-violet-500"
                              : "hover:bg-gray-800/30 border-l-2 border-l-transparent"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium ${isActive ? "text-violet-300" : "text-gray-300"}`}>
                              Ch. {ch.chapter_number}
                            </span>
                            <div className="flex items-center gap-1">
                              {isTranslated && (
                                <Globe className="w-3 h-3 text-emerald-400" />
                              )}
                              <FileText className="w-3 h-3 text-gray-600" />
                            </div>
                          </div>
                          {ch.chapter_title && (
                            <p className="text-[10px] text-gray-500 truncate mt-0.5">{ch.chapter_title}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Editor */}
                <div className="flex-1 flex flex-col min-w-0">
                  {selectedChapter ? (
                    <>
                      {/* Chapter Header */}
                      <div className="p-4 border-b border-gray-800/50 flex items-center justify-between shrink-0">
                        <div className="flex-1 min-w-0 mr-3">
                          <label className="text-[10px] text-gray-600 block mb-1">Judul Chapter</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-sm font-medium focus:border-violet-500/50 focus:outline-none transition-colors"
                            placeholder="Judul chapter..."
                          />
                        </div>
                        <button
                          onClick={handleSaveChapter}
                          disabled={savingChapter}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                        >
                          {savingChapter ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          {savingChapter ? "Saving..." : "Simpan Chapter"}
                        </button>
                      </div>

                      {/* Dual Textarea */}
                      <div className="flex-1 grid grid-cols-2 divide-x divide-gray-800/50 min-h-0">
                        {/* Original */}
                        <div className="flex flex-col">
                          <div className="px-4 py-2 border-b border-gray-800/50 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-blue-400" />
                              <span className="text-xs font-medium text-blue-400">Original (EN)</span>
                            </div>
                            <span className="text-[10px] text-gray-600">
                              {editOriginal.split(/\s+/).filter(Boolean).length} kata
                            </span>
                          </div>
                          <textarea
                            value={editOriginal}
                            onChange={(e) => setEditOriginal(e.target.value)}
                            className="flex-1 w-full bg-transparent px-4 py-3 text-sm leading-relaxed text-gray-300 resize-none focus:outline-none placeholder-gray-600"
                            placeholder="Isi original chapter..."
                          />
                        </div>

                        {/* Translated */}
                        <div className="flex flex-col">
                          <div className="px-4 py-2 border-b border-gray-800/50 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-xs font-medium text-emerald-400">Terjemahan (ID)</span>
                            </div>
                            <span className="text-[10px] text-gray-600">
                              {editTranslated.split(/\s+/).filter(Boolean).length} kata
                            </span>
                          </div>
                          <textarea
                            value={editTranslated}
                            onChange={(e) => setEditTranslated(e.target.value)}
                            className="flex-1 w-full bg-transparent px-4 py-3 text-sm leading-relaxed text-gray-300 resize-none focus:outline-none placeholder-gray-600"
                            placeholder="Terjemahan Indonesia..."
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-600">
                      <div className="text-center">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                        <p className="text-sm">Pilih chapter dari daftar di kiri</p>
                        <p className="text-xs text-gray-600 mt-1">untuk mengedit konten original atau terjemahan</p>
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
