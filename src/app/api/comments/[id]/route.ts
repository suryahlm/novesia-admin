import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from("nu_comments")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("Comment delete error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus komentar" }, { status: 500 });
  }
}
