'use client';

import { useEffect, useState } from 'react';
import { Settings, Save, Calendar, Users, Film, Tv, Share2, Loader2, Sparkles } from 'lucide-react';

interface AppConfig {
  daily_checkin_rewards: number[];
  referral_bonus: number;
  watch_ad_reward: number;
  ad_interval_chapters: number;
  telegram_link: string;
}

const DEFAULT: AppConfig = {
  daily_checkin_rewards: [10, 20, 30, 40, 50, 60, 70],
  referral_bonus: 50,
  watch_ad_reward: 40,
  ad_interval_chapters: 5,
  telegram_link: 'https://t.me/novesiaforum',
};

export default function ConfigPage() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => {
        setConfig({ ...DEFAULT, ...data });
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

  const updateDayReward = (index: number, value: number) => {
    const rewards = [...config.daily_checkin_rewards];
    rewards[index] = value;
    setConfig({ ...config, daily_checkin_rewards: rewards });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        <span className="text-xs font-bold">Memuat konfigurasi aplikasi...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold bg-[#0c1815] border border-emerald-900/60 text-emerald-200 animate-in slide-in-from-right">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Pengaturan & Ekonomi Koin
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Atur reward absen harian, referral, dan interval iklan secara realtime.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 rounded-lg text-xs font-bold shadow-[0_2px_12px_-2px_rgba(221,168,58,0.45)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
        </button>
      </div>

      {/* ═══ ABSEN HARIAN ═══ */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Absen Harian (7 Hari Cycle)</h2>
            <p className="text-xs text-slate-400">Reward koin yang didapat pembaca saat check-in setiap hari</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {config.daily_checkin_rewards.map((reward, i) => (
            <div key={i} className="p-3 rounded-lg bg-[#0a0c10] border border-white/5 text-center space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Hari {i + 1}
              </label>
              <input
                type="number"
                value={reward}
                onChange={(e) => updateDayReward(i, parseInt(e.target.value) || 0)}
                className="w-full bg-[#12151b] border border-white/10 rounded-lg py-1.5 text-center text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400/70 font-mono"
              />
              <span className="text-[10px] text-slate-500 block font-medium">🪙 Koin</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ REFERRAL & ADS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Referral */}
        <div className="bg-[#12151b] border border-white/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Kode Referral</h2>
              <p className="text-xs text-slate-400">Bonus koin saat klaim kode referral teman</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">
              Bonus Reward per Klaim
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={config.referral_bonus}
                onChange={(e) => setConfig({ ...config, referral_bonus: parseInt(e.target.value) || 0 })}
                className="w-28 bg-[#0a0c10] border border-white/10 rounded-lg py-2 px-3 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400/70 font-mono text-center"
              />
              <span className="text-xs text-slate-400">🪙 koin per klaim</span>
            </div>
          </div>
        </div>

        {/* Watch Ads */}
        <div className="bg-[#12151b] border border-white/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Rewarded Ads</h2>
              <p className="text-xs text-slate-400">Reward koin setiap menonton iklan sampai selesai</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">
              Reward per Tonton Iklan
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={config.watch_ad_reward}
                onChange={(e) => setConfig({ ...config, watch_ad_reward: parseInt(e.target.value) || 0 })}
                className="w-28 bg-[#0a0c10] border border-white/10 rounded-lg py-2 px-3 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400/70 font-mono text-center"
              />
              <span className="text-xs text-slate-400">🪙 koin per tonton</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ INTERSTITIAL AD ═══ */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Interval Iklan Interstitial</h2>
            <p className="text-xs text-slate-400">Frekuensi iklan fullscreen otomatis saat membaca chapter</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 block">
            Tampilkan Iklan Setiap
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={config.ad_interval_chapters}
              onChange={(e) => setConfig({ ...config, ad_interval_chapters: parseInt(e.target.value) || 1 })}
              min={1}
              max={100}
              className="w-20 bg-[#0a0c10] border border-white/10 rounded-lg py-2 px-3 text-sm font-bold text-amber-300 focus:outline-none focus:border-amber-400/70 font-mono text-center"
            />
            <span className="text-xs font-medium text-slate-300">chapter selesai dibaca</span>
          </div>
          <p className="text-xs text-slate-500">
            Rekomendasi: 3 - 5 chapter agar pengalaman membaca tetap nyaman dan engagement tinggi.
          </p>
        </div>
      </div>

      {/* ═══ SOCIAL LINKS ═══ */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Komunitas & Social Links</h2>
            <p className="text-xs text-slate-400">Tautan resmi grup telegram/komunitas di profil aplikasi</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 block">
            Telegram Channel / Group Link
          </label>
          <input
            type="text"
            value={config.telegram_link}
            onChange={(e) => setConfig({ ...config, telegram_link: e.target.value })}
            className="w-full bg-[#0a0c10] border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-400/70 font-mono"
            placeholder="https://t.me/..."
          />
        </div>
      </div>
    </div>
  );
}
