import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/config/auth';

/**
 * 登出 API
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ 
    success: true,
    message: 'Logged out successfully'
  });
  
  // 清除 session cookie
  response.cookies.delete(authConfig.sessionCookieName);
  
  return response;
}

/**
 * GET 方法也支持登出
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
