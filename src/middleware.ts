import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getExpectedAdminToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookieValue = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const expectedToken = await getExpectedAdminToken();
  const isAuthenticated = Boolean(cookieValue && cookieValue === expectedToken);

  // 1. If accessing /login
  if (pathname === "/login") {
    if (isAuthenticated) {
      const redirectParam = req.nextUrl.searchParams.get("redirect");
      const target = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/admin";
      return NextResponse.redirect(new URL(target, req.url));
    }
    return NextResponse.next();
  }

  // 2. Allow auth API routes without authentication
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // 3. If accessing root /
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 4. If accessing /admin and sub-routes
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 5. If accessing protected /api routes
  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Akses tidak diizinkan. Silakan login ke Admin Studio terlebih dahulu." },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, icons
     */
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
