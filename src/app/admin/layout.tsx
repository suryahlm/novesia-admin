"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  BookPlus,
  FileEdit,
  ScrollText,
  Bell,
  Settings,
  Sparkles,
  ShieldCheck,
  Ban,
  LogOut,
  Database,
  Users,
  MessageSquare,
  MessagesSquare,
  Rocket,
  Star,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/novels", label: "Novel", icon: BookOpen },
  { href: "/admin/top-rating", label: "Top Rating", icon: Star },
  { href: "/admin/novels/new", label: "Tambah Novel", icon: BookPlus },
  { href: "/admin/update", label: "Edit Novel", icon: FileEdit },
  { href: "/admin/storage", label: "Storage R2", icon: Database },
  { href: "/admin/users", label: "Pengguna", icon: Users },
  { href: "/admin/comments", label: "Komentar", icon: MessageSquare },
  { href: "/admin/forum", label: "Forum", icon: MessagesSquare },
  { href: "/admin/notifications", label: "Notifikasi", icon: Bell },
  { href: "/admin/banners", label: "Banner Beranda", icon: Rocket },
  { href: "/admin/blacklist", label: "Blacklist", icon: Ban },
  { href: "/admin/logs", label: "Scraping & Logs", icon: ScrollText },
  { href: "/admin/config", label: "Pengaturan", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const activeItem = navItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/admin" && pathname.startsWith(item.href))
  );

  const pageTitle =
    activeItem?.label ??
    (pathname.startsWith("/admin/novels/") ? "Detail Novel" : "Novesia Admin");

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0a0c10]">
      {/* ═══ Komiku Style Sidebar ═══ */}
      <aside className="md:w-60 bg-[#0e1117] border-b md:border-b-0 md:border-r border-white/5 flex md:flex-col shrink-0">
        {/* Logo Header */}
        <div className="px-5 py-5 hidden md:block">
          <Link href="/admin" className="flex items-center gap-1.5 group">
            <Sparkles size={16} className="text-amber-400 group-hover:rotate-12 transition-transform" />
            <span className="font-bold text-xl bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
              Novesia
            </span>
          </Link>
          <div className="text-[10px] tracking-[0.2em] text-slate-400 mt-0.5 ml-[22px]">
            ADMIN PANEL
          </div>
        </div>

        <div className="px-4 py-3 font-bold text-amber-400 text-lg md:hidden">
          Novesia Admin
        </div>

        {/* Navigation List */}
        <nav className="flex md:flex-col gap-1 px-2 md:px-3 pb-2 md:pb-4 overflow-x-auto flex-1">
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
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-amber-400/10 text-amber-300 border border-amber-400/20 font-medium"
                    : "text-slate-300 hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon size={17} className={isActive ? "text-amber-400" : "text-slate-400"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ═══ Main Content Viewport ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/5 bg-[#0a0c10]/80 backdrop-blur-sm sticky top-0 z-10">
          <h1 className="text-lg md:text-xl font-bold text-slate-100">{pageTitle}</h1>
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#12151b] border border-white/5">
            <ShieldCheck size={15} className="text-amber-400" />
            <span className="text-xs text-slate-300">Admin</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
