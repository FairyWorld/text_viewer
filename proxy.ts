import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionSignature } from "@/app/viewer/utils/auth";
import { authConfig } from "@/config/auth";

export async function proxy(request: NextRequest) {
  const startTime = Date.now();
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!authConfig.enabled) {
    const response = NextResponse.next();
    const duration = Date.now() - startTime;
    console.log(`[API ${method}] ${pathname}`, {
      statusCode: 200,
      duration: `${duration}ms`,
      ip,
    });
    return response;
  }

  // 允许访问的公开路径
  const publicPaths = ["/login", "/api/auth/login", "/api/auth/status"];

  // 检查是否是公开路径
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    const response = NextResponse.next();
    const duration = Date.now() - startTime;
    console.log(`[API ${method}] ${pathname}`, {
      statusCode: 200,
      duration: `${duration}ms`,
      ip,
    });
    return response;
  }

  // 检查 session
  const sessionCookie = request.cookies.get(authConfig.sessionCookieName);

  if (!sessionCookie) {
    const duration = Date.now() - startTime;
    // 如果是 API 请求，返回 401
    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json(
        { error: "Unauthorized", message: "Please login first" },
        { status: 401 }
      );
      console.error(`[API ${method}] ${pathname}`, {
        statusCode: 401,
        duration: `${duration}ms`,
        ip,
      });
      return response;
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    console.error(`[API ${method}] ${pathname}`, {
      statusCode: 302,
      duration: `${duration}ms`,
      ip,
    });
    return response;
  }

  // 验证 session
  const token = await verifySessionSignature(sessionCookie.value);

  if (!token) {
    const duration = Date.now() - startTime;
    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json(
        { error: "Unauthorized", message: "Invalid session" },
        { status: 401 }
      );
      response.cookies.delete(authConfig.sessionCookieName);
      console.error(`[API ${method}] ${pathname}`, {
        statusCode: 401,
        duration: `${duration}ms`,
        ip,
      });
      return response;
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(authConfig.sessionCookieName);
    console.error(`[API ${method}] ${pathname}`, {
      statusCode: 302,
      duration: `${duration}ms`,
      ip,
    });
    return response;
  }

  // 认证通过
  const response = NextResponse.next();
  const duration = Date.now() - startTime;
  console.log(`[API ${method}] ${pathname}`, {
    statusCode: 200,
    duration: `${duration}ms`,
    ip,
  });
  return response;
}

/**
 * 配置需要保护的路径
 */
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (favicon)
     * - public 文件夹中的文件
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
