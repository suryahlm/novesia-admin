import { NextRequest, NextResponse } from "next/server";
import { listObjects, deleteObjects } from "@/lib/r2";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const prefix = searchParams.get("prefix") || "";
    const token = searchParams.get("token") || undefined;
    const maxKeys = Math.min(Number(searchParams.get("maxKeys")) || 200, 1000);

    const data = await listObjects(prefix, token, maxKeys);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Storage R2 list error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat object R2" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const rawKeys = Array.isArray(body.keys) ? body.keys.filter(Boolean) : [];

    if (!rawKeys.length) {
      return NextResponse.json({ error: "Daftar keys tidak boleh kosong" }, { status: 400 });
    }

    if (rawKeys.length > 1000) {
      return NextResponse.json({ error: "Maksimal 1000 key per permintaan" }, { status: 400 });
    }

    const result = await deleteObjects(rawKeys);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Storage R2 delete error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus object R2" }, { status: 500 });
  }
}
