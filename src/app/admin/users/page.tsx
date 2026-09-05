"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  ShieldOff,
  ShieldCheck,
  Crown,
  Snowflake,
  Trash2,
  User as UserIcon,
  Users as UsersIcon,
  UserPlus,
  RefreshCw,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Globe,
  Smartphone,
} from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: "USER" | "VIP";
  platform?: "web" | "app";
  os?: string | null;
  banned: boolean;
  frozen: boolean;
  vip_until: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_VIP_DAYS = 30;

function vipStatus(u: UserItem): "active" | "expired" | "none" {
  if (u.role !== "VIP") return "none";
  if (u.vip_until && new Date(u.vip_until).getTime() <= Date.now()) return "expired";
  return "active";
}

export default function UsersPage() {
  const [rows, setRows] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [totalWeb, setTotalWeb] = useState(0);
  const [totalApp, setTotalApp] = useState(0);
  const [newLast7Days, setNewLast7Days] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(30);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("ALL");
  const [platform, setPlatform] = useState("ALL");
  const [banned, setBanned] = useState("ALL");
  const [frozen, setFrozen] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDel, setConfirmDel] = useState<UserItem | null>(null);
  const [confirmBulkDel, setConfirmBulkDel] = useState(false);
  const [vipTarget, setVipTarget] = useState<"bulk" | UserItem | null>(null);
  const [vipDays, setVipDays] = useState(DEFAULT_VIP_DAYS);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError("");
      setSelected(new Set());
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: String(limit),
          ...(q.trim() ? { q: q.trim() } : {}),
          ...(role !== "ALL" ? { role } : {}),
          ...(platform !== "ALL" ? { platform } : {}),
          ...(banned !== "ALL" ? { banned } : {}),
          ...(frozen !== "ALL" ? { frozen } : {}),
        });

        const res = await fetch(`/api/users?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat pengguna");

        setRows(data.rows || []);
        setTotal(data.total || 0);
        setGrandTotal(data.grandTotal || 0);
        setTotalWeb(data.totalWeb || 0);
        setTotalApp(data.totalApp || 0);
        setNewLast7Days(data.newLast7Days || 0);
        setPage(targetPage);
      } catch (e: any) {
        setError(e.message || "Gagal memuat data pengguna");
      } finally {
        setLoading(false);
      }
    },
    [limit, q, role, platform, banned, frozen]
  );

  useEffect(() => {
    load(1);
  }, [role, platform, banned, frozen, load]);

  const search = () => load(1);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((u) => u.id))));
  };

  const runSingle = async (fn: () => Promise<any>, successMsg: string) => {
    setBusy(true);
    try {
      await fn();
      showToast(successMsg);
      await load(page);
    } catch (e: any) {
      showToast(`❌ Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleFrozen = (u: UserItem) =>
    runSingle(
      () =>
        fetch(`/api/users/${u.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frozen: !u.frozen }),
        }),
      u.frozen ? "Pembekuan akun dicabut" : "Akun berhasil dibekukan"
    );

  const toggleBanned = (u: UserItem) =>
    runSingle(
      () =>
        fetch(`/api/users/${u.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ banned: !u.banned }),
        }),
      u.banned ? "Status ban akun dicabut" : "Akun berhasil di-banned"
    );

  const revokeVip = (u: UserItem) =>
    runSingle(
      () =>
        fetch(`/api/users/${u.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "USER" }),
        }),
      "Status VIP berhasil dicabut"
    );

  const del = async (u: UserItem) => {
    await runSingle(
      () =>
        fetch(`/api/users/${u.id}`, {
          method: "DELETE",
        }),
      "Akun berhasil dihapus permanen"
    );
    setConfirmDel(null);
  };

  const runBulk = async (action: string, durationDays?: number) => {
    setBusy(true);
    try {
      const res = await fetch("/api/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], action, durationDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses aksi massal");
      showToast(`Berhasil memproses ${data.updated || data.deleted || selected.size} akun`);
      await load(1);
    } catch (e: any) {
      showToast(`❌ Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const bulkDelete = async () => {
    await runBulk("delete");
    setConfirmBulkDel(false);
  };

  const submitVip = async () => {
    if (!vipTarget) return;
    if (!Number.isFinite(vipDays) || vipDays <= 0) {
      alert("Durasi harus angka lebih dari 0 hari");
      return;
    }
    if (vipTarget === "bulk") {
      await runBulk("vip", vipDays);
    } else {
      await runSingle(
        () =>
          fetch(`/api/users/${vipTarget.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "VIP", vipDurationDays: vipDays }),
          }),
        `Akun ${vipTarget.name} berhasil dijadikan VIP (${vipDays} hari)`
      );
    }
    setVipTarget(null);
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const filterActive = q.trim() !== "" || role !== "ALL" || platform !== "ALL" || banned !== "ALL" || frozen !== "ALL";
  const totalPages = Math.ceil(total / limit) || 1;

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
            <UsersIcon className="w-6 h-6 text-amber-400" />
            <span>Kelola Pengguna</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Pantau dan kelola akun pembaca Novesia, bedakan pengguna web dan aplikasi, atur status VIP, pembekuan sementara, atau sanksi ban.
          </p>
        </div>
        <button
          onClick={() => load(page)}
          disabled={loading}
          className="px-3.5 py-2 bg-[#12151b] hover:bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-slate-300 flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? "animate-spin" : ""}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#12151b] border border-white/5 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
            <UsersIcon size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Pengguna</div>
            <div className="text-xl font-bold text-slate-100 mt-0.5">{grandTotal.toLocaleString("id-ID")}</div>
          </div>
        </div>

        <div className="bg-[#12151b] border border-white/5 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <Globe size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">User Web</div>
            <div className="text-xl font-bold text-sky-300 mt-0.5">{totalWeb.toLocaleString("id-ID")}</div>
          </div>
        </div>

        <div className="bg-[#12151b] border border-white/5 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Smartphone size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">User App</div>
            <div className="text-xl font-bold text-emerald-300 mt-0.5">{totalApp.toLocaleString("id-ID")}</div>
          </div>
        </div>

        <div className="bg-[#12151b] border border-white/5 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <UserPlus size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">User Baru (7 hari)</div>
            <div className="text-xl font-bold text-purple-300 mt-0.5">{newLast7Days.toLocaleString("id-ID")}</div>
          </div>
        </div>
      </div>

      {filterActive && (
        <div className="bg-[#12151b] border border-amber-400/20 rounded-xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-medium">
            <Search size={14} />
            <span>Hasil filter: <strong>{total}</strong> dari <strong>{grandTotal}</strong> total pengguna</span>
          </div>
          <button
            onClick={() => {
              setQ("");
              setRole("ALL");
              setPlatform("ALL");
              setBanned("ALL");
              setFrozen("ALL");
            }}
            className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2.5 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari nama atau email pengguna..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="w-full bg-[#0a0c10] border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all"
            />
          </div>

          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-amber-400/70 focus:outline-none transition-all cursor-pointer"
          >
            <option value="ALL">Semua Platform</option>
            <option value="WEB">🌐 Web Browser</option>
            <option value="APP">📱 Aplikasi (App)</option>
          </select>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-amber-400/70 focus:outline-none transition-all cursor-pointer"
          >
            <option value="ALL">Semua Role</option>
            <option value="USER">User Biasa</option>
            <option value="VIP">VIP</option>
          </select>

          <select
            value={frozen}
            onChange={(e) => setFrozen(e.target.value)}
            className="bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-amber-400/70 focus:outline-none transition-all cursor-pointer"
          >
            <option value="ALL">Semua Status Beku</option>
            <option value="false">Tidak Dibekukan</option>
            <option value="true">Dibekukan</option>
          </select>

          <select
            value={banned}
            onChange={(e) => setBanned(e.target.value)}
            className="bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-amber-400/70 focus:outline-none transition-all cursor-pointer"
          >
            <option value="ALL">Semua Status Ban</option>
            <option value="false">Aktif</option>
            <option value="true">Banned</option>
          </select>

          <button
            onClick={search}
            className="px-4 py-2 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-bold rounded-lg text-xs cursor-pointer transition-all shadow-[0_2px_10px_-2px_rgba(221,168,58,0.4)]"
          >
            Cari
          </button>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selected.size > 0 && (
        <div className="bg-[#12151b] border border-amber-400/30 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>{selected.size} pengguna dipilih</span>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <button
              disabled={busy}
              onClick={() => setVipTarget("bulk")}
              className="px-3 py-1.5 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Crown size={13} />
              <span>Jadikan VIP</span>
            </button>
            <button
              disabled={busy}
              onClick={() => runBulk("unvip")}
              className="px-3 py-1.5 bg-[#0a0c10] hover:bg-white/5 text-slate-300 border border-white/10 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Cabut VIP
            </button>
            <button
              disabled={busy}
              onClick={() => runBulk("freeze")}
              className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Snowflake size={13} />
              <span>Bekukan</span>
            </button>
            <button
              disabled={busy}
              onClick={() => runBulk("unfreeze")}
              className="px-3 py-1.5 bg-[#0a0c10] hover:bg-white/5 text-slate-300 border border-white/10 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Cabut Beku
            </button>
            <button
              disabled={busy}
              onClick={() => runBulk("ban")}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldOff size={13} />
              <span>Banned</span>
            </button>
            <button
              disabled={busy}
              onClick={() => runBulk("unban")}
              className="px-3 py-1.5 bg-[#0a0c10] hover:bg-white/5 text-slate-300 border border-white/10 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              UnBanned
            </button>
            <button
              disabled={busy}
              onClick={() => setConfirmBulkDel(true)}
              className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Hapus</span>
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[#12151b] border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Memuat data pengguna...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-300 space-y-2">
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto" />
            <p>{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Belum ada pengguna yang sesuai dengan filter/pencarian ini.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[68vh] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-400 text-left border-b border-white/5 sticky top-0 bg-[#12151b] z-10">
                <tr>
                  <th className="py-3 px-4 w-8">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && selected.size === rows.length}
                      onChange={toggleSelectAll}
                      className="accent-amber-400 rounded cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 font-semibold w-12">No</th>
                  <th className="py-3 px-4 font-semibold">Pengguna</th>
                  <th className="py-3 px-4 font-semibold">Platform</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Bergabung</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((u, i) => {
                  const vip = vipStatus(u);
                  return (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-4">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          className="accent-amber-400 rounded cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {(page - 1) * limit + i + 1}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#0a0c10] border border-white/10 shrink-0 flex items-center justify-center">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon size={14} className="text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-100 truncate">{u.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        {u.platform === "app" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Smartphone size={12} className="shrink-0" />
                            <span>Aplikasi{u.os ? ` (${u.os})` : ""}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            <Globe size={12} className="shrink-0" />
                            <span>Web</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {vip === "active" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 inline-flex items-center gap-1">
                              <Crown size={10} /> VIP
                            </span>
                          ) : vip === "expired" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400/80 border border-amber-500/20">
                              VIP Kedaluwarsa
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                              User Biasa
                            </span>
                          )}
                          {u.vip_until && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {vip === "active" ? "Hingga" : "Berakhir"} {fmtDate(u.vip_until)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.banned ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                              Banned
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                              Aktif
                            </span>
                          )}
                          {u.frozen && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              Dibekukan
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{fmtDate(u.created_at)}</td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            disabled={busy}
                            onClick={() => (u.role === "VIP" ? revokeVip(u) : setVipTarget(u))}
                            className={`p-1.5 rounded transition-colors cursor-pointer ${
                              vip === "active"
                                ? "bg-amber-400/20 text-amber-300 hover:bg-amber-400/30"
                                : "bg-[#0a0c10] hover:bg-white/10 text-slate-400 hover:text-amber-400"
                            }`}
                            title={u.role === "VIP" ? "Cabut VIP" : "Jadikan VIP"}
                          >
                            <Crown size={13} />
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => toggleFrozen(u)}
                            className={`p-1.5 rounded transition-colors cursor-pointer ${
                              u.frozen
                                ? "bg-sky-500/20 text-sky-300 hover:bg-sky-500/30"
                                : "bg-[#0a0c10] hover:bg-white/10 text-slate-400 hover:text-sky-300"
                            }`}
                            title={u.frozen ? "Cabut pembekuan" : "Bekukan akun"}
                          >
                            <Snowflake size={13} />
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => toggleBanned(u)}
                            className={`p-1.5 rounded transition-colors cursor-pointer ${
                              u.banned
                                ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                                : "bg-[#0a0c10] hover:bg-white/10 text-slate-400 hover:text-amber-400"
                            }`}
                            title={u.banned ? "UnBan akun" : "Ban akun"}
                          >
                            {u.banned ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => setConfirmDel(u)}
                            className="p-1.5 bg-[#0a0c10] hover:bg-red-950/60 text-slate-400 hover:text-red-300 rounded transition-colors cursor-pointer"
                            title="Hapus akun"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <div>
            Total <strong className="text-slate-200">{total}</strong> pengguna • Halaman{" "}
            <strong className="text-slate-200">{page}</strong> dari{" "}
            <strong className="text-slate-200">{totalPages}</strong>
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1)}
              className="px-3 py-1.5 bg-[#0a0c10] hover:bg-white/5 border border-white/10 rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={14} />
              <span>Sebelumnya</span>
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => load(page + 1)}
              className="px-3 py-1.5 bg-[#0a0c10] hover:bg-white/5 border border-white/10 rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            >
              <span>Berikutnya</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Single Delete */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12151b] border border-red-900/60 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Hapus Akun Pengguna?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Hapus akun <strong className="text-white font-semibold">"{confirmDel.name}"</strong> ({confirmDel.email})? Seluruh riwayat baca, komentar, dan data akun ini ikut terhapus permanen. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDel(null)}
                disabled={busy}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => del(confirmDel)}
                disabled={busy}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-[0_2px_12px_-2px_rgba(220,38,38,0.5)] disabled:opacity-50"
              >
                {busy ? "Menghapus..." : "Hapus Akun"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bulk Delete */}
      {confirmBulkDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12151b] border border-red-900/60 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Hapus {selected.size} Akun Terpilih?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Hapus <strong className="text-white font-semibold">{selected.size} akun</strong> sekaligus? Seluruh data akun-akun ini akan ikut terhapus secara permanen. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmBulkDel(false)}
                disabled={busy}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={bulkDelete}
                disabled={busy}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-[0_2px_12px_-2px_rgba(220,38,38,0.5)] disabled:opacity-50"
              >
                {busy ? "Menghapus..." : `Hapus ${selected.size} Akun`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Grant VIP */}
      {vipTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12151b] border border-amber-400/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Crown className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-100">Berikan Status VIP</h3>
              </div>
              <button onClick={() => setVipTarget(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              {vipTarget === "bulk"
                ? `Jadikan ${selected.size} akun terpilih sebagai VIP untuk berapa hari?`
                : `Jadikan "${vipTarget.name}" sebagai VIP untuk berapa hari?`}
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Durasi Masa Aktif (Hari)</label>
              <input
                type="number"
                min={1}
                value={vipDays}
                onChange={(e) => setVipDays(Number(e.target.value))}
                className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:border-amber-400/70 focus:outline-none transition-all font-mono"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setVipTarget(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={submitVip}
                disabled={busy}
                className="px-4 py-2 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-[0_2px_10px_-2px_rgba(221,168,58,0.4)] disabled:opacity-50"
              >
                {busy ? "Memproses..." : "Aktifkan VIP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
