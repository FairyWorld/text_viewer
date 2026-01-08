import { NextRequest, NextResponse } from 'next/server';
import { verifySessionSignature } from '@/app/viewer/utils/auth';
import { authConfig } from '@/config/auth';

/**
 * 检查认证状态 API
 */
export async function GET(request: NextRequest) {
  // 如果认证被禁用，返回已认证状态
  if (!authConfig.enabled) {
    return NextResponse.json({ authenticated: true, enabled: false });
  }
  
  const sessionCookie = request.cookies.get(authConfig.sessionCookieName);
  
  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false });
  }
  
  const token = verifySessionSignature(sessionCookie.value);
  
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }
  
  return NextResponse.json({ authenticated: true });
}
