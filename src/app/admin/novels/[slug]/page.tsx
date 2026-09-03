import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import NovelEditor from "./NovelEditor";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getNovel(slug: string) {
  const { data } = await supabase
    .from("nu_novels")
    .select("*")
    .eq("nu_slug", slug)
    .single();
  return data;
}

export default async function NovelDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const novel = await getNovel(slug);
  if (!novel) notFound();

  return (
    <div className="space-y-4">
      {/* Back */}
      <Link href="/admin/novels" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-300 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Daftar
      </Link>

      {/* Novel Editor (Client Component) — includes metadata + chapter editor */}
      <NovelEditor novel={novel} />
    </div>
  );
}
