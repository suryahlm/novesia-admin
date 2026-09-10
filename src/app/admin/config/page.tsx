'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Save,
  Share2,
  Loader2,
  Sparkles,
  Megaphone,
  Clock,
  Smartphone,
  BellRing,
  Gift,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Mail,
} from 'lucide-react';

interface AppConfig {
  // Pembaruan Aplikasi (In-App Update)
  app_version: string;
  app_version_code: number;
  min_supported_version_code: number;
  force_update_enabled: boolean;
  play_store_url: string;
  update_changelog: string;

  // Iklan & Monetisasi
  ad_interstitial_enabled: boolean;
  ad_cooldown_minutes: number;
  ad_interval_chapters: number;

  // Gamifikasi & Rewards
  daily_checkin_rewards: number[];
  referral_bonus: number;
  watch_ad_reward: number;

  // Komunitas & Sosial
  telegram_link: string;
  support_email: string;
}

interface SystemStatus {
  firebase: {
    projectId: string;
    serviceAccountConfigured: boolean;
    ready: boolean;
  };
  stats: {
    totalPushTokens: number;
    totalUsers: number;
    totalNovels: number;
    lastBroadcastAt: string | null;
  };
}

const DEFAULT_CONFIG: AppConfig = {
  app_version: '1.1.5',
  app_version_code: 15,
  min_supported_version_code: 15,
  force_update_enabled: false,
  play_store_url: 'https://play.google.com/store/apps/details?id=cc.novesia.app',
  update_changelog:
    'Peningkatan stabilitas aplikasi, performa membaca novel lebih lancar, serta penambahan notifikasi rilis bab terbaru secara realtime.',
  ad_interstitial_enabled: true,
  ad_cooldown_minutes: 30,
  ad_interval_chapters: 5,
  daily_checkin_rewards: [10, 20, 30, 40, 50, 60, 70],
  referral_bonus: 50,
  watch_ad_reward: 40,
  telegram_link: 'https://t.me/novesiaforum',
  support_email: 'support@novesia.cc',
};

