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
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin/novels" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-400 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
      </Link>

      {/* Novel Editor (Client Component) — includes metadata + chapter editor */}
      <NovelEditor novel={novel} />
    </div>
  );
}
