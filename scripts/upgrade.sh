#!/bin/sh
# 升级脚本
# 用于在容器内执行升级操作

set -e

cd /app

echo "Starting upgrade..."

# 检查 Git 是否可用
if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is not available"
  exit 1
fi

# 拉取最新代码
echo "Pulling latest code..."
git pull origin main || git pull origin master

# 安装依赖（如果有变化）
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# 重新构建（如果需要）
if [ "$NODE_ENV" = "production" ]; then
  echo "Building application..."
  pnpm build
fi

# 检查是否有 PM2 或其他进程管理器
# 如果没有，需要手动重启容器
if command -v pm2 >/dev/null 2>&1; then
  echo "Restarting with PM2..."
  pm2 restart app || pm2 start npm --name app -- start
else
  echo "Upgrade completed. Please restart the container manually:"
  echo "  docker-compose restart app"
  echo "Or if using docker run:"
  echo "  docker restart log-viewer"
fi

echo "Upgrade completed!"