export default function ConfigPage() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const showToast = useCallback((message: string, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      const data: Record<string, unknown> = await res.json();
      if (data && typeof data === 'object') {
        const checkin = Array.isArray(data.daily_checkin_rewards)
          ? data.daily_checkin_rewards.map((n) => Number(n) || 0)
          : DEFAULT_CONFIG.daily_checkin_rewards;

        setConfig({
          app_version:
            data.app_version !== undefined && data.app_version !== null
              ? String(data.app_version)
              : DEFAULT_CONFIG.app_version,
          app_version_code:
            typeof data.app_version_code === 'number'
              ? data.app_version_code
              : parseInt(String(data.app_version_code), 10) || DEFAULT_CONFIG.app_version_code,
          min_supported_version_code:
            typeof data.min_supported_version_code === 'number'
              ? data.min_supported_version_code
              : parseInt(String(data.min_supported_version_code), 10) || DEFAULT_CONFIG.min_supported_version_code,
          force_update_enabled:
            data.force_update_enabled !== undefined
              ? Boolean(data.force_update_enabled)
              : DEFAULT_CONFIG.force_update_enabled,
          play_store_url:
            typeof data.play_store_url === 'string' ? data.play_store_url : DEFAULT_CONFIG.play_store_url,
          update_changelog:
            typeof data.update_changelog === 'string' ? data.update_changelog : DEFAULT_CONFIG.update_changelog,
          ad_interstitial_enabled:
            data.ad_interstitial_enabled !== undefined
              ? Boolean(data.ad_interstitial_enabled)
              : DEFAULT_CONFIG.ad_interstitial_enabled,
          ad_cooldown_minutes:
            typeof data.ad_cooldown_minutes === 'number'
              ? data.ad_cooldown_minutes
              : parseInt(String(data.ad_cooldown_minutes), 10) || DEFAULT_CONFIG.ad_cooldown_minutes,
          ad_interval_chapters:
            typeof data.ad_interval_chapters === 'number'
              ? data.ad_interval_chapters
              : parseInt(String(data.ad_interval_chapters), 10) || DEFAULT_CONFIG.ad_interval_chapters,
          daily_checkin_rewards: checkin.length === 7 ? checkin : DEFAULT_CONFIG.daily_checkin_rewards,
          referral_bonus:
            typeof data.referral_bonus === 'number'
              ? data.referral_bonus
              : parseInt(String(data.referral_bonus), 10) || DEFAULT_CONFIG.referral_bonus,
          watch_ad_reward:
            typeof data.watch_ad_reward === 'number'
              ? data.watch_ad_reward
              : parseInt(String(data.watch_ad_reward), 10) || DEFAULT_CONFIG.watch_ad_reward,
          telegram_link:
            typeof data.telegram_link === 'string' ? data.telegram_link : DEFAULT_CONFIG.telegram_link,
          support_email:
            typeof data.support_email === 'string' ? data.support_email : DEFAULT_CONFIG.support_email,
        });
      }
    } catch {
      showToast('Gagal memuat konfigurasi dari server', true);
    }
  }, [showToast]);

  const fetchSystemStatus = useCallback(async () => {
    try {
      setRefreshingStatus(true);
      const res = await fetch('/api/config/system-status');
      const data = await res.json();
      if (res.ok) {
        setSystemStatus(data as SystemStatus);
      }
    } catch {
      // optional background fetch
    } finally {
      setRefreshingStatus(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchConfig(), fetchSystemStatus()]).finally(() => {
      setLoading(false);
    });
  }, [fetchConfig, fetchSystemStatus]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data: Record<string, unknown> = await res.json();
      if (res.ok && data.success) {
        showToast('✅ Semua pengaturan berhasil disimpan ke database!');
      } else {
        const errMsg = typeof data.error === 'string' ? data.error : 'Gagal menyimpan perubahan';
        showToast(`❌ ${errMsg}`, true);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan';
      showToast(`❌ ${errMsg}`, true);
    } finally {
      setSaving(false);
    }
  };

  const updateRewardDay = (dayIndex: number, value: number) => {
    const updated = [...config.daily_checkin_rewards];
    updated[dayIndex] = Math.max(0, value);
    setConfig({ ...config, daily_checkin_rewards: updated });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#B99762]" />
        <span className="text-xs font-bold tracking-wide">Memuat konfigurasi aplikasi...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold animate-in slide-in-from-right flex items-center gap-2 border ${
            toast.isError
              ? 'bg-[#180c0c] border-red-900/70 text-red-200'
              : 'bg-[#0c1815] border-emerald-900/70 text-emerald-200'
          }`}
        >
          {toast.isError ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0e1117] border border-neutral-800/80 rounded-2xl p-5 shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-[#D4A843]" />
            Pengaturan Aplikasi & Sistem
          </h1>
          <p className="text-neutral-400 text-xs mt-1">
            Kelola konfigurasi In-App Update, status FCM Firebase, monetisasi AdMob, dan gamifikasi reward.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchSystemStatus}
            disabled={refreshingStatus}
            title="Refresh status server & Firebase"
            className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshingStatus ? 'animate-spin text-[#B99762]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-[#D4A843] to-[#8C6D3B] hover:opacity-95 text-black rounded-xl text-xs font-bold shadow-lg shadow-[#B99762]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </div>

      {/* ═══ SECTION 1: IN-APP UPDATE & PLAY STORE ═══ */}
      <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-2xl p-5 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D4A843]/10 border border-[#D4A843]/20 flex items-center justify-center text-[#D4A843]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Pembaruan Aplikasi (In-App Update & Play Store)
                <span className="text-[10px] font-mono font-semibold bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/30 px-2 py-0.5 rounded-full">
                  Play Core API
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Atur versi rilis target, ambang batas versi minimum (force update), dan catatan rilis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#0a0c10] border border-neutral-800 px-3.5 py-2 rounded-xl">
            <div className="text-right">
              <span className="text-[11px] block font-semibold text-neutral-300">Wajibkan Update (Force Update)</span>
              <span className="text-[10px] text-neutral-500">
                {config.force_update_enabled ? 'User tidak bisa skip prompt update' : 'User bisa tunda (snooze 24 jam)'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.force_update_enabled}
                onChange={(e) => setConfig({ ...config, force_update_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4A843]"></div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Target Version Name */}
          <div className="space-y-1.5 bg-[#0a0c10] border border-neutral-800/80 rounded-xl p-3.5">
            <label className="text-xs font-semibold text-neutral-300 block">
              Target Version Name (Play Store)
            </label>
            <input
              type="text"
              value={config.app_version}
              onChange={(e) => setConfig({ ...config, app_version: e.target.value })}
              placeholder="1.1.5"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4A843] font-mono transition-colors"
            />
            <p className="text-[10px] text-neutral-500">Versi string rilis aplikasi terkini di Google Play Console.</p>
          </div>

          {/* Target Version Code */}
          <div className="space-y-1.5 bg-[#0a0c10] border border-neutral-800/80 rounded-xl p-3.5">
            <label className="text-xs font-semibold text-neutral-300 block">
              Target Version Code
            </label>
            <input
              type="number"
              value={config.app_version_code}
              onChange={(e) =>
                setConfig({ ...config, app_version_code: parseInt(e.target.value, 10) || 1 })
              }
              placeholder="15"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4A843] font-mono transition-colors"
            />
            <p className="text-[10px] text-neutral-500">Nomor build rilis APK / AAB di Google Play.</p>
          </div>

          {/* Min Supported Version Code */}
          <div className="space-y-1.5 bg-[#0a0c10] border border-neutral-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 block">
                Min Supported Version Code
              </label>
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                Min: {config.min_supported_version_code}
              </span>
            </div>
            <input
              type="number"
              value={config.min_supported_version_code}
              onChange={(e) =>
                setConfig({
                  ...config,
                  min_supported_version_code: parseInt(e.target.value, 10) || 1,
                })
              }
              placeholder="15"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4A843] font-mono transition-colors"
            />
            <p className="text-[10px] text-neutral-500">
              Perangkat dengan build di bawah angka ini akan dipaksa update langsung.
            </p>
          </div>
        </div>

        {/* Play Store URL Fallback */}
        <div className="space-y-1.5 bg-[#0a0c10] border border-neutral-800/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-300 block">
              Google Play Store Fallback URL
            </label>
            <a
              href={config.play_store_url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-[#D4A843] hover:underline flex items-center gap-1 font-medium"
            >
              <span>Tes Tautan Play Store</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <input
            type="text"
            value={config.play_store_url}
            onChange={(e) => setConfig({ ...config, play_store_url: e.target.value })}
            placeholder="https://play.google.com/store/apps/details?id=cc.novesia.app"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4A843] font-mono transition-colors"
          />
          <p className="text-[10px] text-neutral-500">
            Tautan cadangan dibuka jika Play Core native overlay tidak didukung atau pengguna membuka dari web.
          </p>
        </div>

        {/* Update Changelog / Pesan Pembaruan */}
        <div className="space-y-1.5 bg-[#0a0c10] border border-neutral-800/80 rounded-xl p-3.5">
          <label className="text-xs font-semibold text-neutral-300 block">
            Catatan Rilis / Pesan Pembaruan (Changelog)
          </label>
          <textarea
            rows={3}
            value={config.update_changelog}
            onChange={(e) => setConfig({ ...config, update_changelog: e.target.value })}
            placeholder="Tuliskan daftar perbaikan dan fitur baru untuk pembaca..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4A843] transition-colors leading-relaxed"
          />
          <p className="text-[10px] text-neutral-500">
            Pesan ini ditampilkan pada popup modal pembaruan aplikasi ketika versi baru terdeteksi.
          </p>
        </div>
      </div>

      {/* ═══ SECTION 2: FIREBASE & PUSH NOTIFICATIONS ═══ */}
      <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-2xl p-5 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Push Notifikasi & Firebase Cloud Messaging (FCM v1)
                <span className="text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  HTTP v1 API
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Status koneksi server backend ke Firebase untuk pengiriman notifikasi OS ke ponsel pembaca.
              </p>
            </div>
          </div>

          <Link
            href="/admin/push-notifications"
            className="px-4 py-2 bg-[#12151b] hover:bg-neutral-800 text-[#D4A843] border border-[#D4A843]/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Buka Panel Broadcast Notifikasi</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Live Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Firebase Project ID */}
          <div className="bg-[#0a0c10] border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Firebase Project ID
            </span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-white">
                {systemStatus?.firebase.projectId || 'novesia-507906'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <span className="text-[10px] text-neutral-500 mt-1">Proyek aktif Firebase Cloud Messaging</span>
          </div>

          {/* Service Account Status */}
          <div className="bg-[#0a0c10] border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Service Account Key
            </span>
            <div className="mt-2 flex items-center gap-2">
              {systemStatus?.firebase.serviceAccountConfigured ? (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Terpasang (Ready)
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  firebase-service-account.json
                </span>
              )}
            </div>
            <span className="text-[10px] text-neutral-500 mt-1">Otorisasi OAuth2 FCM v1 Backend</span>
          </div>

          {/* Registered Devices */}
          <div className="bg-[#0a0c10] border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Total Perangkat Aktif
            </span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-[#D4A843]">
                {systemStatus?.stats.totalPushTokens ?? 0}
              </span>
              <span className="text-xs text-neutral-400">devices</span>
            </div>
            <span className="text-[10px] text-neutral-500 mt-1">Token aktif tersimpan di database</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-900/30 text-xs text-neutral-300 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-purple-200">Keamanan Kunci Firebase & Login Google</p>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Integrasi FCM v1 ini sepenuhnya terisolasi di sisi server backend (`novesia-api`). Berkas keystore Android dan sertifikat SHA-1 di Google Play Console tetap aman dan terlindungi sehingga fitur Google Sign-in tidak akan terganggu.
            </p>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 3: ADMOB & MONETIZATION ═══ */}
      <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-2xl p-5 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Iklan & Monetisasi (Google AdMob)</h2>
              <p className="text-xs text-neutral-400">
                Atur jeda cooldown dan frekuensi tampil iklan interstitial antar bab di aplikasi mobile.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.ad_interstitial_enabled}
              onChange={(e) => setConfig({ ...config, ad_interstitial_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4A843]"></div>
            <span className="ml-2.5 text-xs font-semibold text-neutral-300">
              {config.ad_interstitial_enabled ? 'Iklan Aktif' : 'Iklan Dinonaktifkan'}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Ad Cooldown Minutes */}
          <div className="bg-[#0a0c10] border border-neutral-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Interval Cooldown Iklan (Menit)
              </label>
              <span className="text-xs font-mono font-bold text-[#D4A843] bg-[#D4A843]/10 px-2 py-0.5 rounded border border-[#D4A843]/20">
                {config.ad_cooldown_minutes} Menit
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={180}
                value={config.ad_cooldown_minutes}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                  setConfig({ ...config, ad_cooldown_minutes: val });
                }}
                className="w-28 bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4A843] font-mono transition-colors"
              />
              <span className="text-xs text-neutral-400">menit jeda sebelum iklan berikutnya dapat tayang</span>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-neutral-500 mr-1">Preset:</span>
              {[15, 20, 30, 45, 60].map((mins) => {
                const isActive = config.ad_cooldown_minutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setConfig({ ...config, ad_cooldown_minutes: mins })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#D4A843] text-black font-bold'
                        : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800 border border-neutral-700/50'
                    }`}
                  >
                    {mins}m
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ad Interval Chapters */}
          <div className="bg-[#0a0c10] border border-neutral-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#D4A843]" />
                Interval Bab Baca (Chapter)
              </label>
              <span className="text-xs font-mono font-bold text-[#D4A843] bg-[#D4A843]/10 px-2 py-0.5 rounded border border-[#D4A843]/20">
                Tiap {config.ad_interval_chapters} Bab
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={50}
                value={config.ad_interval_chapters}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                  setConfig({ ...config, ad_interval_chapters: val });
                }}
                className="w-28 bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4A843] font-mono transition-colors"
              />
              <span className="text-xs text-neutral-400">bab dibaca sebelum memicu kesempatan tayang iklan</span>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-neutral-500 mr-1">Preset:</span>
              {[3, 5, 7, 10, 15].map((ch) => {
                const isActive = config.ad_interval_chapters === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setConfig({ ...config, ad_interval_chapters: ch })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#D4A843] text-black font-bold'
                        : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800 border border-neutral-700/50'
                    }`}
                  >
                    {ch} Bab
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 4: GAMIFIKASI & REWARDS ═══ */}
      <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-2xl p-5 space-y-5 shadow-xl">
        <div className="flex items-center gap-3 border-b border-neutral-800/80 pb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Gamifikasi & Reward Pengguna (XP)</h2>
            <p className="text-xs text-neutral-400">
              Konfigurasi perolehan XP untuk Daily Check-in 7 hari berturut-turut, referral teman, dan tonton reward ad.
            </p>
          </div>
        </div>

        {/* 7 Days Daily Check-in */}
        <div className="space-y-3 bg-[#0a0c10] border border-neutral-800/80 rounded-xl p-4">
          <label className="text-xs font-semibold text-neutral-300 block">
            Hadiah XP Daily Check-in (Hari 1 s/d Hari 7)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {config.daily_checkin_rewards.map((reward, idx) => (
              <div
                key={idx}
                className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5 text-center flex flex-col justify-between"
              >
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Hari {idx + 1}
                </span>
                <div className="my-1.5 flex items-center justify-center">
                  <input
                    type="number"
                    min={0}
                    value={reward}
                    onChange={(e) => updateRewardDay(idx, parseInt(e.target.value, 10) || 0)}
                    className="w-full text-center bg-[#0a0c10] border border-neutral-800 rounded-lg py-1 px-1.5 text-xs text-[#D4A843] font-bold font-mono focus:outline-none focus:border-[#D4A843]"
                  />
                </div>
                <span className="text-[9px] text-neutral-500 font-semibold">XP</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Referral Bonus */}
          <div className="bg-[#0a0c10] border border-neutral-800/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 block">
                Bonus Referral XP
              </label>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                +{config.referral_bonus} XP
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                value={config.referral_bonus}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    referral_bonus: Math.max(0, parseInt(e.target.value, 10) || 0),
                  })
                }
                className="w-28 bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4A843] font-mono transition-colors"
              />
              <span className="text-xs text-neutral-400">XP diperoleh user pengajak saat referral mendaftar</span>
            </div>
          </div>

          {/* Watch Ad Reward */}
          <div className="bg-[#0a0c10] border border-neutral-800/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 block">
                Reward Tonton Iklan Video (Rewarded Ad)
              </label>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                +{config.watch_ad_reward} XP
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                value={config.watch_ad_reward}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    watch_ad_reward: Math.max(0, parseInt(e.target.value, 10) || 0),
                  })
                }
                className="w-28 bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4A843] font-mono transition-colors"
              />
              <span className="text-xs text-neutral-400">XP per penayangan video rewarded ad penuh</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 5: KOMUNITAS & SOCIAL LINKS ═══ */}
      <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-2xl p-5 space-y-5 shadow-xl">
        <div className="flex items-center gap-3 border-b border-neutral-800/80 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Komunitas & Dukungan Pengguna</h2>
            <p className="text-xs text-neutral-400">
              Tautan resmi grup telegram pembaca dan kontak email bantuan di aplikasi & website.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Telegram Channel */}
          <div className="space-y-1.5 bg-[#0a0c10] border border-neutral-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D4A843]" />
                Telegram Channel / Community Link
              </label>
              <a
                href={config.telegram_link}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#D4A843] hover:underline flex items-center gap-1 font-medium"
              >
                <span>Buka Telegram</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="text"
              value={config.telegram_link}
              onChange={(e) => setConfig({ ...config, telegram_link: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4A843] font-mono transition-colors"
              placeholder="https://t.me/novesiaforum"
            />
            <p className="text-[10px] text-neutral-500">
              Tautan yang dibuka saat pembaca mengetuk menu Komunitas di tab Profil aplikasi.
            </p>
          </div>

          {/* Support Email */}
          <div className="space-y-1.5 bg-[#0a0c10] border border-neutral-800/80 rounded-xl p-3.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#D4A843]" />
              Support / Contact Email
            </label>
            <input
              type="email"
              value={config.support_email}
              onChange={(e) => setConfig({ ...config, support_email: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4A843] font-mono transition-colors"
              placeholder="support@novesia.cc"
            />
            <p className="text-[10px] text-neutral-500">
              Alamat email resmi untuk pengaduan masalah dan bantuan legal.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Save Bar */}
      <div className="sticky bottom-6 z-20 bg-[#0e1117]/95 backdrop-blur-md border border-[#D4A843]/30 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-xs text-neutral-300">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span>Perubahan konfigurasi akan langsung aktif di API dan aplikasi tanpa perlu rebuild APK.</span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-[#D4A843] to-[#8C6D3B] hover:opacity-95 text-black rounded-xl text-xs font-bold shadow-lg shadow-[#B99762]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}</span>
        </button>
      </div>
    </div>
  );
}
