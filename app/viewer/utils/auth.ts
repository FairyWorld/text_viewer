import bcrypt from 'bcryptjs';
import { authConfig, getPasswordHash } from '@/config/auth';

/**
 * 生成密码哈希
 * 用于初始化密码时生成哈希值
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * 验证密码
 * 支持两种方式：
 * 1. 如果配置了 PASSWORD_HASH，比较哈希值
 * 2. 否则直接比较明文密码（不推荐，但为了兼容性保留）
 */
export async function verifyPassword(password: string): Promise<boolean> {
  const passwordHash = getPasswordHash();
  const configPassword = authConfig.password;
  
  // 如果配置了密码哈希，使用哈希比较
  if (passwordHash) {
    return await bcrypt.compare(password, passwordHash);
  }
  
  // 否则直接比较明文（不推荐，但为了兼容性）
  return password === configPassword;
}

/**
 * 生成简单的 session token
 * 使用时间戳 + 随机字符串
 */
export function generateSessionToken(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

/**
 * 验证 session token
 * 检查 token 格式和过期时间
 */
export function validateSessionToken(token: string): boolean {
  try {
    const parts = token.split('-');
    if (parts.length < 2) return false;
    
    const timestamp = parseInt(parts[0], 10);
    if (isNaN(timestamp)) return false;
    
    // 检查是否过期
    const now = Date.now();
    const age = now - timestamp;
    
    return age >= 0 && age < authConfig.sessionMaxAge;
  } catch {
    return false;
  }
}

/**
 * 创建 session 签名
 * 使用 Web Crypto API 的 HMAC 签名（Edge Runtime 兼容）
 */
export async function signSession(token: string): Promise<string> {
  // 使用 Web Crypto API 的 HMAC
  const encoder = new TextEncoder();
  const keyData = encoder.encode(authConfig.sessionSecret);
  const tokenData = encoder.encode(token);
  
  // 导入密钥
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // 生成签名
  const signature = await crypto.subtle.sign('HMAC', key, tokenData);
  
  // 转换为十六进制字符串
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16);
  
  return `${token}.${signatureHex}`;
}

/**
 * 验证 session 签名
 */
export async function verifySessionSignature(signedToken: string): Promise<string | null> {
  try {
    const parts = signedToken.split('.');
    if (parts.length !== 2) return null;
    
    const [token, signature] = parts;
    const signed = await signSession(token);
    const expectedSignature = signed.split('.')[1];
    
    if (signature !== expectedSignature) return null;
    
    return validateSessionToken(token) ? token : null;
  } catch {
    return null;
  }
}
