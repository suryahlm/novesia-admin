import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  getAdminPassword,
  getExpectedAdminToken,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = String(body?.password || "").trim();

    const expectedPassword = getAdminPassword();

    if (!password || password !== expectedPassword) {
      return NextResponse.json(
        { error: "Kata sandi admin salah. Silakan coba lagi." },
        { status: 401 }
      );
    }

    const token = await getExpectedAdminToken();
    const cookieStore = await cookies();

    cookieStore.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Login API error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat verifikasi kata sandi." },
      { status: 500 }
    );
  }
}
