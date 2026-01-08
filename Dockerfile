# 使用官方 Node.js 运行时作为基础镜像
FROM node:20-alpine

# 安装 pnpm 和 git（git 用于升级功能）
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache git

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV LOG_DIR=/app/logs

# 复制 package 文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile --prod=false

# 复制启动脚本
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 暴露端口
EXPOSE 3000

# 使用启动脚本作为入口点
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# 默认命令（可以在 docker-compose 中覆盖）
# 注意：代码目录通过 volume 挂载，所以不需要复制代码
CMD ["pnpm", "dev"]
