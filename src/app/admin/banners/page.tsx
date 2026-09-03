"use client";

import { useEffect, useRef, useState } from "react";
import {
  Rocket,
  Pencil,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  Plus,
  RefreshCw,
  AlertTriangle,
  X,
  Calendar,
  Clock,
  Check,
} from "lucide-react";

interface BannerItem {
  id: string;
  slot: number;
  title: string;
  imageKey: string;
  imageUrl: string;
  targetUrl: string | null;
  active: boolean;
  startAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BannerFormFields {
  title: string;
  targetUrl: string | null;
  active: boolean;
  startAt: string | null;
  expiresAt: string | null;
}

const SLOTS = [1, 2, 3];

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}

function computeStatus(a: BannerItem): { label: string; color: "green" | "blue" | "slate" } {
  if (!a.active) return { label: "Nonaktif", color: "slate" };
  const now = Date.now();
  if (a.startAt && new Date(a.startAt).getTime() > now) return { label: "Terjadwal", color: "blue" };
  if (a.expiresAt && new Date(a.expiresAt).getTime() <= now) return { label: "Kedaluwarsa", color: "slate" };
  return { label: "Tayang", color: "green" };
}

const EMPTY_FORM: BannerFormFields = {
  title: "",
  targetUrl: null,
  active: true,
  startAt: null,
  expiresAt: null,
};

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

