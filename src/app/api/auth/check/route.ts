import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, getExpectedAdminToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    const expected = await getExpectedAdminToken();

    return NextResponse.json({ authenticated: token === expected });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
