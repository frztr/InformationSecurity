import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PENDING_LOGIN_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/infrastructure/http/AuthCookies";

const SESSION_OPTIONAL_ADMIN_GET = new Set(["/api/admin/methods"]);

function hasCookie(request: NextRequest, name: string): boolean {
  return Boolean(request.cookies.get(name)?.value);
}

function isProtectedPage(pathname: string): boolean {
  return pathname === "/workspace" || pathname.startsWith("/workspace/") || pathname === "/admin" || pathname.startsWith("/admin/");
}

function isPendingLoginPage(pathname: string): boolean {
  return pathname === "/login/email" || pathname === "/login/totp";
}

function isProtectedApi(pathname: string, method: string): boolean {
  if (pathname === "/api/messages" || pathname.startsWith("/api/messages/")) {
    return true;
  }
  if (pathname === "/api/admin" || pathname.startsWith("/api/admin/")) {
    return !(method === "GET" && SESSION_OPTIONAL_ADMIN_GET.has(pathname));
  }
  return false;
}

/**
 * Проверяет cookie сессии или незавершённого входа и отсекает доступ к защищённым страницам и API.
 * Без cookie сессии страницы `/workspace` и `/admin` перенаправляются на `/login`, API сообщений и админки отвечают 401.
 * Шаги `/login/email` и `/login/totp` требуют cookie незавершённого входа.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProtectedPage(pathname) && !hasCookie(request, SESSION_COOKIE_NAME)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPendingLoginPage(pathname) && !hasCookie(request, PENDING_LOGIN_COOKIE_NAME)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isProtectedApi(pathname, request.method) && !hasCookie(request, SESSION_COOKIE_NAME)) {
    return NextResponse.json({ error: "Нужна аутентификация" }, { status: 401 });
  }

  return NextResponse.next();
}

/** Маршруты, на которых выполняется `proxy`. */
export const config = {
  matcher: [
    "/workspace",
    "/workspace/:path*",
    "/admin",
    "/admin/:path*",
    "/login/email",
    "/login/totp",
    "/api/messages",
    "/api/messages/:path*",
    "/api/admin/:path*",
  ],
};
