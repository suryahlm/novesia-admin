"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle, ImageIcon, Wand2, Save } from "lucide-react";

export default function ManualNovelPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generatingGenre, setGeneratingGenre] = useState(false);
  const [result, setResult] = useState<{ success: boolean; msg?: string; error?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    nu_slug: "",
    author: "",
    synopsis: "",
    total_chapters: "0",
    rating: "0",
    status: "active",
    original_status: "Ongoing",
    novel_type: "Web Novel",
    // source is always "General" in backend now, but we can just visually let user know it's forced
  });

  const [genres, setGenres] = useState<string[]>([]);
  const [tempGenre, setTempGenre] = useState("");

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setFormData((prev) => ({
      ...prev,
      title: val,
      nu_slug: slug,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const addGenre = (gen: string) => {
    const trim = gen.trim();
    if (trim && !genres.includes(trim)) {
      setGenres([...genres, trim]);
    }
  };

  const removeGenre = (gen: string) => {
    setGenres(genres.filter((g) => g !== gen));
  };

  const autoGenerateGenres = async () => {
    if (!formData.title) return alert("Judul novel masih kosong!");
    setGeneratingGenre(true);
    try {
      const resp = await fetch("/api/novels/generate-genre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formData.title, synopsis: formData.synopsis }),
      });
      const data = await resp.json();
      if (data.genres) {
        // Gabungkan tanpa duplikat
        const newGenres = [...new Set([...genres, ...data.genres])];
        setGenres(newGenres);
      }
    } catch (e) {
      console.error(e);
      alert("Gagal meng-generate genre");
    } finally {
      setGeneratingGenre(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.nu_slug) {
      alert("Judul dan Slug wajib diisi!");
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const payload = {
        ...formData,
        genres,
        coverBase64: coverPreview || null, // data uri
      };

      const resp = await fetch("/api/novels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (data.success) {
        setResult({ success: true, msg: "Novel berhasil ditambahkan ke database!" });
        // Redirect setelah 2 detik
        setTimeout(() => {
          router.push("/admin/novels");
        }, 2000);
      } else {
        setResult({ success: false, error: data.error });
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message || "Network Error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="space-y-1">
        <h1
          className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          ✍️ Studio Tambah Novel Manual
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm font-medium">
          Tulis dan buat novel original / custom langsung ke dalam database (Source: General DB).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Cover & Status */}
        <div className="space-y-6">
          {/* Cover Upload Card */}
          <div className="bg-[#0c101c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-xl shadow-black/50 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cover Novel (R2 Storage)
            </h3>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/[0.12] hover:border-amber-500/60 rounded-2xl h-72 flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] transition-all overflow-hidden relative group bg-slate-900 shadow-inner"
            >
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt="Cover Preview"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-500 mx-auto group-hover:text-amber-400 group-hover:scale-110 transition-all">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-300">Klik untuk upload cover</p>
                  <p className="text-[10px] text-slate-500">Format: JPG, PNG, WEBP (Max 5MB)</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            {coverPreview && (
              <button
                onClick={() => setCoverPreview(null)}
                className="w-full py-2 bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold hover:bg-rose-500/25 transition-colors cursor-pointer"
              >
                Hapus Cover
              </button>
            )}
          </div>

          {/* Visibility & Type Card */}
          <div className="bg-[#0c101c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-xl shadow-black/50 space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Status Visibilitas
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500/60 transition-colors cursor-pointer shadow-inner"
              >
                <option value="active" className="bg-slate-900">
                  ✅ Active (Publik)
                </option>
                <option value="draft" className="bg-slate-900">
                  📝 Draft (Privat)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Status Cerita (Story)
              </label>
              <select
                value={formData.original_status}
                onChange={(e) => setFormData({ ...formData, original_status: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500/60 transition-colors cursor-pointer shadow-inner"
              >
                <option value="Ongoing" className="bg-slate-900">
                  Ongoing
                </option>
                <option value="Completed" className="bg-slate-900">
                  Completed (Tamat)
                </option>
                <option value="Hiatus" className="bg-slate-900">
                  Hiatus
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Tipe Format
              </label>
              <select
                value={formData.novel_type}
                onChange={(e) => setFormData({ ...formData, novel_type: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500/60 transition-colors cursor-pointer shadow-inner"
              >
                <option value="Web Novel" className="bg-slate-900">
                  Web Novel
                </option>
                <option value="Light Novel" className="bg-slate-900">
                  Light Novel
                </option>
                <option value="Original" className="bg-slate-900">
                  Original Story
                </option>
              </select>
            </div>

            <div className="pt-3 border-t border-white/[0.06]">
              <p className="text-xs text-slate-400 flex items-center justify-between font-mono">
                <span>Folder R2:</span>
                <span className="text-amber-400 font-bold">/novels/general/</span>
              </p>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Metadata & Sinopsis */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0c101c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-7 shadow-xl shadow-black/50 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Judul Novel *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={handleTitleChange}
                  placeholder="Contoh: Rebirth of System Sovereign"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Slug URL (Auto) *
                </label>
                <input
                  type="text"
                  value={formData.nu_slug}
                  onChange={(e) => setFormData({ ...formData, nu_slug: e.target.value })}
                  placeholder="rebirth-of-system-sovereign"
                  className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs font-mono text-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Penulis (Author)
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Nama Penulis"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/60 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Rating Awal (0 - 5.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/60 shadow-inner font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Total Chapter
                </label>
                <input
                  type="number"
                  value={formData.total_chapters}
                  onChange={(e) => setFormData({ ...formData, total_chapters: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/60 shadow-inner font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Sinopsis Cerita
              </label>
              <textarea
                value={formData.synopsis}
                onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                rows={6}
                placeholder="Tulis gambaran cerita lengkap novel ini..."
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 resize-none leading-relaxed shadow-inner"
              />
            </div>

            {/* Genre Studio */}
            <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.06] space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">Genre Tags</label>
                <button
                  onClick={autoGenerateGenres}
                  disabled={generatingGenre}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-40"
                >
                  {generatingGenre ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  <span>✨ Auto Generate Genre</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                {genres.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 bg-violet-500/15 border border-violet-500/25 rounded-xl text-xs font-semibold text-violet-300 flex items-center gap-2 shadow-sm"
                  >
                    <span>{g}</span>
                    <button
                      onClick={() => removeGenre(g)}
                      className="hover:text-rose-400 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempGenre}
                  onChange={(e) => setTempGenre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addGenre(tempGenre);
                      setTempGenre("");
                    }
                  }}
                  placeholder="Ketik genre lalu Enter..."
                  className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60 shadow-inner"
                />
                <button
                  onClick={() => {
                    addGenre(tempGenre);
                    setTempGenre("");
                  }}
                  className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl text-xs font-bold text-slate-200 transition-colors cursor-pointer"
                >
                  Tambah
                </button>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 flex justify-center items-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:from-amber-500 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-white font-extrabold shadow-xl shadow-amber-500/25 transition-all text-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>{loading ? "Menyimpan ke Database..." : "💾 Simpan Novel Manual"}</span>
            </button>
          </div>

          {/* Result Alert */}
          {result && (
            <div
              className={`p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 ${
                result.success
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
              }`}
            >
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <p className="text-xs font-bold">{result.success ? result.msg : result.error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
