"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowUp,
  Home,
  Folder,
  Image as ImageIcon,
  FileText,
  Eye,
  Trash2,
  Database,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  X,
} from "lucide-react";

interface StorageObject {
  key: string;
  size: number;
  lastModified: string;
}

interface StorageList {
  folders: string[];
  objects: StorageObject[];
  isTruncated: boolean;
  nextToken?: string;
}

export default function StoragePage() {
  const [prefix, setPrefix] = useState("");
  const [inputPrefix, setInputPrefix] = useState("");
  const [data, setData] = useState<StorageList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async (p: string, t = "") => {
    setLoading(true);
    setError("");
    setChecked(new Set());
    try {
      const q = new URLSearchParams();
      if (p) q.set("prefix", p);
      if (t) q.set("token", t);
      const res = await fetch(`/api/storage/r2?${q.toString()}`);
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Gagal memuat file R2");
      setData(resJson);
      setToken(t);
    } catch (e: any) {
      setError(e.message || "Gagal memuat R2 storage");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(prefix);
  }, [prefix, load]);

  const enterFolder = (folder: string) => {
    setPrefix(folder);
    setInputPrefix(folder);
  };

  const goUp = () => {
    if (!prefix) return;
    const parts = prefix.split("/").filter(Boolean);
    parts.pop();
    const nextPrefix = parts.length ? parts.join("/") + "/" : "";
    setPrefix(nextPrefix);
    setInputPrefix(nextPrefix);
  };

  const goHome = () => {
    setPrefix("");
    setInputPrefix("");
  };

  const handleApplyPrefix = () => {
    setPrefix(inputPrefix);
  };

  const toggle = (key: string) => {
    const next = new Set(checked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setChecked(next);
  };

  const toggleAll = () => {
    if (!data) return;
    if (checked.size === data.objects.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(data.objects.map((o) => o.key)));
    }
  };

  const openPreview = async (key: string) => {
    setPreviewKey(key);
    setPreviewUrl(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/storage/r2/presign?key=${encodeURIComponent(key)}`);
      const resJson = await res.json();
      if (res.ok && (resJson.publicUrl || resJson.url)) {
        setPreviewUrl(resJson.publicUrl || resJson.url);
      }
    } catch {
      setPreviewUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      const keys = [...checked];
      const res = await fetch("/api/storage/r2", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Gagal menghapus file");
      showToast(`Berhasil menghapus ${resJson.deleted} file dari R2`);
      setConfirmDel(false);
      await load(prefix, token);
    } catch (e: any) {
      showToast(`❌ Error: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const fmtSize = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(2)} MB`;
  };

  const isImage = (key: string) => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(key);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold bg-[#0c1815] border border-emerald-900/60 text-emerald-200 animate-in slide-in-from-right">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Database className="w-6 h-6 text-amber-400" />
            <span>Cloudflare Storage R2</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Jelajahi bucket <code className="text-amber-300 font-mono">novesia-assets</code>, periksa file cover/banner, unduh atau hapus berkas secara batch.
          </p>
        </div>
        <button
          onClick={() => load(prefix)}
          disabled={loading}
          className="px-3.5 py-2 bg-[#12151b] hover:bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-slate-300 flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? "animate-spin" : ""}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Navigation & Prefix Search Bar */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={goUp}
            disabled={!prefix}
            className="p-2 bg-[#0a0c10] hover:bg-white/5 border border-white/10 rounded-lg text-slate-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
            title="Kembali ke folder atas"
          >
            <ArrowUp size={16} />
          </button>
          <button
            onClick={goHome}
            className="p-2 bg-[#0a0c10] hover:bg-white/5 border border-white/10 rounded-lg text-slate-300 cursor-pointer transition-colors"
            title="Root folder"
          >
            <Home size={16} />
          </button>
          <div className="flex-1 min-w-[240px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Prefix (mis. general/ atau cuttlefishreads/)"
              value={inputPrefix}
              onChange={(e) => setInputPrefix(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyPrefix()}
              className="w-full bg-[#0a0c10] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all font-mono"
            />
          </div>
          <button
            onClick={handleApplyPrefix}
            className="px-4 py-1.5 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-bold rounded-lg text-xs cursor-pointer transition-all shadow-[0_2px_10px_-2px_rgba(221,168,58,0.4)]"
          >
            Buka
          </button>
        </div>

        {prefix && (
          <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
            <span>Path aktif:</span>
            <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 font-mono text-[11px] border border-amber-400/20">
              {prefix}
            </span>
          </div>
        )}
      </div>

      {/* Selected Action Bar */}
      {checked.size > 0 && (
        <div className="bg-[#12151b] border border-amber-400/30 rounded-xl p-3.5 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>{checked.size} berkas dipilih</span>
          </div>
          <button
            onClick={() => setConfirmDel(true)}
            className="px-3.5 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Hapus Terpilih</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {error ? (
        <div className="bg-[#12151b] border border-red-900/40 rounded-xl p-8 text-center text-xs text-red-300">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="bg-[#12151b] border border-white/5 rounded-xl p-12 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
          <p className="text-xs">Memuat berkas dari Cloudflare R2...</p>
        </div>
      ) : !data ? null : (
        <div className="space-y-4">
          {/* Folders Grid */}
          {data.folders.length > 0 && (
            <div className="bg-[#12151b] border border-white/5 rounded-xl p-4 space-y-3">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Folder size={14} className="text-amber-400" />
                <span>Folder Direktori ({data.folders.length})</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {data.folders.map((f) => (
                  <button
                    key={f}
                    onClick={() => enterFolder(f)}
                    className="flex items-center gap-2 text-left px-3 py-2.5 bg-[#0a0c10] border border-white/5 rounded-lg hover:border-amber-400/40 hover:bg-white/5 text-xs text-slate-200 truncate transition-all cursor-pointer group"
                  >
                    <Folder size={16} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate font-mono">{f.replace(prefix, "")}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Objects Table */}
          {data.objects.length > 0 ? (
            <div className="bg-[#12151b] border border-white/5 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Berkas File ({data.objects.length})
                </h2>
                <button
                  onClick={toggleAll}
                  className="text-xs font-medium text-amber-400 hover:underline cursor-pointer flex items-center gap-1.5"
                >
                  {checked.size === data.objects.length ? (
                    <>
                      <CheckSquare size={13} />
                      <span>Batal pilih semua</span>
                    </>
                  ) : (
                    <>
                      <Square size={13} />
                      <span>Pilih semua</span>
                    </>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="text-slate-400 text-left border-b border-white/5 sticky top-0 bg-[#12151b] z-10">
                    <tr>
                      <th className="py-3 px-4 w-8"></th>
                      <th className="py-3 px-4 font-semibold">Nama Berkas (Key)</th>
                      <th className="py-3 px-4 font-semibold">Ukuran</th>
                      <th className="py-3 px-4 font-semibold">Terakhir Diubah</th>
                      <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.objects.map((o) => (
                      <tr key={o.key} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-4">
                          <input
                            type="checkbox"
                            checked={checked.has(o.key)}
                            onChange={() => toggle(o.key)}
                            className="accent-amber-400 rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-200 max-w-md break-all">
                          <span className="inline-flex items-center gap-2">
                            {isImage(o.key) ? (
                              <ImageIcon size={14} className="text-amber-400 shrink-0" />
                            ) : (
                              <FileText size={14} className="text-slate-400 shrink-0" />
                            )}
                            <span>{o.key.replace(prefix, "")}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-400">{fmtSize(o.size)}</td>
                        <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(o.lastModified).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => openPreview(o.key)}
                            className="p-1.5 bg-[#0a0c10] hover:bg-white/10 text-slate-300 border border-white/10 rounded transition-colors cursor-pointer"
                            title="Pratinjau / Preview"
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.isTruncated && (
                <div className="p-4 text-center border-t border-white/5">
                  <button
                    onClick={() => load(prefix, data.nextToken || "")}
                    className="px-4 py-2 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 text-xs font-bold rounded-lg border border-amber-400/20 cursor-pointer transition-colors"
                  >
                    Muat lebih banyak berkas →
                  </button>
                </div>
              )}
            </div>
          ) : (
            data.folders.length === 0 && (
              <div className="bg-[#12151b] border border-white/5 rounded-xl p-12 text-center text-slate-500 text-xs">
                Folder ini kosong (tidak ada objek di prefix ini).
              </div>
            )
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12151b] border border-white/10 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-slate-100 truncate pr-6 font-mono">
                {previewKey}
              </h3>
              <button
                onClick={() => setPreviewKey(null)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {previewLoading ? (
              <div className="py-12 text-center">
                <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 mt-2">Membuat URL pratinjau...</p>
              </div>
            ) : previewUrl ? (
              <div className="space-y-3">
                {isImage(previewKey) && (
                  <div className="max-h-[50vh] overflow-hidden rounded-lg bg-[#0a0c10] border border-white/5 flex items-center justify-center p-2">
                    <img
                      src={previewUrl}
                      alt={previewKey}
                      className="max-h-[46vh] max-w-full object-contain rounded"
                    />
                  </div>
                )}
                <div className="p-2.5 bg-[#0a0c10] rounded-lg border border-white/5 text-[11px] font-mono text-slate-300 break-all">
                  {previewUrl}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-amber-400 hover:underline inline-flex items-center gap-1.5"
                  >
                    <span>Buka langsung di tab baru</span>
                    <ExternalLink size={12} />
                  </a>
                  <button
                    onClick={() => setPreviewKey(null)}
                    className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-red-300">
                Gagal memuat URL pratinjau file.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12151b] border border-red-900/60 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Hapus {checked.size} Berkas dari R2?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Berkas yang dihapus <strong className="text-red-300 font-semibold">TIDAK DAPAT DIKEMBALIKAN</strong>. Pastikan berkas yang dipilih bukan cover atau aset aktif novel.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDel(false)}
                disabled={deleting}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={doDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-[0_2px_12px_-2px_rgba(220,38,38,0.5)] disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : `Hapus ${checked.size} Berkas`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
