"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookPlus,
  Library,
  FileEdit,
  ScrollText,
  BookOpen,
  Bell,
  Settings,
  Sparkles,
  Zap,
  Activity,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, badge: null },
  { href: "/admin/novels/new", label: "Tambah Novel", icon: BookPlus, badge: "New" },
  { href: "/admin/novels", label: "Daftar Novel", icon: Library, badge: null },
  { href: "/admin/update", label: "Edit Novel", icon: FileEdit, badge: null },
  { href: "/admin/logs", label: "Scraping & Logs", icon: ScrollText, badge: null },
  { href: "/admin/notifications", label: "Notifikasi", icon: Bell, badge: null },
  { href: "/admin/config", label: "Pengaturan", icon: Settings, badge: null },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* ═══ Luxury Frosted Sidebar ═══ */}
      <aside className="w-72 bg-[#090d16]/80 backdrop-blur-2xl border-r border-white/[0.07] flex flex-col fixed h-full z-30 shadow-2xl shadow-black/80">
        {/* Logo Header */}
        <div className="p-6 border-b border-white/[0.06] relative overflow-hidden">
          {/* Subtle Ambient Logo Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />

          <Link href="/admin" className="flex items-center gap-3.5 group">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-600 to-amber-500 p-[1px] shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/50 transition-all duration-300">
                <div className="w-full h-full bg-[#0d121f] rounded-[15px] flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-violet-300 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-violet-300 bg-clip-text text-transparent"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  NOVESIA
                </h1>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 tracking-wider">
                  STUDIO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mt-0.5">
                Admin Control Center
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Main Management
          </div>

          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600/25 via-indigo-600/15 to-transparent text-white border-l-2 border-violet-400 shadow-sm shadow-violet-500/10"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border-l-2 border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-violet-500/20 text-violet-300 shadow-sm shadow-violet-500/30"
                        : "bg-slate-800/40 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800/80"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    {item.badge}
                  </span>
                )}

                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-sm shadow-violet-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* AI & Infrastructure Monitor Widget */}
        <div className="p-4 border-t border-white/[0.06] space-y-3">
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0c101d] border border-violet-500/20 shadow-lg shadow-black/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                AI Translation Core
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                40 RPM
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              Model: <span className="text-violet-300 font-semibold">Gemini 3.7 Flash</span>
            </p>
            <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Guts AI Gateway
              </span>
              <span className="text-emerald-400 font-bold">Online</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 text-[10px] text-slate-400">
            <span>Novesia Studio v2.0</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Supabase OK
            </span>
          </div>
        </div>
      </aside>

      {/* ═══ Main Content Viewport ═══ */}
      <div className="flex-1 ml-72 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="h-16 sticky top-0 z-20 bg-[#07090e]/70 backdrop-blur-xl border-b border-white/[0.06] px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Admin</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-xs font-bold text-slate-200 capitalize">
              {pathname === "/admin"
                ? "Overview Dashboard"
                : pathname.split("/").filter(Boolean).slice(1).join(" / ") || "Page"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Live Status Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-slate-300 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              <span>Guts AI Gemini 3.7 Flash</span>
            </div>

            {/* Quick Add Button */}
            <Link
              href="/admin/novels/new"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-violet-500/25 transition-all flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
            >
              <BookPlus className="w-3.5 h-3.5" />
              <span>+ Novel Baru</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
