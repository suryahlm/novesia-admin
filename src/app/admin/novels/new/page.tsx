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
    <div className="max-w-4xl space-y-8 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
          ✍️ Tambah Novel Manual
        </h1>
        <p className="text-gray-500 mt-1">Tulis novel sendiri secara manual dan masukkan ke dalam Source: General</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Kolom Kiri: Cover & Status */}
        <div className="space-y-6">
          {/* Cover Upload */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">Cover Novel (General DB)</h3>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-700/50 rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500/50 hover:bg-gray-800/50 transition-all overflow-hidden relative"
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Klik untuk upload cover (JPG/PNG)</p>
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
                className="mt-3 w-full py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20"
              >
                Hapus Cover
              </button>
            )}
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Status Visibilitas</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="active">Active (Publik)</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Translation Status</label>
              <select
                value={formData.original_status}
                onChange={(e) => setFormData({ ...formData, original_status: e.target.value })}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none flex-1"
              >
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Hiatus">Hiatus</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Tipe</label>
              <select
                value={formData.novel_type}
                onChange={(e) => setFormData({ ...formData, novel_type: e.target.value })}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none flex-1"
              >
                <option value="Web Novel">Web Novel</option>
                <option value="Light Novel">Light Novel</option>
                <option value="Original">Original Story</option>
              </select>
            </div>

            <div className="pt-2 border-t border-gray-800/50">
               <p className="text-xs text-gray-500 flex items-center justify-between">
                 <span>Source Folder R2:</span>
                 <span className="font-mono text-amber-500/70">/general/</span>
               </p>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Metadata & Sinopsis */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-gray-400 mb-1">Judul Novel *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={handleTitleChange}
                  placeholder="Contoh: Rebirth of System"
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  required
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-gray-400 mb-1">Slug (Auto) *</label>
                <input
                  type="text"
                  value={formData.nu_slug}
                  onChange={(e) => setFormData({ ...formData, nu_slug: e.target.value })}
                  placeholder="rebirth-of-system"
                  className="w-full bg-gray-800/30 border border-gray-700/30 rounded-xl px-4 py-2.5 text-sm text-gray-400 focus:outline-none"
                />
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-gray-400 mb-1">Penulis (Author)</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Nama Penulis"
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 col-span-2 md:col-span-1">
                 <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                 </div>
                 <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Total Chapters</label>
                  <input
                    type="number"
                    value={formData.total_chapters}
                    onChange={(e) => setFormData({ ...formData, total_chapters: e.target.value })}
                    className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                 </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Sinopsis Lengkap</label>
              <textarea
                value={formData.synopsis}
                onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                rows={6}
                placeholder="Tulis gambaran cerita novel..."
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none leading-relaxed"
              />
            </div>

            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-medium text-gray-400">Genre Tags</label>
                <button
                  onClick={autoGenerateGenres}
                  disabled={generatingGenre}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium transition-colors"
                >
                  {generatingGenre ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Wand2 className="w-3.5 h-3.5" />}
                  ✨ Auto-Generate Genre
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {genres.map(g => (
                  <span key={g} className="px-3 py-1 bg-gray-700 rounded-full text-xs text-gray-200 flex items-center gap-2">
                    {g}
                    <button onClick={() => removeGenre(g)} className="hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
              
              <div className="flex gap-2">
                 <input 
                   type="text"
                   value={tempGenre}
                   onChange={e => setTempGenre(e.target.value)}
                   onKeyDown={e => {if(e.key==='Enter'){ e.preventDefault(); addGenre(tempGenre); setTempGenre('');}}}
                   placeholder="Ketik genre lalu Enter..."
                   className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none"
                 />
                 <button onClick={() => {addGenre(tempGenre); setTempGenre('');}} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-medium text-white transition-colors">
                   Tambah
                 </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
             <button
               onClick={handleSave}
               disabled={loading}
               className="flex-1 flex justify-center items-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-bold shadow-lg shadow-amber-500/20 transition-all"
             >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {loading ? "Menyimpan Novel..." : "💾 Simpan Novel Manual"}
             </button>
          </div>

          {/* Result Alert */}
          {result && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${result.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
               {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
               <p className="text-sm font-medium">{result.success ? result.msg : result.error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
