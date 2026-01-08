# Docker Compose 使用指南

## docker-compose up -d 的行为说明

### 每次启动是否一样？

**答案：基本一样，但有细节需要注意**

`docker-compose up -d` 的行为取决于容器的状态：

1. **容器已存在且配置未变化**：
   - 如果容器已停止，会启动现有容器
   - **保持一致**，使用相同的容器和配置

2. **配置发生变化**：
   - 如果 `docker-compose.yml` 或 `.env.local` 有变化
   - 会**重新创建**容器（需要先 `docker-compose down` 或使用 `--force-recreate`）

3. **容器不存在**：
   - 会创建新容器
   - 使用 `container_name` 确保名称一致

### 确保一致性

使用 `container_name` 可以确保每次使用相同的容器名称：

```yaml
services:
  app:
    container_name: log-viewer  # 固定容器名称
```

**好处**：
- 容器名称固定，便于管理
- 脚本中可以引用固定名称
- 不会产生多个同名容器

### 常用命令对比

| 命令 | 行为 | 何时使用 |
|------|------|----------|
| `docker-compose up -d` | 启动或创建容器 | 首次启动或容器停止后 |
| `docker-compose start` | 启动已存在的容器 | 容器已存在且只是停止 |
| `docker-compose stop` | 停止容器（保留） | 临时停止 |
| `docker-compose restart` | 重启容器 | 配置变更后重启 |
| `docker-compose down` | 停止并删除容器 | 完全清理 |
| `docker-compose up -d --force-recreate` | 强制重新创建 | 配置变更后 |

---

## 自动重启策略

### 重启策略说明

Docker Compose 支持以下重启策略：

| 策略 | 说明 | 使用场景 |
|------|------|----------|
| `no` | 不自动重启（默认） | 开发测试 |
| `always` | 总是重启 | 生产环境（推荐） |
| `on-failure` | 失败时重启 | 临时任务 |
| `unless-stopped` | 除非手动停止，否则总是重启 | **推荐用于生产** |

### 当前配置

当前使用 `restart: unless-stopped`，这是**推荐的生产环境配置**：

```yaml
restart: unless-stopped
```

**行为**：
- ✅ 容器异常退出时自动重启
- ✅ 系统重启后自动启动
- ✅ 手动停止（`docker stop`）后不会自动启动
- ✅ 手动启动（`docker start`）后会保持运行

### 其他重启策略示例

**1. always（总是重启）**：

```yaml
restart: always
```

**行为**：
- ✅ 容器异常退出时自动重启
- ✅ 系统重启后自动启动
- ⚠️ 手动停止后也会自动启动（可能不是期望的）

**2. on-failure（失败时重启）**：

```yaml
restart: on-failure
# 或指定最大重启次数
restart: on-failure:5
```

**行为**：
- ✅ 容器异常退出时自动重启（最多 5 次）
- ❌ 系统重启后不会自动启动
- ❌ 正常停止不会重启

### 系统级自动启动

**Docker 服务自动启动**：

确保 Docker 服务在系统启动时自动启动：

```bash
# Linux (systemd)
sudo systemctl enable docker

# 检查状态
sudo systemctl status docker
```

**Docker Compose 自动启动**（可选）：

可以使用 systemd 服务文件，在系统启动时自动启动容器：

创建 `/etc/systemd/system/log-viewer.service`:

```ini
[Unit]
Description=Log Viewer Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/your/project
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl enable log-viewer.service
sudo systemctl start log-viewer.service
```

---

## 健康检查（可选）

### 添加健康检查

在 `docker-compose.yml` 中添加：

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/auth/status"]
  interval: 30s      # 每 30 秒检查一次
  timeout: 10s       # 超时时间 10 秒
  retries: 3         # 失败 3 次后标记为不健康
  start_period: 40s  # 启动后 40 秒开始检查
