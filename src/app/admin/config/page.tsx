'use client';

import { useEffect, useState } from 'react';
import { Save, Share2, Loader2, Sparkles, Megaphone, Clock } from 'lucide-react';

interface AppConfig {
  telegram_link: string;
  ad_cooldown_minutes?: number;
  ad_interstitial_enabled?: boolean;
}

const DEFAULT: AppConfig = {
  telegram_link: 'https://t.me/novesiaforum',
  ad_cooldown_minutes: 30,
  ad_interstitial_enabled: true,
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
          ad_cooldown_minutes: typeof data.ad_cooldown_minutes === 'number' ? data.ad_cooldown_minutes : 30,
          ad_interstitial_enabled: data.ad_interstitial_enabled !== undefined ? Boolean(data.ad_interstitial_enabled) : true,
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

      {/* ═══ ADMOB & MONETIZATION SETTINGS ═══ */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-5 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Iklan & Monetisasi (AdMob)</h2>
              <p className="text-xs text-neutral-400">Atur jeda dan frekuensi tampil iklan interstitial di aplikasi mobile</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.ad_interstitial_enabled ?? true}
              onChange={(e) => setConfig({ ...config, ad_interstitial_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B99762]"></div>
            <span className="ml-2.5 text-xs font-semibold text-neutral-300">
              {config.ad_interstitial_enabled ? 'Aktif' : 'Nonaktif'}
            </span>
          </label>
        </div>

        <div className="space-y-3 pt-1 border-t border-neutral-800/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Interval Cooldown Iklan (Menit)
            </label>
            <span className="text-xs font-mono font-bold text-[#B99762] bg-[#B99762]/10 px-2.5 py-1 rounded-md border border-[#B99762]/20">
              Tampil setiap {config.ad_cooldown_minutes || 30} Menit
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={180}
              value={config.ad_cooldown_minutes || 30}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                setConfig({ ...config, ad_cooldown_minutes: val });
              }}
              className="w-32 bg-[#0a0c10] border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#B99762] font-mono transition-colors"
            />
            <span className="text-xs text-neutral-400">menit sekali saat pembaca membuka bab baru</span>
          </div>

          {/* Quick Preset Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-neutral-500 mr-1">Pilihan Cepat:</span>
            {[15, 20, 30, 45, 60].map((mins) => {
              const isActive = (config.ad_cooldown_minutes || 30) === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setConfig({ ...config, ad_cooldown_minutes: mins })}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#B99762] text-black font-bold shadow-md shadow-[#B99762]/20'
                      : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800 border border-neutral-700/50'
                  }`}
                >
                  {mins} Menit
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-neutral-500 leading-relaxed pt-1">
            Iklan interstitial hanya akan tayang maksimal 1 kali per interval yang ditentukan per perangkat pembaca saat membuka bab baru. Pembaca akan melihat notifikasi <i>&quot;Next ad will appear in {config.ad_cooldown_minutes || 30} minutes&quot;</i>.
          </p>
        </div>
      </div>
    </div>
  );
}
