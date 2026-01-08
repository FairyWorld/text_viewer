# Docker 部署和使用说明

## 概述

本项目支持 Docker 部署，使用 Docker Compose 管理容器。支持内部升级（Git pull），无需重新构建镜像。

## 架构设计

- **代码目录挂载**：代码通过 volume 挂载到容器，支持动态更新
- **日志目录挂载**：日志目录只读挂载，作为应用的根路径
- **路径安全**：所有文件访问严格限制在挂载的日志目录内

## 快速开始

### 1. 准备环境变量

创建 `.env.local` 文件（参考 `env.example`）：

```env
# 认证配置
ACCESS_PASSWORD=your_secure_password
SESSION_SECRET=your_random_secret_key

# 文件系统配置
FILES_DIRECTORY=/app/logs
ENABLE_LOCAL_FS=true
NODE_ENV=production
```

### 2. 创建日志目录

```bash
mkdir -p logs
```

### 3. 启动应用

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### 4. 访问应用

```
http://localhost:3000
```

## 配置说明

### Docker Compose 配置

`docker-compose.yml` 中的关键配置：

- **ports**: `3000:3000` - 端口映射
- **volumes**:
  - `.:/app` - 挂载代码目录（支持升级）
  - `./logs:/app/logs:ro` - 挂载日志目录（只读）
  - `/app/node_modules` - 排除 node_modules（使用容器内的）

### 环境变量

可以通过 `.env.local` 或 `docker-compose.yml` 设置环境变量：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `ACCESS_PASSWORD` | 访问密码 | `default_password` |
| `SESSION_SECRET` | Session 密钥 | `change-me-in-production` |
| `FILES_DIRECTORY` | 日志目录路径 | `/app/logs` |
| `ENABLE_LOCAL_FS` | 启用本地文件系统 | `true` |
| `AUTH_ENABLED` | 启用认证 | `true` |

### 端口映射

默认端口：`3000`

可以通过修改 `docker-compose.yml` 更改端口：

```yaml
ports:
  - "8080:3000"  # 映射到 8080
```

访问方式：
- `http://localhost:8080`
- `http://127.0.0.1:8080`
- `http://your-server-ip:8080`

## 升级应用

### 方式1：手动执行升级脚本（推荐）

```bash
# 在容器内执行升级脚本
docker-compose exec app sh /app/scripts/upgrade.sh

# 或使用 docker exec
docker exec -it log-viewer sh /app/scripts/upgrade.sh
```

### 方式2：通过 API 升级

```bash
# 需要先登录获取 session cookie
curl -X POST http://localhost:3000/api/admin/upgrade \
  -H "Cookie: auth-session=your_session_cookie"
```

### 方式3：Git Hook 自动升级

配置 Git Webhook 指向：

```
POST http://your-server:3000/api/admin/upgrade
```

**注意**：需要先登录并传递 session cookie。

### 升级脚本说明

`scripts/upgrade.sh` 执行以下操作：

1. Git pull 最新代码
2. 安装依赖（`pnpm install`）
3. 重新构建（如果是生产环境）
4. 重启应用（如果有 PM2）

**注意**：如果没有 PM2，需要手动重启容器：

```bash
docker-compose restart app
```

## 日志目录配置

### 挂载外部日志目录

如果需要挂载宿主机的其他目录：

```yaml
volumes:
  - /host/path/to/logs:/app/logs:ro
```

例如：

```yaml
volumes:
  - /var/log:/app/logs:ro  # 挂载系统日志目录
```

### 路径安全

- ✅ 所有路径访问严格限制在 `/app/logs` 内
- ✅ 无法访问容器外的文件
- ✅ 无法访问 `/app/logs` 上级目录
- ✅ 防止路径遍历攻击

## 生产环境建议

### 1. 使用强密码

```env
ACCESS_PASSWORD=至少16位强密码包含大小写数字特殊字符
```

### 2. 使用随机 Session 密钥

```bash
openssl rand -base64 32
```

### 3. 使用密码哈希

生成密码哈希：

```bash
node -e "const bcrypt=require('bcryptjs');bcrypt.hash('your_password',10).then(h=>console.log('PASSWORD_HASH='+h))"
```

设置到环境变量：

```env
PASSWORD_HASH=$2a$10$生成的哈希值
```

### 4. 定期备份

```bash
# 备份日志目录
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# 备份配置
tar -czf config-backup-$(date +%Y%m%d).tar.gz .env.local docker-compose.yml
```

## 故障排除

### 容器无法启动

1. 检查日志：
   ```bash
   docker-compose logs app
   ```

2. 检查环境变量：
   ```bash
   docker-compose config
   ```

3. 检查端口占用：
   ```bash
   netstat -an | grep 3000
   ```

### 无法访问文件

1. 检查日志目录权限：
   ```bash
   ls -la logs/
   ```

2. 检查挂载是否正确：
   ```bash
   docker-compose exec app ls -la /app/logs
   ```

3. 检查环境变量 `FILES_DIRECTORY`

### 升级失败

1. 检查 Git 是否可用：
   ```bash
   docker-compose exec app git --version
   ```

2. 检查网络连接（如果需要拉取远程代码）

3. 检查代码目录权限：
   ```bash
   ls -la .
   ```

### 认证问题

1. 检查环境变量 `ACCESS_PASSWORD` 和 `SESSION_SECRET`

2. 清除浏览器 cookie 重新登录

3. 检查认证是否启用：
   ```env
   AUTH_ENABLED=true
   ```

## Docker 命令参考

### 基本命令

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f app

# 进入容器
docker-compose exec app sh

# 重启服务
docker-compose restart app
```

### 升级相关

```bash
# 执行升级脚本
docker-compose exec app sh /app/scripts/upgrade.sh

# 查看升级日志
docker-compose logs -f app | grep upgrade

# 手动 Git pull（在容器内）
docker-compose exec app git pull

# 手动重启
docker-compose restart app
```

## 不使用 Docker Compose

如果只想使用 Dockerfile：

```bash
# 构建镜像
docker build -t log-viewer .

# 运行容器
docker run -d \
  --name log-viewer \
  -p 3000:3000 \
  -v $(pwd):/app \
  -v $(pwd)/logs:/app/logs:ro \
  -e ACCESS_PASSWORD=your_password \
  -e SESSION_SECRET=your_secret \
  -e FILES_DIRECTORY=/app/logs \
  -e ENABLE_LOCAL_FS=true \
  log-viewer

# 执行升级
docker exec -it log-viewer sh /app/scripts/upgrade.sh

# 重启
docker restart log-viewer
```

## 安全建议

1. **不要在生产环境使用默认密码**
2. **使用强密码和随机 Session 密钥**
3. **定期更新依赖**（`pnpm update`）
4. **定期备份配置和数据**
5. **限制容器网络访问**（如果可能）
6. **使用只读挂载**（日志目录）

## 下一步

- [ ] 配置 HTTPS（如果需要）
- [ ] 设置自动备份
- [ ] 配置监控和告警
- [ ] 优化容器资源限制
