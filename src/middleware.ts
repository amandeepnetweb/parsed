import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";
import { type NextRequest, NextResponse } from "next/server";

const protectedPaths = ["/dashboard", "/lessons", "/admin"];
const authPaths = [
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/forgot-password",
  "/auth/reset-password",
];

export default async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/_vercel") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  const { data: session } = await betterFetch<Session>("/api/auth/get-session", {
    baseURL: request.nextUrl.origin,
    headers: {
      cookie: request.headers.get("cookie") || "",
    },
  });

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  const isAuthPage = authPaths.some((path) => pathname.startsWith(path));

  if (!session) {
    if (isProtected) {
      const from = encodeURIComponent(pathname);
      return NextResponse.redirect(new URL(`/auth/sign-in?from=${from}`, request.url));
    }
    return NextResponse.next();
  }

  if (isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const userRole = (session as unknown as { user?: { role?: string } })?.user?.role;
  if (pathname.startsWith("/admin") && userRole !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const userStatus = (session as unknown as { user?: { status?: string } })?.user?.status;
  if (isProtected && userStatus !== "active") {
    return NextResponse.redirect(new URL("/auth/suspended", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
