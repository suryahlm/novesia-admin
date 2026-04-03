'use client';

import { useEffect, useState } from 'react';

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ color: '#94a3b8', fontSize: 16 }}>Memuat pengaturan...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 100,
          background: toast.startsWith('✅') ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)',
          color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: 14,
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>
            ⚙️ Pengaturan Aplikasi
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>
            Atur reward koin dan interval iklan — perubahan langsung berlaku di aplikasi
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: 'linear-gradient(135deg, #d4a843, #b8902f)',
            color: '#0a0a0f', border: 'none', borderRadius: 12,
            padding: '12px 28px', fontWeight: 800, fontSize: 15, cursor: 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Menyimpan...' : '💾 Simpan Pengaturan'}
        </button>
      </div>

      {/* ═══ ABSEN HARIAN ═══ */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>📅</span>
          <div>
            <h2 style={cardTitleStyle}>Absen Harian</h2>
            <p style={cardDescStyle}>Reward koin untuk setiap hari check-in (7 hari cycle)</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
          {config.daily_checkin_rewards.map((reward, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Hari {i + 1}
              </label>
              <input
                type="number"
                value={reward}
                onChange={(e) => updateDayReward(i, parseInt(e.target.value) || 0)}
                style={inputStyle}
              />
              <span style={{ fontSize: 10, color: '#475569', display: 'block', marginTop: 4 }}>🪙</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ REFERRAL & ADS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Referral */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>👥</span>
            <div>
              <h2 style={cardTitleStyle}>Kode Referral</h2>
              <p style={cardDescStyle}>Bonus koin saat user klaim kode referral teman</p>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Bonus Referral</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                value={config.referral_bonus}
                onChange={(e) => setConfig({ ...config, referral_bonus: parseInt(e.target.value) || 0 })}
                style={{ ...inputStyle, width: 100, textAlign: 'center' }}
              />
              <span style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>🪙 per klaim</span>
            </div>
          </div>
        </div>

        {/* Watch Ads */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>🎬</span>
            <div>
              <h2 style={cardTitleStyle}>Tonton Iklan</h2>
              <p style={cardDescStyle}>Reward koin setiap user menonton iklan rewarded</p>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Reward per Iklan</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                value={config.watch_ad_reward}
                onChange={(e) => setConfig({ ...config, watch_ad_reward: parseInt(e.target.value) || 0 })}
                style={{ ...inputStyle, width: 100, textAlign: 'center' }}
              />
              <span style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>🪙 per tonton</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ INTERSTITIAL AD ═══ */}
      <div style={{ ...cardStyle, borderColor: 'rgba(239,68,68,0.2)', background: 'linear-gradient(135deg, rgba(239,68,68,0.03), rgba(17,17,24,1))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>📺</span>
          <div>
            <h2 style={cardTitleStyle}>Iklan Interstitial</h2>
            <p style={cardDescStyle}>Iklan fullscreen yang muncul otomatis saat membaca novel</p>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Tampilkan iklan setiap</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              value={config.ad_interval_chapters}
              onChange={(e) => setConfig({ ...config, ad_interval_chapters: parseInt(e.target.value) || 1 })}
              min={1}
              max={100}
              style={{ ...inputStyle, width: 80, textAlign: 'center', fontSize: 22, fontWeight: 800 }}
            />
            <span style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600 }}>chapter dibaca</span>
          </div>
          <p style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>
            💡 Rekomendasi: 3-10 chapter. Terlalu sering = user tidak nyaman, terlalu jarang = revenue rendah.
          </p>
        </div>
      </div>

      {/* ═══ SOCIAL LINKS ═══ */}
      <div style={{ ...cardStyle, borderColor: 'rgba(56,189,248,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>📱</span>
          <div>
            <h2 style={cardTitleStyle}>Social Media Links</h2>
            <p style={cardDescStyle}>Tautan grup komunitas untuk ditampilkan di menu profil aplikasi</p>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Telegram Channel / Group Link</label>
          <input
            type="text"
            value={config.telegram_link}
            onChange={(e) => setConfig({ ...config, telegram_link: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left' }}
            placeholder="https://t.me/..."
          />
        </div>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}

// Styles
const cardStyle: React.CSSProperties = {
  background: '#111118',
  border: '1px solid #1e1e2e',
  borderRadius: 18,
  padding: 24,
  marginBottom: 16,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 18, fontWeight: 800, color: '#e2e8f0', margin: 0,
};

const cardDescStyle: React.CSSProperties = {
  fontSize: 12, color: '#64748b', margin: '2px 0 0',
};

const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid #1e1e2e',
  borderRadius: 10,
  padding: '10px 12px',
  color: '#e2e8f0',
  fontSize: 16,
  fontWeight: 700,
  width: '100%',
  textAlign: 'center' as const,
  outline: 'none',
};
