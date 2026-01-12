#!/bin/sh

set -e

PROJECT_DIR="/app/${PROJECT_NAME:-text_viewer}"

echo "=========================================="
echo "Docker Container Starting..."
echo "Timestamp: $(date -Iseconds)"
echo "Node Version: $(node --version)"
echo "NODE_ENV: ${NODE_ENV:-production}"
echo "PROJECT_DIR: $PROJECT_DIR"
echo "GIT_REPO_URL: ${GIT_REPO_URL}"
echo "GIT_BRANCH: ${GIT_BRANCH:-main}"
echo "=========================================="

# 1. Clone 代码
if [ ! -d "$PROJECT_DIR/.git" ]; then
  echo "Cloning repository to $PROJECT_DIR..."
  if [ -z "$GIT_REPO_URL" ]; then
    echo "Error: GIT_REPO_URL is not set"
    exit 1
  fi
  
  if [ -d "$PROJECT_DIR" ]; then
    echo "Removing existing directory: $PROJECT_DIR"
    rm -rf "$PROJECT_DIR"
  fi
  
  git clone --branch "${GIT_BRANCH:-main}" --depth 1 "$GIT_REPO_URL" "$PROJECT_DIR" || {
    echo "Error: Failed to clone repository"
    exit 1
  }
else
  echo "Code already exists at $PROJECT_DIR, skipping clone"
  # 如果代码已存在，确保 scripts 目录下的脚本有可执行权限
  if [ -d "$PROJECT_DIR/scripts" ]; then
    chmod +x "$PROJECT_DIR/scripts"/*.sh 2>/dev/null || true
  fi
fi

# 进入应用目录
cd "$PROJECT_DIR" || exit 1

# 1.5. 创建alias（确保每次交互式 shell 都加载）
# Alpine Linux 使用 ash，配置文件加载顺序：
# - 登录 shell: /etc/profile -> ~/.profile
# - 非登录交互式 shell: 通过 ENV 环境变量指向的文件（通常是 ~/.ashrc）
# docker exec -it 启动的是非登录交互式 shell，需要设置 ENV

# 创建 ~/.ashrc 文件存放 alias（非登录交互式 shell 会读取）
cat > /root/.ashrc <<EOF
# Alias definitions
alias upgrade="chmod +x $PROJECT_DIR/scripts/upgrade.sh 2>/dev/null || true && sh $PROJECT_DIR/scripts/upgrade.sh"
alias dev="cd $PROJECT_DIR && NODE_ENV=development pnpm dev"
EOF

# 在 ~/.profile 中设置 ENV，让非登录交互式 shell 读取 ~/.ashrc
if ! grep -q "export ENV=" /root/.profile 2>/dev/null; then
  echo '' >> /root/.profile
  echo '# Set ENV for non-login interactive shells (docker exec -it)' >> /root/.profile
  echo 'export ENV="$HOME/.ashrc"' >> /root/.profile
fi

# 也在 ~/.profile 中直接定义 alias（登录 shell 会读取）
if ! grep -q "alias upgrade=" /root/.profile 2>/dev/null; then
  echo '' >> /root/.profile
  echo '# Alias definitions (for login shell)' >> /root/.profile
  echo "alias upgrade=\"chmod +x $PROJECT_DIR/scripts/upgrade.sh 2>/dev/null || true && sh $PROJECT_DIR/scripts/upgrade.sh\"" >> /root/.profile
  echo "alias dev=\"cd $PROJECT_DIR && NODE_ENV=development pnpm dev\"" >> /root/.profile
fi

# 在 /etc/profile 中也添加（system-wide，登录 shell 会读取）
if ! grep -q "alias upgrade=" /etc/profile 2>/dev/null; then
  echo '' >> /etc/profile
  echo '# Alias definitions (system-wide)' >> /etc/profile
  echo "alias upgrade=\"chmod +x $PROJECT_DIR/scripts/upgrade.sh 2>/dev/null || true && sh $PROJECT_DIR/scripts/upgrade.sh\"" >> /etc/profile
  echo "alias dev=\"cd $PROJECT_DIR && NODE_ENV=development pnpm dev\"" >> /etc/profile
fi

# 2. 配置 pnpm 镜像源
if [ -n "$PNPM_REGISTRY" ]; then
  echo "Configuring pnpm registry: $PNPM_REGISTRY"
  pnpm config set registry "$PNPM_REGISTRY"
  pnpm config set network-timeout 300000
  echo "Network timeout set to 300 seconds"
fi

# 3. 安装依赖
echo "Installing dependencies..."
pnpm install

# 4. 构建应用（如果是生产环境且 .next 不存在）
if [ "$NODE_ENV" = "production" ] && [ ! -d "$PROJECT_DIR/.next" ]; then
  echo "Building application..."
  pnpm run build || {
    echo "Error: Failed to build application"
    exit 1
  }
fi

echo "=========================================="
echo "Starting application in $PROJECT_DIR..."
echo "=========================================="

# 设置工作目录环境变量
export PROJECT_DIR="$PROJECT_DIR"

# 执行传入的命令
exec "$@"
