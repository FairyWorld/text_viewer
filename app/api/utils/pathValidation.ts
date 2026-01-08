import { resolve, relative } from 'path';

/**
 * 获取基础路径
 */
export function getBasePath(): string {
  const WATCH_DIRECTORY = process.env.FILES_DIRECTORY || './files';
  return resolve(process.cwd(), WATCH_DIRECTORY);
}

/**
 * 验证路径安全性
 * 严格限制所有路径（包括绝对路径）必须在 BASE_PATH 内
 * 
 * @param userPath 用户提供的路径（可以是相对路径或绝对路径）
 * @returns 如果路径安全，返回规范化的绝对路径；否则返回 null
 */
export function validatePath(userPath: string): string | null {
  const BASE_PATH = getBasePath();
  
  // 检查路径是否包含路径遍历攻击
  if (userPath.includes('..') || userPath.includes('~')) {
    return null;
  }
  
  // 规范化 BASE_PATH（确保路径比较的一致性）
  const normalizedBase = resolve(BASE_PATH);
  
  // 规范化用户路径
  let requestedPath: string;
  try {
    // 先解析路径（处理相对路径和绝对路径）
    requestedPath = resolve(normalizedBase, userPath);
    // 再次解析以确保路径规范化（处理 .. 和 .）
    requestedPath = resolve(requestedPath);
  } catch {
    return null;
  }
  
  // 规范化请求路径
  const normalizedRequested = resolve(requestedPath);
  
  // 使用 path.relative 检查路径是否在 BASE_PATH 内
  // 如果路径在 BASE_PATH 内，relative 不会以 .. 开头
  // 如果路径就是 BASE_PATH，relative 是空字符串
  const relativePath = relative(normalizedBase, normalizedRequested);
  
  // 检查相对路径是否包含 .. 或是否是绝对路径
  // 如果 relative 以 .. 开头或包含 ..，说明路径在 BASE_PATH 外
  if (relativePath.startsWith('..') || resolve(relativePath).startsWith('..')) {
    return null;
  }
  
  // 确保规范化后的路径以 BASE_PATH 开头（额外检查）
  // 这可以处理一些边缘情况，比如符号链接
  if (!normalizedRequested.startsWith(normalizedBase)) {
    return null;
  }
  
  return normalizedRequested;
}
