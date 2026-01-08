import { NextRequest } from 'next/server';
import { verifySessionSignature } from '@/app/viewer/utils/auth';
import { authConfig } from '@/config/auth';

/**
 * 在 API 路由中检查认证状态
 * 返回 null 表示已认证，返回 Response 表示未认证
 */
export async function checkAuth(request: NextRequest): Promise<Response | null> {
  // 如果认证被禁用，直接通过
  if (!authConfig.enabled) {
    return null;
  }
  
  const sessionCookie = request.cookies.get(authConfig.sessionCookieName);
  
  if (!sessionCookie) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Please login first' }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  const token = await verifySessionSignature(sessionCookie.value);
  
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Invalid session' }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return null; // 已认证
}
