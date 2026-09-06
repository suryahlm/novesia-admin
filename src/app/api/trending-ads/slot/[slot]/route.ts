import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { uploadBuffer, trendingAdKey, publicUrlFor, deleteFileFromR2 } from "@/lib/r2";

const VALID_SLOTS = [1, 2, 3, 4, 5, 6];

async function getAdsList(): Promise<any[]> {
  const { data } = await supabase
    .from("nu_app_config")
    .select("value")
    .eq("key", "web_trending_ads")
    .maybeSingle();

  if (!data?.value) return [];
  try {
    const parsed = JSON.parse(data.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveAdsList(items: any[]) {
  const { error } = await supabase
    .from("nu_app_config")
    .upsert(
      {
        key: "web_trending_ads",
        value: JSON.stringify(items),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
  if (error) throw error;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slot: string }> }
) {
  try {
    const { slot: slotParam } = await params;
    const slot = Number(slotParam);

    if (!VALID_SLOTS.includes(slot)) {
      return NextResponse.json({ error: "Slot iklan harus 1 sampai 6" }, { status: 400 });
    }

    const formData = await req.formData();
    const title = (formData.get("title") || "").toString().trim();
    const subtitle = (formData.get("subtitle") || "").toString().trim();
    const badge = (formData.get("badge") || "").toString().trim();
    const targetUrl = (formData.get("targetUrl") || "").toString().trim() || null;
    const active = formData.get("active") === "true";
    const startAt = formData.get("startAt") ? new Date(String(formData.get("startAt"))).toISOString() : null;
    const expiresAt = formData.get("expiresAt") ? new Date(String(formData.get("expiresAt"))).toISOString() : null;
    const imageFile = formData.get("image") as File | null;

    if (!title) {
      return NextResponse.json({ error: "Judul iklan wajib diisi" }, { status: 400 });
    }

    const items = await getAdsList();
    const existingIndex = items.findIndex((i) => Number(i.slot) === slot);
    const existing = existingIndex >= 0 ? items[existingIndex] : null;

    if (!existing && (!imageFile || imageFile.size === 0)) {
      return NextResponse.json({ error: "Gambar creative iklan wajib diupload" }, { status: 400 });
    }

    let imageKey = existing?.imageKey;
    let imageUrl = existing?.imageUrl;

    if (imageFile && imageFile.size > 0) {
      const ext = (imageFile.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const newKey = trendingAdKey(slot, ext);
      const buffer = Buffer.from(await imageFile.arrayBuffer());

      await uploadBuffer(newKey, buffer, imageFile.type || "image/jpeg");
      imageKey = newKey;
      imageUrl = publicUrlFor(newKey);

      // Clean up old key if different
      if (existing?.imageKey && existing.imageKey !== newKey) {
        deleteFileFromR2(existing.imageKey).catch(() => {});
      }
    }

    const updatedItem = {
      id: existing?.id || crypto.randomUUID(),
      slot,
      dbSlot: slot,
      title,
      subtitle,
      badge,
      imageKey,
      imageUrl,
      targetUrl,
      active,
      startAt,
      expiresAt,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      items[existingIndex] = updatedItem;
    } else {
      items.push(updatedItem);
    }
    items.sort((a, b) => Number(a.slot) - Number(b.slot));

    await saveAdsList(items);

    return NextResponse.json(updatedItem);
  } catch (err: any) {
    console.error("Trending Ad save error:", err);
    return NextResponse.json({ error: err.message || "Gagal menyimpan iklan trending" }, { status: 500 });
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
      return NextResponse.json({ error: "Slot iklan harus 1 sampai 6" }, { status: 400 });
    }

    const items = await getAdsList();
    const existingIndex = items.findIndex((i) => Number(i.slot) === slot);

    if (existingIndex >= 0) {
      const existing = items[existingIndex];
      if (existing.imageKey) {
        deleteFileFromR2(existing.imageKey).catch(() => {});
      }
      items.splice(existingIndex, 1);
      await saveAdsList(items);
    }

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("Trending Ad delete error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus iklan trending" }, { status: 500 });
  }
}

