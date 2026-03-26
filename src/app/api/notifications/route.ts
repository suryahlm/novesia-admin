import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// GET — list all notifications
export async function GET() {
  const { data, error } = await supabase
    .from("nu_notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — create new notification (auto-deactivate previous)
export async function POST(req: NextRequest) {
  const { title, message, type } = await req.json();

  if (!title?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Judul dan pesan wajib diisi" }, { status: 400 });
  }

  // Deactivate all existing active notifications
  await supabase
    .from("nu_notifications")
    .update({ is_active: false })
    .eq("is_active", true);

  // Insert new notification
  const { data, error } = await supabase
    .from("nu_notifications")
    .insert({
      title: title.trim(),
      message: message.trim(),
      type: type || "info",
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
