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
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold bg-[#0b1b17]/95 border border-emerald-500/40 text-emerald-300 animate-in slide-in-from-right">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-md">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1
              className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Pengaturan & Ekonomi Koin
            </h1>
            <p className="text-slate-400 text-xs font-medium mt-0.5">
              Atur reward absen harian, referral, dan interval iklan secara realtime.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-2xl text-xs font-extrabold shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
        </button>
      </div>

      {/* ═══ ABSEN HARIAN ═══ */}
      <div className="bg-[#0c101c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-7 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white">Absen Harian (7 Hari Cycle)</h2>
            <p className="text-xs text-slate-400 font-medium">Reward koin yang didapat pembaca saat check-in setiap hari</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {config.daily_checkin_rewards.map((reward, i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Hari {i + 1}
              </label>
              <input
                type="number"
                value={reward}
                onChange={(e) => updateDayReward(i, parseInt(e.target.value) || 0)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2 text-center text-sm font-extrabold text-amber-300 focus:outline-none focus:border-amber-500/60 font-mono shadow-inner"
              />
              <span className="text-[10px] text-slate-500 block font-semibold">🪙 Koin</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ REFERRAL & ADS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Referral */}
        <div className="bg-[#0c101c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-7 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Kode Referral</h2>
              <p className="text-xs text-slate-400 font-medium">Bonus koin saat klaim kode referral teman</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Bonus Reward per Klaim
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={config.referral_bonus}
                onChange={(e) => setConfig({ ...config, referral_bonus: parseInt(e.target.value) || 0 })}
                className="w-32 bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 px-4 text-sm font-bold text-amber-300 focus:outline-none focus:border-amber-500/60 font-mono shadow-inner text-center"
              />
              <span className="text-xs font-semibold text-slate-400">🪙 koin per klaim</span>
            </div>
          </div>
        </div>

        {/* Watch Ads */}
        <div className="bg-[#0c101c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-7 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Rewarded Ads</h2>
              <p className="text-xs text-slate-400 font-medium">Reward koin setiap menonton iklan sampai selesai</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Reward per Tonton Iklan
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={config.watch_ad_reward}
                onChange={(e) => setConfig({ ...config, watch_ad_reward: parseInt(e.target.value) || 0 })}
                className="w-32 bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 px-4 text-sm font-bold text-amber-300 focus:outline-none focus:border-amber-500/60 font-mono shadow-inner text-center"
              />
              <span className="text-xs font-semibold text-slate-400">🪙 koin per tonton</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ INTERSTITIAL AD ═══ */}
      <div className="bg-[#0c101c]/80 backdrop-blur-2xl border border-rose-500/20 rounded-3xl p-7 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white">Interval Iklan Interstitial</h2>
            <p className="text-xs text-slate-400 font-medium">Frekuensi iklan fullscreen otomatis saat membaca chapter</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Tampilkan Iklan Setiap
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={config.ad_interval_chapters}
              onChange={(e) => setConfig({ ...config, ad_interval_chapters: parseInt(e.target.value) || 1 })}
              min={1}
              max={100}
              className="w-24 bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 px-4 text-lg font-black text-rose-400 focus:outline-none focus:border-rose-500/60 font-mono shadow-inner text-center"
            />
            <span className="text-xs font-bold text-slate-300">chapter selesai dibaca</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium pt-1">
            💡 Rekomendasi: 3 - 5 chapter agar pengalaman membaca tetap nyaman dan engagement tinggi.
          </p>
        </div>
      </div>

      {/* ═══ SOCIAL LINKS ═══ */}
      <div className="bg-[#0c101c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-7 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white">Komunitas & Social Links</h2>
            <p className="text-xs text-slate-400 font-medium">Tautan resmi grup telegram/komunitas di profil aplikasi</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Telegram Channel / Group Link
          </label>
          <input
            type="text"
            value={config.telegram_link}
            onChange={(e) => setConfig({ ...config, telegram_link: e.target.value })}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 px-4 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500/60 font-mono shadow-inner"
            placeholder="https://t.me/..."
          />
        </div>
      </div>
    </div>
  );
}