```

**注意**：需要确保容器内有 `wget` 或 `curl` 工具。

**使用 curl（如果容器有 curl）**：

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/auth/status"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### 查看健康状态

```bash
# 查看健康状态
docker inspect --format='{{.State.Health.Status}}' log-viewer

# 查看详细健康检查日志
docker inspect --format='{{json .State.Health}}' log-viewer | jq
```

---

## 资源限制（可选）

### 添加资源限制

在 `docker-compose.yml` 中添加：

```yaml
deploy:
  resources:
    limits:
      cpus: '2'      # 最大 CPU（2 核心）
      memory: 1G     # 最大内存（1GB）
    reservations:
      cpus: '0.5'    # 预留 CPU（0.5 核心）
      memory: 512M   # 预留内存（512MB）
```

**注意**：`deploy` 需要 Compose 文件格式 3.x 且使用 Docker Swarm，或使用 `docker-compose` v1.29+。

**替代方案**（使用 `ulimits`）：

```yaml
ulimits:
  nofile:
    soft: 65536
    hard: 65536
```

---

## 完整配置示例

### 推荐的生产配置

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: log-viewer
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - ./logs:/app/logs:ro
      - /app/node_modules
    environment:
      - ACCESS_PASSWORD=${ACCESS_PASSWORD}
      - SESSION_SECRET=${SESSION_SECRET}
      - FILES_DIRECTORY=/app/logs
      - ENABLE_LOCAL_FS=true
      - NODE_ENV=production
    restart: unless-stopped
    # 健康检查（可选）
    # healthcheck:
    #   test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/auth/status"]
    #   interval: 30s
    #   timeout: 10s
    #   retries: 3
    #   start_period: 40s
```

### 启用健康检查的完整配置

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: log-viewer
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - ./logs:/app/logs:ro
      - /app/node_modules
    environment:
      - ACCESS_PASSWORD=${ACCESS_PASSWORD}
      - SESSION_SECRET=${SESSION_SECRET}
      - FILES_DIRECTORY=/app/logs
      - ENABLE_LOCAL_FS=true
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/auth/status"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

**注意**：需要确保 Dockerfile 中安装了 `wget` 或使用 `curl`。

---

## 最佳实践

### 1. 使用固定容器名称

```yaml
container_name: log-viewer
```

### 2. 使用 unless-stopped 重启策略

```yaml
restart: unless-stopped
```

### 3. 使用环境变量文件

```yaml
env_file:
  - .env.local
```

或使用 `environment` 部分（当前配置方式）。

### 4. 只读挂载日志目录

```yaml
volumes:
  - ./logs:/app/logs:ro
```

### 5. 排除 node_modules

```yaml
volumes:
  - /app/node_modules
```

---

## 常见问题

### Q: 修改配置后如何生效？

**A**: 

```bash
# 方式1：重新创建容器
docker-compose down
docker-compose up -d

# 方式2：强制重新创建
docker-compose up -d --force-recreate

# 方式3：只重启（配置未变化时）
docker-compose restart
```

### Q: 如何确保容器在系统重启后自动启动？

**A**: 

1. 使用 `restart: unless-stopped`（已配置）
2. 确保 Docker 服务自动启动：
   ```bash
   sudo systemctl enable docker
   ```

### Q: 如何查看容器重启历史？

**A**: 

```bash
# 查看容器详细信息
docker inspect log-viewer | grep -i restart

# 查看重启次数
docker inspect --format='{{.RestartCount}}' log-viewer
```

### Q: 手动停止后如何再次启动？

**A**: 

```bash
# 方式1：使用 docker-compose
docker-compose start

# 方式2：使用 docker
docker start log-viewer

# 方式3：使用 docker-compose up（推荐）
docker-compose up -d
```

---

## 总结

1. **每次启动基本一样**：使用 `container_name` 确保容器名称固定
2. **自动重启已配置**：`restart: unless-stopped` 是最佳实践
3. **系统重启后自动启动**：需要确保 Docker 服务启用
4. **配置变更需要重新创建**：使用 `docker-compose down` 然后 `up -d`
