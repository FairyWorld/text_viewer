#!/bin/sh

set -e

PROJECT_DIR="/app/${PROJECT_NAME:-text_viewer}"

echo "=========================================="
echo "Starting upgrade..."
echo "PROJECT_DIR: $PROJECT_DIR"
echo "=========================================="

# 检查 Git 是否可用
if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is not available"
  exit 1
fi

# 检查代码目录是否存在
if [ ! -d "$PROJECT_DIR/.git" ]; then
  echo "Error: Code directory not found at $PROJECT_DIR"
  echo "Please ensure the container was started correctly."
  exit 1
fi

# 进入项目目录
cd "$PROJECT_DIR" || exit 1

# 记录当前 commit hash（用于检测是否有更新）
CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")
CURRENT_COMMIT_SHORT=$(echo "$CURRENT_COMMIT" | cut -c1-7)

# 拉取最新代码
echo "Pulling latest code..."
if git pull origin "${GIT_BRANCH:-main}" >/dev/null 2>&1; then
  # 检查是否有更新
  NEW_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")
  NEW_COMMIT_SHORT=$(echo "$NEW_COMMIT" | cut -c1-7)
  
  if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ] && [ -n "$CURRENT_COMMIT" ]; then
    echo "✅ No updates available (already at latest commit: $CURRENT_COMMIT_SHORT)"
    echo "Skipping dependency installation, build and restart..."
    exit 0
  else
    if [ -n "$CURRENT_COMMIT" ]; then
      echo "✅ Code updated: $CURRENT_COMMIT_SHORT -> $NEW_COMMIT_SHORT"
    else
      echo "✅ Code pulled successfully (commit: $NEW_COMMIT_SHORT)"
    fi
  fi
else
  echo "⚠️  git pull failed, but continuing..."
fi

if [ -d "$PROJECT_DIR/scripts" ]; then
  chmod +x "$PROJECT_DIR/scripts"/*.sh 2>/dev/null || true
fi

# 安装依赖
echo "Installing dependencies..."
# 配置 pnpm 镜像源（如果未配置且提供了环境变量）
if ! pnpm config get registry | grep -q "http"; then
  if [ -n "$PNPM_REGISTRY" ]; then
    echo "Configuring pnpm registry: $PNPM_REGISTRY"
    pnpm config set registry "$PNPM_REGISTRY"
    pnpm config set network-timeout 300000
  fi
fi

# 安装依赖（自动更新 lockfile 如果 package.json 有变化）
pnpm install

# 重新构建（如果是生产环境）
if [ "$NODE_ENV" = "production" ]; then
  echo "Building application..."
  pnpm run build
  
  echo "=========================================="
  echo "Upgrade completed! Restarting application..."
  echo "=========================================="
  
  # 尝试重启应用进程
  # PID 1 是容器主进程（shell），终止它会停止容器
  # Docker 会根据 restart 策略自动重启容器，从而加载新的构建
  
  # 方法1: 找到监听 3200 端口的进程（node 子进程）
  RESTART_NEEDED=true
  if command -v lsof >/dev/null 2>&1; then
    # 获取监听 3200 端口的进程 PID
    # -t 选项只返回 PID，-i:3200 指定端口
    # 使用 grep 过滤只保留数字，确保只取第一个
    PID=$(lsof -ti:3200 2>/dev/null | grep -oE '^[0-9]+' | head -n1 || true)
    
    if [ -n "$PID" ] && [ "$PID" -gt 0 ] 2>/dev/null; then
      # 检查 PID 是否为 1（容器主进程）
      if [ "$PID" = "1" ]; then
        echo "⚠️  Port 3200 is listened by PID 1 (container main process), skipping method 1"
        echo "    This means the node process is the main process, will use method 2"
      else
        echo "Found process listening on port 3200 (PID: $PID), sending SIGTERM..."
        if kill -TERM "$PID" 2>/dev/null; then
          echo "✅ Application process terminated, waiting for restart..."
          sleep 3
          # 检查进程是否还在运行
          if ! kill -0 "$PID" 2>/dev/null; then
            echo "✅ Application process stopped successfully"
            RESTART_NEEDED=false
          else
            echo "⚠️  Process still running, will use method 2"
          fi
        else
          echo "⚠️  Failed to send SIGTERM to PID $PID, will use method 2"
        fi
      fi
    else
      echo "No process found listening on port 3200"
    fi
  else
    echo "lsof not available, skipping method 1"
  fi
  
  # 方法2: 如果方法1失败，重启整个容器
  if [ "$RESTART_NEEDED" = "true" ]; then
    echo "Sending SIGTERM to container main process (PID 1) to trigger restart..."
    echo "Docker will automatically restart the container with the new build."
    kill -TERM 1 2>/dev/null || {
      echo ""
      echo "⚠️  Could not send signal to PID 1. Please manually restart the container:"
      echo "  docker-compose restart app"
      echo "Or if using docker run:"
      echo "  docker restart text-viewer"
    }
  fi
else
  echo "=========================================="
  echo "Upgrade completed!"
  echo "=========================================="
fi
