'use client';

import { useEffect, useState } from 'react';
import { Save, Share2, Loader2, Sparkles } from 'lucide-react';

interface AppConfig {
  telegram_link: string;
}

const DEFAULT: AppConfig = {
  telegram_link: 'https://t.me/novesiaforum',
};

export default function ConfigPage() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          telegram_link: data.telegram_link || DEFAULT.telegram_link,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Pengaturan berhasil disimpan!');
      } else {
        showToast('❌ Gagal: ' + data.error);
      }
    } catch (e: any) {
      showToast('❌ Error: ' + e.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#B99762]" />
        <span className="text-xs font-bold">Memuat konfigurasi aplikasi...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold bg-[#0c1815] border border-emerald-900/60 text-emerald-200 animate-in slide-in-from-right">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#B99762]" />
            Pengaturan Aplikasi
          </h1>
          <p className="text-neutral-400 text-xs mt-1">
            Kelola tautan komunitas dan konfigurasi umum aplikasi secara realtime.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-gradient-to-r from-[#B99762] to-[#8C6D3B] hover:opacity-95 text-black rounded-lg text-xs font-bold shadow-lg shadow-[#B99762]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
        </button>
      </div>

      {/* ═══ SOCIAL & COMMUNITY LINKS ═══ */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#B99762]/10 border border-[#B99762]/20 flex items-center justify-center text-[#B99762]">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Komunitas & Social Links</h2>
            <p className="text-xs text-neutral-400">Tautan resmi grup telegram / komunitas di profil aplikasi</p>
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-semibold text-neutral-300 block">
            Telegram Channel / Group Link
          </label>
          <input
            type="text"
            value={config.telegram_link}
            onChange={(e) => setConfig({ ...config, telegram_link: e.target.value })}
            className="w-full bg-[#0a0c10] border border-neutral-800 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#B99762] font-mono transition-colors"
            placeholder="https://t.me/novesiaforum"
          />
          <p className="text-[11px] text-neutral-500">
            Tautan ini akan dibuka saat pembaca mengklik menu Komunitas Telegram di tab Profil aplikasi.
          </p>
        </div>
      </div>
    </div>
  );
}
