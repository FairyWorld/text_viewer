import { authConfig } from "@/config/auth";

/**
 * 使用简单的哈希函数对密码进行哈希
 * 与服务端和客户端使用相同的算法
 */
export async function hashPassword(password: string): Promise<string> {
  // 使用简单的字符串哈希（与服务端保持一致）
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const hash1 = Math.abs(hash).toString(16).padStart(8, "0");

  // 反向哈希
  let hash2 = 0;
  for (let i = password.length - 1; i >= 0; i--) {
    const char = password.charCodeAt(i);
    hash2 = (hash2 << 5) - hash2 + char;
    hash2 = hash2 & hash2;
  }
  const hash2Str = Math.abs(hash2).toString(16).padStart(8, "0");

  // 组合并填充到 32 位
  return (hash1 + hash2Str + hash1 + hash2Str).substring(0, 32);
}

/**
 * 验证密码
 * 接收客户端发送的密码哈希，与配置中的明文密码哈希进行比较
 */
export async function verifyPassword(passwordHash: string): Promise<boolean> {
  const configPassword = authConfig.password;
  const configPasswordHash = await hashPassword(configPassword);
  return passwordHash === configPasswordHash;
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
    const parts = token.split("-");
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
 * 使用简单的哈希函数（不依赖 crypto 模块）
 */
export async function signSession(token: string): Promise<string> {
  try {
    // 使用简单的哈希函数生成签名（与服务端保持一致）
    const secret = authConfig.sessionSecret;
    const combined = `${token}.${secret}`;

    // 使用相同的哈希算法
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    const hash1 = Math.abs(hash).toString(16).padStart(8, "0");

    // 反向哈希
    let hash2 = 0;
    for (let i = combined.length - 1; i >= 0; i--) {
      const char = combined.charCodeAt(i);
      hash2 = (hash2 << 5) - hash2 + char;
      hash2 = hash2 & hash2;
    }
    const hash2Str = Math.abs(hash2).toString(16).padStart(8, "0");

    // 生成 16 位签名
    const signatureHex = (hash1 + hash2Str).substring(0, 16);
    return `${token}.${signatureHex}`;
  } catch (error) {
    console.error("signSession error:", error);
    throw new Error("Failed to sign session");
  }
}

/**
 * 验证 session 签名
 */
export async function verifySessionSignature(
  signedToken: string
): Promise<string | null> {
  try {
    const parts = signedToken.split(".");
    if (parts.length !== 2) return null;

    const [token, signature] = parts;
    const signed = await signSession(token);
    const expectedSignature = signed.split(".")[1];

    if (signature !== expectedSignature) return null;

    return validateSessionToken(token) ? token : null;
  } catch {
    return null;
  }
}
