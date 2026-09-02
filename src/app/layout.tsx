import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Novesia Admin Studio — Premium Portal",
  description: "Next-Generation Admin Studio — Novesia Novel Platform & AI Translation Engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased bg-[#07090e] text-slate-100 min-h-screen relative selection:bg-violet-500/30 selection:text-violet-200"
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
      >
        {/* Ambient Aurora Glow Background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-violet-600/[0.07] blur-[140px] animate-pulse-slow" />
          <div className="absolute top-[30%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/[0.05] blur-[160px] animate-pulse-slow" style={{ animationDelay: "-4s" }} />
          <div className="absolute -bottom-[20%] left-[20%] w-[55vw] h-[55vw] rounded-full bg-emerald-600/[0.04] blur-[150px] animate-pulse-slow" style={{ animationDelay: "-2s" }} />
          {/* Subtle Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
