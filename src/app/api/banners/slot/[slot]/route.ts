import { NextRequest, NextResponse } from "next/server";
import { apiGet, apiPut, apiDelete } from "@/lib/apiClient";
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

    // Check existing banner in slot via apiGet
    const allBanners = await apiGet<any[]>("/api/banners", { all: true }).catch(() => []);
    const existing = (allBanners || []).find((b: any) => Number(b.slot) === slot);

    if (!existing && (!imageFile || imageFile.size === 0)) {
      return NextResponse.json({ error: "Gambar creative banner wajib diupload" }, { status: 400 });
    }

    let imageKey = existing?.imageKey || existing?.image_key;
    let imageUrl = existing?.imageUrl || existing?.image_url;

    if (imageFile && imageFile.size > 0) {
      const ext = (imageFile.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const newKey = bannerKey(slot, ext);
      const buffer = Buffer.from(await imageFile.arrayBuffer());

      await uploadBuffer(newKey, buffer, imageFile.type || "image/jpeg");
      imageKey = newKey;
      imageUrl = publicUrlFor(newKey);

      // Clean up old key if different
      const oldKey = existing?.imageKey || existing?.image_key;
      if (oldKey && oldKey !== newKey) {
        deleteFileFromR2(oldKey).catch(() => {});
      }
    }

    const bannerData = {
      slot,
      title,
      imageKey,
      imageUrl,
      targetUrl,
      active,
      startAt,
      expiresAt,
    };

    const saved = await apiPut<any>(`/api/banners/${slot}`, bannerData);

    return NextResponse.json({
      id: saved.id,
      slot: saved.slot,
      title: saved.title,
      imageKey: saved.imageKey || saved.image_key,
      imageUrl: saved.imageUrl || saved.image_url,
      targetUrl: saved.targetUrl || saved.target_url,
      active: Boolean(saved.active),
      startAt: saved.startAt || saved.start_at,
      expiresAt: saved.expiresAt || saved.expires_at,
      createdAt: saved.createdAt || saved.created_at,
      updatedAt: saved.updatedAt || saved.updated_at,
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

    const allBanners = await apiGet<any[]>("/api/banners", { all: true }).catch(() => []);
    const existing = (allBanners || []).find((b: any) => Number(b.slot) === slot);

    if (existing) {
      const key = existing.imageKey || existing.image_key;
      if (key) {
        deleteFileFromR2(key).catch(() => {});
      }
      await apiDelete(`/api/banners/${slot}`);
    }

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("Banner delete error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus banner" }, { status: 500 });
  }
}
