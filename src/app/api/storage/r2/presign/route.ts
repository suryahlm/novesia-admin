import { NextRequest, NextResponse } from "next/server";
import { presignGet, publicUrlFor } from "@/lib/r2";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Parameter ?key wajib diisi" }, { status: 400 });
    }

    const url = await presignGet(key, 3600);
    const publicUrl = publicUrlFor(key);

    return NextResponse.json({ url, publicUrl });
  } catch (err: any) {
    console.error("Storage R2 presign error:", err);
    return NextResponse.json({ error: err.message || "Gagal presign object R2" }, { status: 500 });
  }
}
