FROM node:24-alpine

# 安装 pnpm
RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g pnpm@latest && \
    corepack enable

RUN apk add --no-cache git

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PROJECT_NAME=text_viewer
ENV GIT_REPO_URL=https://githubfast.com/FairyWorld/text_viewer.git
ENV GIT_BRANCH=main

RUN printf '#!/bin/sh\n\
set -e\n\
PROJECT_DIR="/app/${PROJECT_NAME}"\n\
\n\
if [ ! -d "$PROJECT_DIR/.git" ]; then\n\
  if [ -d "$PROJECT_DIR" ]; then\n\
    rm -rf "$PROJECT_DIR"\n\
  fi\n\
  git clone --branch "${GIT_BRANCH:-main}" --depth 1 "${GIT_REPO_URL}" "$PROJECT_DIR" || {\n\
    echo "Error: Failed to clone repository"\n\
    exit 1\n\
  }\n\
fi\n\
# 确保 scripts 目录下的脚本有可执行权限\n\
if [ -d "$PROJECT_DIR/scripts" ]; then\n\
  chmod +x "$PROJECT_DIR/scripts"/*.sh 2>/dev/null || true\n\
fi\n\
if [ -f "$PROJECT_DIR/scripts/docker-entrypoint.sh" ]; then\n\
  exec sh "$PROJECT_DIR/scripts/docker-entrypoint.sh" "$@"\n\
else\n\
  echo "Error: docker-entrypoint.sh not found at $PROJECT_DIR/scripts/docker-entrypoint.sh"\n\
  exit 1\n\
fi\n\
' > /usr/local/bin/clone-and-run.sh && chmod +x /usr/local/bin/clone-and-run.sh

EXPOSE 3100 3200

CMD ["/usr/local/bin/clone-and-run.sh", "sh", "-c", "cd /app/${PROJECT_NAME} && pnpm start"]