export default function BannersPage() {
  const [bySlot, setBySlot] = useState<Record<number, BannerItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [form, setForm] = useState<BannerFormFields>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmDelSlot, setConfirmDelSlot] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/banners");
      const rows = await res.json();
      if (!res.ok) throw new Error(rows.error || "Gagal memuat banner");
      const map: Record<number, BannerItem> = {};
      (rows || []).forEach((r: BannerItem) => (map[r.slot] = r));
      setBySlot(map);
    } catch (e: any) {
      setError(e.message || "Gagal memuat banner");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const openSlot = (slot: number) => {
    const existing = bySlot[slot];
    setEditingSlot(slot);
    setForm(
      existing
        ? {
            title: existing.title,
            targetUrl: existing.targetUrl,
            active: existing.active,
            startAt: existing.startAt,
            expiresAt: existing.expiresAt,
          }
        : EMPTY_FORM
    );
    setImageFile(null);
    setImagePreview(existing?.imageUrl ?? null);
    setFormError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async () => {
    if (editingSlot === null) return;
    if (!form.title.trim()) return setFormError("Judul banner wajib diisi");
    if (!bySlot[editingSlot] && !imageFile) return setFormError("Gambar creative wajib diupload");

    setBusy(true);
    setFormError("");
    try {
      const formData = new FormData();
      formData.set("title", form.title);
      if (form.targetUrl) formData.set("targetUrl", form.targetUrl);
      formData.set("active", String(form.active));
      if (form.startAt) formData.set("startAt", form.startAt);
      if (form.expiresAt) formData.set("expiresAt", form.expiresAt);
      if (imageFile) formData.set("image", imageFile);

      const res = await fetch(`/api/banners/slot/${editingSlot}`, {
        method: "PUT",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan banner");

      showToast(`Slide ${editingSlot} berhasil disimpan`);
      setEditingSlot(null);
      await load();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (a: BannerItem) => {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("title", a.title);
      if (a.targetUrl) formData.set("targetUrl", a.targetUrl);
      formData.set("active", String(!a.active));
      if (a.startAt) formData.set("startAt", a.startAt);
      if (a.expiresAt) formData.set("expiresAt", a.expiresAt);

      const res = await fetch(`/api/banners/slot/${a.slot}`, {
        method: "PUT",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status banner");

      showToast(`Slide ${a.slot} ${!a.active ? "diaktifkan" : "dinonaktifkan"}`);
      await load();
    } catch (e: any) {
      showToast(`❌ Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const delSlot = async (slot: number) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/banners/slot/${slot}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus banner");

      showToast(`Banner di Slide ${slot} berhasil dihapus`);
      setConfirmDelSlot(null);
      await load();
    } catch (e: any) {
      showToast(`❌ Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

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
            <Rocket className="w-6 h-6 text-amber-400" />
            <span>Banner Beranda</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Kelola 3 slide carousel banner utama di Beranda aplikasi Novesia.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-3.5 py-2 bg-[#12151b] hover:bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-slate-300 flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? "animate-spin" : ""}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Information Banner */}
      <div className="bg-[#12151b] border border-amber-400/20 rounded-xl p-4 flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
          <Rocket size={18} />
        </div>
        <div className="text-xs text-slate-300 space-y-1 leading-relaxed">
          <p className="font-semibold text-slate-100">
            Banner carousel tampil di bagian atas Beranda app Novesia (3 slide tetap, auto-slide setiap 3.5 detik).
          </p>
          <p className="text-slate-400">
            Rekomendasi gambar creative:{" "}
            <strong className="text-amber-300 font-mono">1200 × 480 px</strong> (rasio 2.5:1), format JPG/PNG/WebP, maksimal 5MB. Slide kosong atau nonaktif akan otomatis dilewati oleh aplikasi.
          </p>
        </div>
      </div>

      {/* 3 Slots Grid */}
      {loading ? (
        <div className="bg-[#12151b] border border-white/5 rounded-xl p-16 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
          <p className="text-xs">Memuat banner beranda...</p>
        </div>
      ) : error ? (
        <div className="bg-[#12151b] border border-red-900/40 rounded-xl p-8 text-center text-xs text-red-300">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SLOTS.map((slot) => {
            const a = bySlot[slot];
            const status = a ? computeStatus(a) : null;

            return (
              <div
                key={slot}
                className="bg-[#12151b] border border-white/5 rounded-xl overflow-hidden flex flex-col hover:border-white/10 transition-colors"
              >
                {/* Slot Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0a0c10]">
                  <span className="text-xs font-bold text-slate-100">Slide {slot}</span>
                  {status && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        status.color === "green"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : status.color === "blue"
                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {status.label}
                    </span>
                  )}
                </div>

                {/* Banner Image Preview */}
                <div className="aspect-[2.5/1] bg-[#0a0c10] relative flex items-center justify-center overflow-hidden border-b border-white/5">
                  {a ? (
                    <img
                      src={a.imageUrl}
                      alt={a.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500 text-xs gap-1.5 p-4 text-center">
                      <ImageIcon size={24} className="text-slate-600" />
                      <span>Belum ada banner di Slide {slot}</span>
                    </div>
                  )}
                </div>

                {/* Slot Body & Meta */}
                <div className="p-4 flex-1 flex flex-col gap-2.5">
                  {a ? (
                    <>
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-100 text-xs truncate" title={a.title}>
                          {a.title}
                        </div>
                        {a.targetUrl ? (
                          <a
                            href={a.targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-amber-400 hover:underline inline-flex items-center gap-1 truncate max-w-full"
                          >
                            <ExternalLink size={10} className="shrink-0" />
                            <span className="truncate">{a.targetUrl}</span>
                          </a>
                        ) : (
                          <div className="text-[11px] text-slate-500">Tidak ada tautan link tujuan</div>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono space-y-0.5 pt-1 border-t border-white/5">
                        <div className="flex items-center gap-1">
                          <Calendar size={10} />
                          <span>Mulai: {fmt(a.startAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          <span>Berakhir: {fmt(a.expiresAt)}</span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                        <button
                          disabled={busy}
                          onClick={() => toggleActive(a)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            a.active
                              ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                          }`}
                          title={a.active ? "Nonaktifkan slide ini" : "Aktifkan slide ini"}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${a.active ? "bg-emerald-400" : "bg-slate-500"}`}
                          />
                          <span>{a.active ? "Aktif" : "Mati"}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            disabled={busy}
                            onClick={() => openSlot(slot)}
                            className="p-1.5 bg-[#0a0c10] hover:bg-white/10 text-slate-300 rounded transition-colors cursor-pointer"
                            title="Edit banner"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => setConfirmDelSlot(slot)}
                            className="p-1.5 bg-[#0a0c10] hover:bg-red-950/60 text-slate-400 hover:text-red-300 rounded transition-colors cursor-pointer"
                            title="Hapus banner"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => openSlot(slot)}
                      className="mt-auto w-full py-2.5 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-[0_2px_10px_-2px_rgba(221,168,58,0.4)]"
                    >
                      <Plus size={14} />
                      <span>Buat Banner Slide {slot}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Edit / Create Banner */}
      {editingSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12151b] border border-white/10 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Rocket size={16} className="text-amber-400" />
                <span>
                  {bySlot[editingSlot] ? `Edit Banner - Slide ${editingSlot}` : `Buat Banner Baru - Slide ${editingSlot}`}
                </span>
              </h3>
              <button onClick={() => setEditingSlot(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-950/50 border border-red-900/60 rounded-lg text-xs text-red-300">
                {formError}
              </div>
            )}

            <div className="space-y-3.5">
              {/* Image Uploader & Preview */}
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                  Gambar Creative Banner (1200 × 480 px, rasio 2.5:1)
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[2.5/1] rounded-xl border border-dashed border-white/15 bg-[#0a0c10] flex items-center justify-center overflow-hidden hover:border-amber-400/50 transition-colors cursor-pointer relative group"
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-semibold text-white transition-opacity">
                        Ganti Gambar
                      </div>
                    </>
                  ) : (
                    <span className="text-slate-400 text-xs inline-flex items-center gap-2">
                      <ImageIcon size={18} className="text-amber-400" />
                      <span>Klik untuk memilih file banner</span>
                    </span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
                {bySlot[editingSlot] && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    * Kosongkan jika tidak ingin mengganti gambar banner yang sudah ada.
                  </p>
                )}
              </div>

              {/* Title input */}
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">
                  Judul Banner (Label internal)
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Mis. Rilis Novel Populer Q4 / Promo VIP"
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all"
                />
              </div>

              {/* Target URL input */}
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">
                  URL Tujuan Tap (Opsional)
                </label>
                <input
                  type="text"
                  value={form.targetUrl || ""}
                  onChange={(e) => setForm({ ...form, targetUrl: e.target.value || null })}
                  placeholder="https://... atau /novel/slug-novel"
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all font-mono"
                />
              </div>

              {/* Status Select */}
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Status Tayang</label>
                <select
                  value={form.active ? "true" : "false"}
                  onChange={(e) => setForm({ ...form, active: e.target.value === "true" })}
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="true">Aktif (Tampil di Carousel)</option>
                  <option value="false">Nonaktif (Disembunyikan)</option>
                </select>
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">
                    Mulai Tampil (Opsional)
                  </label>
                  <input
                    type="datetime-local"
                    value={toLocalInputValue(form.startAt)}
                    onChange={(e) => setForm({ ...form, startAt: fromLocalInputValue(e.target.value) })}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">
                    Berakhir Otomatis (Opsional)
                  </label>
                  <input
                    type="datetime-local"
                    value={toLocalInputValue(form.expiresAt)}
                    onChange={(e) => setForm({ ...form, expiresAt: fromLocalInputValue(e.target.value) })}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="px-4 py-2 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-[0_2px_10px_-2px_rgba(221,168,58,0.4)] disabled:opacity-50"
              >
                {busy ? "Menyimpan..." : bySlot[editingSlot] ? "Simpan Perubahan" : "Buat Banner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12151b] border border-red-900/60 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Hapus Banner Slide {confirmDelSlot}?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Hapus banner di Slide {confirmDelSlot}? Berkas gambar creative banner juga akan ikut dihapus permanen dari Cloudflare R2 storage.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDelSlot(null)}
                disabled={busy}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => delSlot(confirmDelSlot)}
                disabled={busy}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-[0_2px_12px_-2px_rgba(220,38,38,0.5)] disabled:opacity-50"
              >
                {busy ? "Menghapus..." : "Hapus Banner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
