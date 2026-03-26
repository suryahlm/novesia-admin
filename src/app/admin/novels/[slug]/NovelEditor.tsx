"use client";

import { useState, useRef } from "react";
import { Upload, Wand2, Save, Rocket, X, Plus, Trash2 } from "lucide-react";

interface NovelEditorProps {
  novel: any;
}

export default function NovelEditor({ novel: initialNovel }: NovelEditorProps) {
  const [novel, setNovel] = useState(initialNovel);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [newGenre, setNewGenre] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // === SAVE ===
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

  const isDraft = novel.status === "draft";

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
    </div>
  );
}
