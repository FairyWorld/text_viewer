/**
 * 应用启动脚本
 * 1. 加载配置（代码目录）
 * 2. 记录启动日志
 * 注意：这个文件在服务器端执行
 */

// 只在服务器端执行
if (typeof window === "undefined") {
  // 使用动态导入，避免在客户端执行
  Promise.resolve().then(async () => {
    try {
      // 1. 加载配置
      const { loadEnvFiles } = await import("@/lib/config-loader");
      loadEnvFiles();

      // 2. 记录启动信息
      const { logDockerStart, logDockerReady } = await import("@/lib/logger");
      logDockerStart();

      // 等待应用就绪后记录
      setTimeout(() => {
        logDockerReady();
      }, 2000);
    } catch {
      // 如果导入失败，使用 console（开发环境）
      console.log("[Startup] Logger not available, using console");
      console.log("[Startup] Application starting...", {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT || 3100,
      });
    }
  });
}
