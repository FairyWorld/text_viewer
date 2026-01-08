#!/bin/sh
# Docker 启动入口脚本
# 记录启动日志并启动应用

set -e

# 导入日志函数（如果 Node.js 已启动）
# 这里先使用简单的 echo，实际日志会在应用启动后记录

echo "=========================================="
echo "Docker Container Starting..."
echo "Timestamp: $(date -Iseconds)"
echo "Node Version: $(node --version)"
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "PORT: ${PORT:-3000}"
echo "FILES_DIRECTORY: ${FILES_DIRECTORY:-./files}"
echo "ENABLE_LOCAL_FS: ${ENABLE_LOCAL_FS:-false}"
echo "AUTH_ENABLED: ${AUTH_ENABLED:-true}"
echo "=========================================="

# 记录到 Docker 日志文件（如果日志目录可写）
if [ -w "/app/logs" ] || [ -w "/app" ]; then
  LOG_DIR="${LOG_DIR:-/app/logs}"
  mkdir -p "$LOG_DIR"
  echo "$(date -Iseconds) [DOCKER] Container starting..." >> "$LOG_DIR/docker.log" 2>/dev/null || true
fi

# 执行传入的命令（通常是 pnpm dev 或 pnpm start）
exec "$@"
