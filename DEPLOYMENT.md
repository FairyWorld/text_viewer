# 部署文档

本文档说明如何配置和部署 Log Viewer 应用。

## 目录

- [环境要求](#环境要求)
- [配置说明](#配置说明)
- [部署流程](#部署流程)
- [Docker 部署](#docker-部署)
- [环境变量配置](#环境变量配置)
- [升级流程](#升级流程)
- [维护和监控](#维护和监控)
- [故障排除](#故障排除)
- [安全建议](#安全建议)

---

## 环境要求

### 系统要求

- **操作系统**: Linux, macOS, 或 Windows（支持 Docker）
- **Docker**: 20.10 或更高版本
- **Docker Compose**: 1.29 或更高版本（可选，推荐）

### 资源要求

- **CPU**: 1 核心（推荐 2 核心）
- **内存**: 512MB（推荐 1GB）
- **磁盘**: 100MB（不包括日志文件）
- **网络**: 端口 3000（可自定义）

---

## 配置说明

### 文件结构

```
项目目录/
├── .env.local              # 环境变量配置文件（需创建）
├── docker-compose.yml      # Docker Compose 配置
├── Dockerfile              # Docker 镜像构建文件
├── scripts/
│   └── upgrade.sh          # 升级脚本
└── logs/                   # 日志目录（需创建）
```

### 必需的配置文件

1. **`.env.local`** - 环境变量配置（必须）
2. **`docker-compose.yml`** - Docker Compose 配置（如使用 Docker Compose）
3. **`logs/`** - 日志目录（需创建）

---

## 部署流程

### 方式一：使用 Docker Compose（推荐）

#### 1. 准备配置文件

**创建环境变量文件**：

```bash
# 复制示例文件
cp env.example .env.local

# 编辑配置文件
nano .env.local  # 或使用其他编辑器
```

**必需的环境变量**（参考 [环境变量配置](#环境变量配置)）：

```env
ACCESS_PASSWORD=your_secure_password
SESSION_SECRET=your_random_secret_key
FILES_DIRECTORY=/app/logs
ENABLE_LOCAL_FS=true
NODE_ENV=production
```

#### 2. 创建日志目录

```bash
mkdir -p logs

# 设置权限（如果需要）
chmod 755 logs
```

#### 3. 启动服务

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 检查状态
docker-compose ps
```

#### 4. 验证部署

```bash
# 检查容器状态
docker-compose ps

# 检查端口监听
netstat -tuln | grep 3000
# 或
ss -tuln | grep 3000

# 测试访问
curl http://localhost:3000/api/auth/status
```

#### 5. 停止服务

```bash
# 停止（保留容器）
docker-compose stop

# 停止并删除容器
docker-compose down

# 停止并删除所有数据（包括 volumes）
docker-compose down -v
```

---

### 方式二：使用 Docker（不使用 Compose）

#### 1. 准备环境

```bash
# 创建日志目录
mkdir -p logs

# 创建环境变量文件
cp env.example .env.local
# 编辑 .env.local
```

#### 2. 构建镜像

```bash
docker build -t log-viewer:latest .
```

#### 3. 运行容器

```bash
docker run -d \
  --name log-viewer \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd):/app \
  -v $(pwd)/logs:/app/logs:ro \
  --env-file .env.local \
  log-viewer:latest
```

**Windows PowerShell**:

```powershell
docker run -d `
  --name log-viewer `
  --restart unless-stopped `
  -p 3000:3000 `
  -v ${PWD}:/app `
  -v ${PWD}/logs:/app/logs:ro `
  --env-file .env.local `
  log-viewer:latest
```

#### 4. 验证部署

```bash
# 查看容器状态
docker ps | grep log-viewer

# 查看日志
docker logs -f log-viewer

# 测试访问
curl http://localhost:3000/api/auth/status
```

#### 5. 停止和删除

```bash
# 停止容器
docker stop log-viewer

# 删除容器
docker rm log-viewer

# 删除镜像
docker rmi log-viewer:latest
```

---

## Docker 部署

### Dockerfile 说明

**基础镜像**: `node:20-alpine`

**特性**:
- 使用 Alpine Linux（轻量级）
- 包含 Git（用于升级功能）
- 使用 pnpm 包管理器
- 代码通过 volume 挂载（支持动态更新）

### Docker Compose 配置说明

**服务名称**: `app`

**端口映射**: `3000:3000`

**Volume 挂载**:
- `.:/app` - 代码目录（读写）
- `./logs:/app/logs:ro` - 日志目录（只读）
- `/app/node_modules` - 排除 node_modules（使用容器内的）

**环境变量**: 从 `.env.local` 文件读取

**重启策略**: `unless-stopped`

### 自定义端口

修改 `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # 映射到 8080
```

或使用 Docker:

```bash
docker run -p 8080:3000 ...
```

### 挂载外部日志目录

**Docker Compose**:

```yaml
volumes:
  - /host/path/to/logs:/app/logs:ro
```

**Docker**:

```bash
docker run -v /host/path/to/logs:/app/logs:ro ...
```

**示例**:

```yaml
# 挂载系统日志目录
volumes:
  - /var/log:/app/logs:ro

# 挂载多个目录（使用符号链接或修改配置）
```

---

## 环境变量配置

### 配置文件位置

- **开发环境**: `.env.local`
- **Docker**: 通过 `--env-file` 或 `docker-compose.yml` 的 `environment` 部分

### 必需的配置

#### 认证配置

| 变量名 | 说明 | 示例 | 必需 |
|--------|------|------|------|
| `ACCESS_PASSWORD` | 访问密码 | `mySecurePassword123` | ✅ |
| `SESSION_SECRET` | Session 密钥 | `random_secret_key_32_chars` | ✅ |

**生成 Session 密钥**:

```bash
# Linux/macOS
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**推荐：使用密码哈希**（更安全）:

```bash
# 生成密码哈希
node -e "const bcrypt=require('bcryptjs');bcrypt.hash('your_password',10).then(h=>console.log('PASSWORD_HASH='+h))"
```

然后设置 `PASSWORD_HASH` 环境变量。

#### 文件系统配置

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `FILES_DIRECTORY` | 日志目录路径 | `./files` | ❌ |
| `ENABLE_LOCAL_FS` | 启用本地文件系统 | - | ❌ |

**Docker 环境推荐配置**:

```env
FILES_DIRECTORY=/app/logs
ENABLE_LOCAL_FS=true
```

### 可选的配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `AUTH_ENABLED` | 启用认证 | `true` |
| `NODE_ENV` | Node.js 环境 | `production` |
| `PASSWORD_HASH` | 密码哈希（如果设置，优先于 `ACCESS_PASSWORD`） | - |

### 完整配置示例

**`.env.local`**:

```env
# ============================================
# 认证配置
# ============================================

# 访问密码（必需）
ACCESS_PASSWORD=your_secure_password_here

# Session 密钥（必需，建议使用随机字符串）
SESSION_SECRET=your_random_secret_key_here

# 密码哈希（可选，推荐使用）
# PASSWORD_HASH=$2a$10$生成的哈希值

# 是否启用认证（可选，默认 true）
AUTH_ENABLED=true

# ============================================
# 文件系统配置
# ============================================

# 文件目录路径
FILES_DIRECTORY=/app/logs

# 启用本地文件系统访问
ENABLE_LOCAL_FS=true

# ============================================
# 环境配置
# ============================================

# Node.js 环境
NODE_ENV=production
```

### 配置验证

```bash
# 检查环境变量（Docker Compose）
docker-compose config

# 检查环境变量（Docker）
docker exec log-viewer env | grep -E "(ACCESS_PASSWORD|SESSION_SECRET|FILES_DIRECTORY)"
```

---

## 升级流程

### 方式一：手动执行升级脚本（推荐）

```bash
# 使用 Docker Compose
docker-compose exec app sh /app/scripts/upgrade.sh

# 使用 Docker
docker exec -it log-viewer sh /app/scripts/upgrade.sh
```

**升级脚本执行的操作**:
1. Git pull 最新代码
2. 安装依赖 (`pnpm install`)
3. 重新构建（如果是生产环境）
4. 重启应用（如果有 PM2）

**注意**: 如果没有 PM2，需要手动重启容器。

### 方式二：通过 API 升级

**前提**: 需要先登录获取 session cookie。

```bash
# 1. 登录获取 session cookie
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_password"}' \
  -c cookies.txt

# 2. 执行升级
curl -X POST http://localhost:3000/api/admin/upgrade \
  -b cookies.txt
```

**响应示例**:

```json
{
  "success": true,
  "message": "Upgrade started",
  "stdout": "...",
  "stderr": ""
}
```

### 方式三：Git Webhook 自动升级

**配置 GitHub Webhook**:

1. 仓库设置 → Webhooks → Add webhook
2. Payload URL: `http://your-server:3000/api/admin/upgrade`
3. Content type: `application/json`
4. Secret: 建议设置（需要在 API 中添加验证）
5. 选择事件: `Push events`

**注意**: 当前实现需要先登录并传递 session cookie。如需自动升级，建议添加 Webhook Secret 验证。

### 方式四：手动 Git Pull + 重启

```bash
# 1. 进入容器
docker-compose exec app sh

# 2. 在容器内执行
cd /app
git pull
pnpm install
pnpm build  # 如果是生产环境

# 3. 退出容器
exit

# 4. 重启容器
docker-compose restart app
```

### 升级后验证

```bash
# 检查容器状态
docker-compose ps

# 查看日志
docker-compose logs -f app

# 测试访问
curl http://localhost:3000/api/auth/status
```

### 升级失败回滚

```bash
# 1. 停止容器
docker-compose stop app

# 2. 回滚代码（在容器内或宿主机）
cd /app
git reset --hard HEAD~1

# 3. 重新启动
docker-compose start app
```

---

## 维护和监控

### 查看日志

```bash
# 实时日志（Docker Compose）
docker-compose logs -f app

# 最近 100 行日志
docker-compose logs --tail=100 app

# 查看特定时间的日志
docker-compose logs --since 1h app

# Docker 方式
docker logs -f log-viewer
docker logs --tail=100 log-viewer
```

### 检查容器状态

```bash
# Docker Compose
docker-compose ps
docker-compose top app

# Docker
docker ps | grep log-viewer
docker top log-viewer
docker stats log-viewer
```

### 备份

#### 备份配置文件

```bash
# 备份环境变量
cp .env.local .env.local.backup-$(date +%Y%m%d)

# 备份 Docker Compose 配置
cp docker-compose.yml docker-compose.yml.backup-$(date +%Y%m%d)

# 备份所有配置
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  .env.local \
  docker-compose.yml \
  Dockerfile
```

#### 备份日志目录

```bash
# 备份日志目录
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# 备份到远程（示例）
scp logs-backup-$(date +%Y%m%d).tar.gz user@remote:/backup/
```

### 定期维护

#### 清理 Docker 资源

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理所有未使用的资源
docker system prune -a

# 查看磁盘使用
docker system df
```

#### 更新依赖

```bash
# 进入容器
docker-compose exec app sh

# 更新依赖
cd /app
pnpm update

# 退出并重启
exit
docker-compose restart app
```

---

## 故障排除

### 容器无法启动

**症状**: `docker-compose up` 失败或容器立即退出

**检查步骤**:

1. **查看日志**:
   ```bash
   docker-compose logs app
   ```

2. **检查环境变量**:
   ```bash
   docker-compose config
   ```

3. **检查端口占用**:
   ```bash
   # Linux/macOS
   netstat -tuln | grep 3000
   lsof -i :3000
   
   # Windows
   netstat -ano | findstr :3000
   ```

4. **检查日志目录权限**:
   ```bash
   ls -la logs/
   chmod 755 logs/  # 如果需要
   ```

**解决方案**:
- 修改端口映射（如果端口被占用）
- 检查 `.env.local` 文件格式
- 确保日志目录存在且有正确的权限

### 无法访问应用

**症状**: 浏览器无法访问 `http://localhost:3000`

**检查步骤**:

1. **检查容器状态**:
   ```bash
   docker-compose ps
   ```

2. **检查端口映射**:
   ```bash
   docker-compose port app 3000
   ```

3. **检查防火墙**:
   ```bash
   # Linux
   sudo ufw status
   sudo iptables -L
   ```

4. **测试容器内访问**:
   ```bash
   docker-compose exec app wget -O- http://localhost:3000/api/auth/status
   ```

**解决方案**:
- 检查防火墙规则
- 确认端口映射正确
- 检查容器是否正常运行

### 无法访问日志文件

**症状**: 应用无法读取日志文件

**检查步骤**:

1. **检查挂载是否成功**:
   ```bash
   docker-compose exec app ls -la /app/logs
   ```

2. **检查文件权限**:
   ```bash
   ls -la logs/
   ```

3. **检查环境变量**:
   ```bash
   docker-compose exec app env | grep FILES_DIRECTORY
   ```

**解决方案**:
- 检查 `docker-compose.yml` 中的 volume 配置
- 确保日志目录存在
- 检查文件权限（容器内用户可能无法读取）

### 认证失败

**症状**: 无法登录或频繁要求登录

**检查步骤**:

1. **检查环境变量**:
   ```bash
   docker-compose exec app env | grep -E "(ACCESS_PASSWORD|SESSION_SECRET)"
   ```

2. **检查认证状态 API**:
   ```bash
   curl http://localhost:3000/api/auth/status
   ```

3. **查看应用日志**:
   ```bash
   docker-compose logs app | grep -i auth
   ```

**解决方案**:
- 检查 `ACCESS_PASSWORD` 是否正确
- 检查 `SESSION_SECRET` 是否设置
- 清除浏览器 cookie 重新登录
- 检查 `AUTH_ENABLED` 环境变量

### 升级失败

**症状**: 升级脚本执行失败

**检查步骤**:

1. **查看升级日志**:
   ```bash
   docker-compose exec app sh /app/scripts/upgrade.sh
   ```

2. **检查 Git 配置**:
   ```bash
   docker-compose exec app git --version
   docker-compose exec app git remote -v
   ```

3. **检查网络连接**（如果需要拉取远程代码）:
   ```bash
   docker-compose exec app ping github.com
   ```

4. **检查磁盘空间**:
   ```bash
   docker-compose exec app df -h
   ```

**解决方案**:
- 检查 Git 仓库配置
- 确保网络连接正常
- 清理磁盘空间
- 手动执行 Git pull 查看具体错误

### 性能问题

**症状**: 应用响应慢或占用资源高

**检查步骤**:

1. **查看资源使用**:
   ```bash
   docker stats log-viewer
   ```

2. **查看应用日志**:
   ```bash
   docker-compose logs app | grep -i error
   ```

3. **检查日志文件大小**:
   ```bash
   du -sh logs/
   find logs/ -type f -size +100M
   ```

**解决方案**:
- 限制容器资源（在 `docker-compose.yml` 中）
- 清理大型日志文件
- 检查是否有过多的文件监听

---

## 安全建议

### 密码安全

1. **使用强密码**:
   - 至少 16 位
   - 包含大小写字母、数字和特殊字符
   - 避免使用常见密码

2. **使用密码哈希**（推荐）:
   ```env
   PASSWORD_HASH=$2a$10$生成的哈希值
   ```
   不要同时设置 `ACCESS_PASSWORD` 和 `PASSWORD_HASH`。

3. **定期更换密码**:
   - 建议每 3-6 个月更换一次
   - 密码泄露后立即更换

### Session 安全

1. **使用随机 Session 密钥**:
   ```bash
   openssl rand -base64 32
   ```

2. **不要使用默认密钥**:
   - 默认的 `SESSION_SECRET` 不安全
   - 必须使用随机生成的密钥

3. **定期轮换 Session 密钥**:
   - 轮换后所有用户需要重新登录

### 网络安全

1. **使用 HTTPS**（如果可能）:
   - 虽然个人使用可以接受 HTTP
   - 生产环境建议使用 HTTPS
   - 可以使用反向代理（如 Nginx）配置 HTTPS

2. **限制访问**:
   - 使用防火墙限制访问 IP
   - 仅在必要时开放端口

3. **使用 VPN**（推荐）:
   - 如果服务器在公网，建议使用 VPN

### 文件系统安全

1. **只读挂载日志目录**:
   ```yaml
   volumes:
     - ./logs:/app/logs:ro
   ```

2. **限制文件访问**:
   - 应用已实现路径验证
   - 确保 `FILES_DIRECTORY` 配置正确

3. **定期备份**:
   - 备份配置文件
   - 备份重要日志

### Docker 安全

1. **使用非 root 用户**（已在 Dockerfile 中配置）

2. **限制容器资源**:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 1G
   ```

3. **定期更新镜像**:
   ```bash
   docker-compose pull
   docker-compose build --no-cache
   ```

4. **扫描镜像漏洞**:
   ```bash
   docker scout cves log-viewer
   ```

### 环境变量安全

1. **不要提交 `.env.local` 到 Git**:
   - 确保 `.gitignore` 包含 `.env.local`

2. **使用环境变量文件**:
   - 不要硬编码敏感信息
   - 使用 `.env.local` 或 Docker secrets

3. **限制文件权限**:
   ```bash
   chmod 600 .env.local
   ```

### 监控和审计

1. **启用日志**:
   - 定期查看应用日志
   - 监控异常访问

2. **设置告警**（如果可能）:
   - 容器异常退出
   - 资源使用过高
   - 认证失败次数过多

---

## 附录

### 常用命令速查

```bash
# 启动
docker-compose up -d

# 停止
docker-compose stop

# 重启
docker-compose restart app

# 查看日志
docker-compose logs -f app

# 进入容器
docker-compose exec app sh

# 升级
docker-compose exec app sh /app/scripts/upgrade.sh

# 备份配置
cp .env.local .env.local.backup-$(date +%Y%m%d)
```

### 配置文件示例

完整的 `.env.local` 示例请参考 `env.example` 文件。

### 相关文档

- [认证设置说明](./AUTH_SETUP.md)
- [Docker 部署说明](./DOCKER_SETUP.md)
- [可行性分析](./FEASIBILITY_ANALYSIS.md)

---

**最后更新**: 2024-01-01
