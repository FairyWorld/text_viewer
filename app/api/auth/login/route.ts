import { NextRequest, NextResponse } from "next/server";
import {
  verifyPassword,
  generateSessionToken,
  signSession,
} from "@/app/viewer/utils/auth";
import { authConfig } from "@/config/auth";
import { logger } from "@/lib/logger";

/**
 * 获取客户端 IP
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0] || realIP || "unknown";
}

/**
 * 登录 API
 */
export async function POST(request: NextRequest) {
  // 如果认证被禁用，直接返回成功
  if (!authConfig.enabled) {
    return NextResponse.json({ success: true, message: "Auth is disabled" });
  }

  try {
    const body = await request.json();
    const { password } = body; // password 是客户端发送的 SHA-256 hash

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "密码不能为空", message: "密码不能为空" },
        { status: 400 }
      );
    }

    const clientIP = getClientIP(request);

    // 验证密码（比较客户端发送的 hash 和配置中密码的 hash）
    const isValid = await verifyPassword(password);

    if (!isValid) {
      logger.warn("Login failed", {
        ip: clientIP,
      });

      return NextResponse.json(
        {
          error: "密码错误",
          message: "密码错误",
        },
        { status: 401 }
      );
    }

    // 密码正确，创建 session
    const token = generateSessionToken();
    const signedToken = await signSession(token);

    logger.info("Login successful", {
      ip: clientIP,
    });

    // 设置 cookie
    const response = NextResponse.json({
      success: true,
      message: "登录成功",
    });

    // 判断是否使用 secure cookie
    // 1. 如果设置了 COOKIE_SECURE 环境变量，使用该值（'true' 或 'false'）
    // 2. 否则根据请求协议判断（HTTPS 使用 secure，HTTP 不使用）
    let cookieSecure = false;
    if (process.env.COOKIE_SECURE === "true") {
      cookieSecure = true;
    } else if (process.env.COOKIE_SECURE === "false") {
      cookieSecure = false;
    } else {
      // 未设置 COOKIE_SECURE，根据请求协议自动判断
      cookieSecure = request.url.startsWith("https://");
    }

    response.cookies.set(authConfig.sessionCookieName, signedToken, {
      httpOnly: true,
      secure: cookieSecure, // 只在 HTTPS 或明确设置时启用
      sameSite: "lax",
      maxAge: authConfig.sessionMaxAge / 1000, // 转换为秒
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    logger.error("Login error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "服务器内部错误", message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
