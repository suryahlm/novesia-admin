'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Save,
  Loader2,
  Key,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  ShieldAlert
} from 'lucide-react';

export interface ApiKeyConfig {
  id: string;
  name: string;
  key: string;
  baseUrl?: string;
  model?: string;
  roles: string[];
}

const AVAILABLE_MODELS = [
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
  { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { id: 'openai/gpt-oss-120b', label: 'Groq GPT-OSS-120B' },
  { id: 'llama3-70b-8192', label: 'Groq Llama 3 70B' },
  { id: 'llama3-8b-8192', label: 'Groq Llama 3 8B' },
  { id: 'mixtral-8x7b-32768', label: 'Groq Mixtral 8x7B' },
];

const AVAILABLE_ROLES = [
  { id: 'primary', label: 'Primary' },
  { id: 'fallback', label: 'Fallback' },
  { id: 'translate_novel', label: 'Translate Novel' },
  { id: 'translate_chapter', label: 'Translate Chapter' },
  { id: 'generate_genre', label: 'Generate Genre' },
];

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const [showKeyId, setShowKeyId] = useState<string | null>(null);

  const showToast = useCallback((message: string, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data && data.translation_api_keys) {
          let parsedKeys = data.translation_api_keys;
          if (typeof parsedKeys === 'string') {
            try {
              parsedKeys = JSON.parse(parsedKeys);
            } catch {
              parsedKeys = [];
            }
          }
          if (Array.isArray(parsedKeys)) {
            setApiKeys(parsedKeys);
          } else {
            setApiKeys([]);
          }
        } else {
          setApiKeys([]); 
        }
      } else {
        throw new Error('Gagal memuat API Keys');
      }
    } catch {
      showToast('Gagal memuat API Keys dari server', true);
      setApiKeys([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        translation_api_keys: apiKeys
      };
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('✅ Pengaturan API Keys berhasil disimpan!');
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

  const handleAddKey = () => {
    setApiKeys([
      ...apiKeys,
      {
        id: crypto.randomUUID(),
        name: `Akun ${apiKeys.length + 1}`,
        key: '',
        baseUrl: '',
        model: 'gemini-3.7-flash',
        roles: []
      }
    ]);
  };

  const handleRemoveKey = (idToRemove: string) => {
    setApiKeys(apiKeys.filter((k) => k.id !== idToRemove));
  };

  const handleChange = (id: string, field: keyof ApiKeyConfig, value: string) => {
    setApiKeys(apiKeys.map(k => k.id === id ? { ...k, [field]: value } : k));
  };

  const toggleRole = (id: string, roleId: string) => {
    setApiKeys(apiKeys.map(k => {
      if (k.id !== id) return k;
      
      const hasRole = k.roles.includes(roleId);
      const newRoles = hasRole 
        ? k.roles.filter(r => r !== roleId)
        : [...k.roles, roleId];
        
      return { ...k, roles: newRoles };
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#B99762]" />
        <span className="text-xs font-bold tracking-wide">Memuat pengaturan API Keys...</span>
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
            <Key className="w-6 h-6 text-[#D4A843]" />
            Manajemen API Keys Translasi
          </h1>
          <p className="text-neutral-400 text-xs mt-1">
            Kelola API Key GutsAI untuk translasi novel, dan atur peran (role) untuk tiap API Key secara dinamis.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleAddKey}
            className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-xl transition-all cursor-pointer text-xs font-bold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Key</span>
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-[#D4A843] to-[#8C6D3B] hover:opacity-95 text-black rounded-xl text-xs font-bold shadow-lg shadow-[#B99762]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs text-neutral-300 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-200">Panduan Pembagian Peran (Roles)</p>
          <ul className="text-neutral-400 text-[11px] leading-relaxed list-disc list-inside">
            <li><strong className="text-neutral-300">Primary:</strong> API Key utama yang akan selalu digunakan terlebih dahulu.</li>
            <li><strong className="text-neutral-300">Fallback:</strong> API Key cadangan yang otomatis dipakai jika Primary mengalami Error atau Limit.</li>
            <li><strong className="text-neutral-300">Translate Novel:</strong> API Key khusus untuk menerjemahkan sinopsis & detail novel baru.</li>
            <li><strong className="text-neutral-300">Translate Chapter:</strong> API Key khusus untuk menerjemahkan isi (content) chapter.</li>
            <li><strong className="text-neutral-300">Generate Genre:</strong> API Key khusus untuk generate genre otomatis.</li>
          </ul>
        </div>
      </div>

      {apiKeys.length === 0 ? (
        <div className="bg-neutral-900/50 border border-neutral-800 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center">
          <Key className="w-10 h-10 text-neutral-600 mb-3" />
          <h3 className="text-neutral-300 font-semibold mb-1">Belum ada API Key</h3>
          <p className="text-neutral-500 text-xs max-w-md mb-4">Tambahkan API Key untuk mulai menggunakan fitur translasi dan pembagian tugas otomatis.</p>
          <button
            onClick={handleAddKey}
            className="px-4 py-2 bg-[#D4A843]/10 hover:bg-[#D4A843]/20 text-[#D4A843] border border-[#D4A843]/30 rounded-xl transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah API Key Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((item) => (
            <div key={item.id} className="bg-[#0e1117] border border-neutral-800/80 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-800/80 pb-4">
                
                {/* Input Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-neutral-400 block uppercase tracking-wider">
                      Label / Nama Key
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleChange(item.id, 'name', e.target.value)}
                      placeholder="GutsAI - Akun 1"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4A843] transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-neutral-400 block uppercase tracking-wider">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKeyId === item.id ? "text" : "password"}
                        value={item.key}
                        onChange={(e) => handleChange(item.id, 'key', e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 pl-3 pr-10 text-xs text-white focus:outline-none focus:border-[#D4A843] font-mono transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeyId(showKeyId === item.id ? null : item.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                      >
                        {showKeyId === item.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-neutral-400 block uppercase tracking-wider">
                      Base URL (Opsional)
                    </label>
                    <input
                      type="text"
                      value={item.baseUrl || ''}
                      onChange={(e) => handleChange(item.id, 'baseUrl', e.target.value)}
                      placeholder="https://api.gutsai.id/v1"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4A843] transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Model Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-neutral-800/80 pt-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-neutral-400 block uppercase tracking-wider">
                      Model Terjemahan
                    </label>
                    <select
                      value={item.model || 'gemini-3.7-flash'}
                      onChange={(e) => handleChange(item.id, 'model', e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4A843] transition-colors appearance-none cursor-pointer"
                    >
                      {AVAILABLE_MODELS.map(model => (
                        <option key={model.id} value={model.id}>{model.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center self-end sm:self-start mt-2 sm:mt-5">
                  <button
                    type="button"
                    onClick={() => handleRemoveKey(item.id)}
                    className="p-2.5 bg-red-900/10 text-red-500 hover:bg-red-900/30 border border-red-900/20 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                    title="Hapus API Key ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Roles Selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-neutral-400 block uppercase tracking-wider">
                  Peran / Tugas API Key Ini (Pilih lebih dari satu)
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ROLES.map((role) => {
                    const isSelected = item.roles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(item.id, role.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-[#D4A843]/10 text-[#D4A843] border-[#D4A843]/40'
                            : 'bg-neutral-900/50 text-neutral-500 border-neutral-800 hover:bg-neutral-800 hover:text-neutral-300'
                        }`}
                      >
                        {role.label}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
