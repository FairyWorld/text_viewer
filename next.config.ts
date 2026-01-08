import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 输出 standalone 模式用于 Docker（可选，如果支持）
  // output: 'standalone',

  // 日志配置
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // 生产环境日志
  onDemandEntries: {
    // 页面在内存中保持的时间（毫秒）
    maxInactiveAge: 25 * 1000,
    // 同时保持的页面数量
    pagesBufferLength: 2,
  },
};

export default nextConfig;
