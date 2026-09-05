import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { uploadBuffer, bannerKey, publicUrlFor, deleteFileFromR2 } from "@/lib/r2";

const VALID_SLOTS = [1, 2, 3, 4, 5, 6];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slot: string }> }
) {
  try {
    const { slot: slotParam } = await params;
    const slot = Number(slotParam);

    if (!VALID_SLOTS.includes(slot)) {
      return NextResponse.json({ error: "Slot harus 1 sampai 6" }, { status: 400 });
    }

    const formData = await req.formData();
    const title = (formData.get("title") || "").toString().trim();
    const targetUrl = (formData.get("targetUrl") || "").toString().trim() || null;
    const active = formData.get("active") === "true";
    const startAt = formData.get("startAt") ? new Date(String(formData.get("startAt"))).toISOString() : null;
    const expiresAt = formData.get("expiresAt") ? new Date(String(formData.get("expiresAt"))).toISOString() : null;
    const imageFile = formData.get("image") as File | null;

    if (!title) {
      return NextResponse.json({ error: "Judul banner wajib diisi" }, { status: 400 });
    }

    // Check existing banner in slot
    const { data: existing } = await supabase
      .from("nu_banners")
      .select("*")
      .eq("slot", slot)
      .maybeSingle();

    if (!existing && (!imageFile || imageFile.size === 0)) {
      return NextResponse.json({ error: "Gambar creative banner wajib diupload" }, { status: 400 });
    }

    let imageKey = existing?.image_key;
    let imageUrl = existing?.image_url;

    if (imageFile && imageFile.size > 0) {
      const ext = (imageFile.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const newKey = bannerKey(slot, ext);
      const buffer = Buffer.from(await imageFile.arrayBuffer());

      await uploadBuffer(newKey, buffer, imageFile.type || "image/jpeg");
      imageKey = newKey;
      imageUrl = publicUrlFor(newKey);

      // Clean up old key if different
      if (existing?.image_key && existing.image_key !== newKey) {
        deleteFileFromR2(existing.image_key).catch(() => {});
      }
    }

    const bannerData = {
      slot,
      title,
      image_key: imageKey,
      image_url: imageUrl,
      target_url: targetUrl,
      active,
      start_at: startAt,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await supabase
      .from("nu_banners")
      .upsert(bannerData, { onConflict: "slot" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      id: saved.id,
      slot: saved.slot,
      title: saved.title,
      imageKey: saved.image_key,
      imageUrl: saved.image_url,
      targetUrl: saved.target_url,
      active: Boolean(saved.active),
      startAt: saved.start_at,
      expiresAt: saved.expires_at,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
    });
  } catch (err: any) {
    console.error("Banner save error:", err);
    return NextResponse.json({ error: err.message || "Gagal menyimpan banner" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slot: string }> }
) {
  try {
    const { slot: slotParam } = await params;
    const slot = Number(slotParam);

    if (!VALID_SLOTS.includes(slot)) {
      return NextResponse.json({ error: "Slot harus 1 sampai 6" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("nu_banners")
      .select("*")
      .eq("slot", slot)
      .maybeSingle();

    if (existing) {
      if (existing.image_key) {
        deleteFileFromR2(existing.image_key).catch(() => {});
      }
      await supabase.from("nu_banners").delete().eq("slot", slot);
    }

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("Banner delete error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus banner" }, { status: 500 });
  }
}
