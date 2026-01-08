/**
 * 认证配置
 * 密码通过环境变量 ACCESS_PASSWORD 设置
 * Session 密钥通过环境变量 SESSION_SECRET 设置
 */

export const authConfig = {
  // 访问密码（从环境变量读取，如果没有则使用默认值）
  // 注意：在生产环境中，必须通过环境变量设置
  password: process.env.ACCESS_PASSWORD || 'default_password',
  
  // Session 密钥（用于签名 session cookie）
  // 必须设置一个随机字符串，建议使用 openssl rand -base64 32 生成
  sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production-please-use-random-string',
  
  // Session 过期时间（毫秒）
  // 默认 24 小时
  sessionMaxAge: 24 * 60 * 60 * 1000,
  
  // Cookie 名称
  sessionCookieName: 'auth-session',
  
  // 最大登录尝试次数
  maxLoginAttempts: 5,
  
  // 锁定持续时间（毫秒）
  // 登录失败超过 maxLoginAttempts 次后，锁定 15 分钟
  lockoutDuration: 15 * 60 * 1000,
  
  // 是否启用认证（可以通过环境变量禁用）
  enabled: process.env.AUTH_ENABLED !== 'false', // 默认启用
} as const;

/**
 * 获取密码哈希
 * 如果环境变量中有 PASSWORD_HASH，使用它（推荐）
 * 否则使用明文密码（会在验证时加密比较）
 */
export function getPasswordHash(): string | null {
  return process.env.PASSWORD_HASH || null;
}
