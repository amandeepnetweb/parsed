import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";
import { type NextRequest, NextResponse } from "next/server";

const protectedPaths = ["/dashboard", "/files", "/folders", "/chat"];
const protectedApiPaths = ["/api/files", "/api/folders", "/api/chat"];
const authPaths = [
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/forgot-password",
  "/auth/reset-password",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/_vercel") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Better Auth routes are always public
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const { data: session } = await betterFetch<Session>("/api/auth/get-session", {
    baseURL: request.nextUrl.origin,
    headers: {
      cookie: request.headers.get("cookie") || "",
    },
  });

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  const isProtectedApi = protectedApiPaths.some((path) => pathname.startsWith(path));
  const isAuthPage = authPaths.some((path) => pathname.startsWith(path));

  if (!session) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isProtected) {
      const from = encodeURIComponent(pathname);
      return NextResponse.redirect(new URL(`/auth/sign-in?from=${from}`, request.url));
    }
    return NextResponse.next();
  }

  if (isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
