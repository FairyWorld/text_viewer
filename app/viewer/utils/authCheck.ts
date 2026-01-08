/**
 * 客户端认证检查工具
 */

/**
 * 检查当前用户是否已认证
 */
export async function checkAuthStatus(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/status");
    const data = await response.json();
    return data.authenticated === true;
  } catch {
    return false;
  }
}

/**
 * 登出
 */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.error("Logout error:", error);
  }
  // 无论成功与否，都重定向到登录页
  window.location.href = "/login";
}
