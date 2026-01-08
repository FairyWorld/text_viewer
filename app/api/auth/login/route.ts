import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateSessionToken, signSession } from '@/app/viewer/utils/auth';
import { authConfig } from '@/config/auth';
import { logger } from '@/lib/logger';

// 简单的登录尝试记录（实际应该使用 Redis 或数据库）
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();

/**
 * 检查 IP 是否被锁定
 */
function isLocked(ip: string): boolean {
  const attempts = loginAttempts.get(ip);
  if (!attempts) return false;
  
  if (attempts.lockUntil > Date.now()) {
    return true;
  }
  
  // 锁定已过期，清除记录
  if (attempts.lockUntil > 0 && attempts.lockUntil <= Date.now()) {
    loginAttempts.delete(ip);
  }
  
  return false;
}

/**
 * 记录登录失败
 */
function recordFailedLogin(ip: string): void {
  const attempts = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
  attempts.count += 1;
  
  if (attempts.count >= authConfig.maxLoginAttempts) {
    attempts.lockUntil = Date.now() + authConfig.lockoutDuration;
  }
  
  loginAttempts.set(ip, attempts);
}

/**
 * 清除登录失败记录
 */
function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

/**
 * 获取客户端 IP
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIP || 'unknown';
}

/**
 * 登录 API
 */
export async function POST(request: NextRequest) {
  // 如果认证被禁用，直接返回成功
  if (!authConfig.enabled) {
    return NextResponse.json({ success: true, message: 'Auth is disabled' });
  }
  
  try {
    const body = await request.json();
    const { password } = body;
    
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }
    
    const clientIP = getClientIP(request);
    
    // 检查是否被锁定
    if (isLocked(clientIP)) {
      const attempts = loginAttempts.get(clientIP);
      const remainingTime = Math.ceil((attempts!.lockUntil - Date.now()) / 1000 / 60);
      return NextResponse.json(
        { 
          error: 'Too many failed login attempts',
          message: `Account locked. Please try again in ${remainingTime} minutes.`
        },
        { status: 429 }
      );
    }
    
    // 验证密码
    const isValid = await verifyPassword(password);
    
    if (!isValid) {
      recordFailedLogin(clientIP);
      const attempts = loginAttempts.get(clientIP);
      const remaining = authConfig.maxLoginAttempts - attempts!.count;
      
      logger.warn('Login failed', {
        ip: clientIP,
        remainingAttempts: remaining,
        locked: remaining === 0,
      });
      
      return NextResponse.json(
        { 
          error: 'Invalid password',
          message: remaining > 0 
            ? `Invalid password. ${remaining} attempts remaining.`
            : 'Too many failed attempts. Account locked.'
        },
        { status: 401 }
      );
    }
    
    // 密码正确，创建 session
    clearLoginAttempts(clientIP);
    const token = generateSessionToken();
    const signedToken = await signSession(token);
    
    logger.info('Login successful', {
      ip: clientIP,
    });
    
    // 设置 cookie
    const response = NextResponse.json({ 
      success: true,
      message: 'Login successful'
    });
    
    response.cookies.set(authConfig.sessionCookieName, signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // 生产环境使用 HTTPS 时启用
      sameSite: 'lax',
      maxAge: authConfig.sessionMaxAge / 1000, // 转换为秒
      path: '/',
    });
    
    return response;
  } catch (error: any) {
    logger.error('Login error', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
