# 日志系统说明

## 概述

应用已集成完整的日志系统，包括：
- **Web 应用日志**：记录 API 请求、错误等
- **Next.js 日志**：记录 Next.js 框架日志
- **Docker 启动日志**：记录容器启动信息

## 日志文件

日志文件存储在 `logs/` 目录下：

| 文件 | 说明 | 内容 |
|------|------|------|
| `app.log` | 应用日志 | 所有级别的日志（info, warn, error, debug） |
| `error.log` | 错误日志 | 仅 error 级别的日志 |
| `docker.log` | Docker 日志 | 容器启动和运行日志 |

## 日志级别

- **error**: 错误信息
- **warn**: 警告信息
- **info**: 一般信息（默认生产环境）
- **debug**: 调试信息（开发环境）

通过环境变量 `LOG_LEVEL` 控制：

```env
LOG_LEVEL=debug  # 开发环境
LOG_LEVEL=info   # 生产环境（默认）
```

## 日志配置

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `LOG_DIR` | 日志目录 | `./logs` (开发) 或 `/app/logs` (Docker) |
| `LOG_LEVEL` | 日志级别 | `info` (生产) 或 `debug` (开发) |

### Docker 配置

在 `docker-compose.yml` 中已配置：

```yaml
volumes:
  - ./logs:/app/logs  # 挂载日志目录

environment:
  - LOG_DIR=/app/logs
  - LOG_LEVEL=info
```

## 日志内容

### Web 应用日志

**记录内容**：
- API 请求（方法、路径、状态码、响应时间、IP）
- 文件操作（读取、列表）
- 认证事件（登录成功/失败）
- 错误信息（包含堆栈）

**示例**：
```json
{
  "timestamp": "2024-01-01 12:00:00",
  "level": "info",
  "message": "API GET /api/files",
  "method": "GET",
  "path": "/api/files",
  "statusCode": 200,
  "duration": "45ms",
  "ip": "192.168.1.100"
}
```

### Next.js 日志

Next.js 框架的日志会自动记录到应用日志中。

### Docker 启动日志

**记录内容**：
- 容器启动时间
- 环境变量
- 配置信息
- 启动状态

**示例**：
```
2024-01-01T12:00:00.000Z [DOCKER] Container starting...
Node Version: v20.10.0
NODE_ENV: production
PORT: 3000
FILES_DIRECTORY: /app/files
```

## 查看日志

### 实时查看

```bash
# 查看应用日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log

# 查看 Docker 日志
tail -f logs/docker.log

# 查看所有日志
tail -f logs/*.log
```

### Docker 容器日志

```bash
# 查看容器标准输出日志
docker-compose logs -f app

# 查看最近 100 行
docker-compose logs --tail=100 app

# 查看特定时间的日志
docker-compose logs --since 1h app
```

### 日志文件位置

**开发环境**：
```
项目目录/logs/
├── app.log
├── error.log
└── docker.log
```

**Docker 环境**：
```
容器内: /app/logs/
宿主机: ./logs/ (通过 volume 挂载)
```

## 日志轮转

日志文件会自动轮转：
- **最大文件大小**: 10MB
- **保留文件数**: 5 个（app.log, error.log）
- **保留文件数**: 3 个（docker.log）

当日志文件达到 10MB 时，会自动创建新文件：
- `app.log` → `app.log.1` → `app.log.2` → ...

## 使用示例

### 在代码中使用日志

```typescript
import { logger } from '@/lib/logger';

// 记录信息
logger.info('User logged in', { userId: '123' });

// 记录警告
logger.warn('Rate limit approaching', { remaining: 10 });

// 记录错误
logger.error('Database connection failed', { error: err.message });

// 记录调试信息
logger.debug('Processing request', { requestId: 'abc123' });
```

### API 路由中使用

```typescript
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // 业务逻辑
    logger.info('API request processed', { path: request.url });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('API error', { 
      error: error.message,
      stack: error.stack 
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## 日志格式

### JSON 格式（文件）

```json
{
  "timestamp": "2024-01-01 12:00:00",
  "level": "info",
  "message": "API GET /api/files",
  "service": "log-viewer",
  "method": "GET",
  "path": "/api/files",
  "statusCode": 200,
  "duration": "45ms"
}
```

### 控制台格式（开发环境）

```
2024-01-01 12:00:00 [info]: API GET /api/files {"method":"GET","path":"/api/files","statusCode":200}
```

## 已集成的日志点

### API 路由
- ✅ `/api/files` - 文件列表请求
- ✅ `/api/file-content` - 文件内容读取
- ✅ `/api/auth/login` - 登录请求
- ✅ `/api/admin/upgrade` - 升级操作

### 中间件
- ✅ 认证中间件 - 所有请求的认证状态

### Docker
- ✅ 容器启动日志
- ✅ 环境变量记录

## 故障排除

### 日志文件未创建

1. **检查目录权限**：
   ```bash
   ls -la logs/
   chmod 755 logs/
   ```

2. **检查环境变量**：
   ```bash
   docker-compose exec app env | grep LOG_DIR
   ```

3. **检查挂载**：
   ```bash
   docker-compose exec app ls -la /app/logs
   ```

### 日志文件过大

日志会自动轮转，但可以手动清理：

```bash
# 清理旧日志（保留最近 7 天）
find logs/ -name "*.log.*" -mtime +7 -delete
```

### 日志级别不正确

检查环境变量：

```bash
# 查看当前日志级别
docker-compose exec app env | grep LOG_LEVEL

# 修改日志级别
# 在 .env.local 或 docker-compose.yml 中设置
LOG_LEVEL=debug
```

## 最佳实践

1. **生产环境使用 info 级别**：减少日志量，提高性能
2. **开发环境使用 debug 级别**：获取详细信息
3. **定期清理旧日志**：避免磁盘空间不足
4. **监控错误日志**：及时发现和解决问题
5. **不要记录敏感信息**：密码、token 等不应出现在日志中

## 日志安全

⚠️ **注意**：
- 日志文件可能包含敏感信息
- 确保日志目录权限正确
- 不要将日志文件提交到 Git
- 定期备份重要日志

## 相关文件

- `lib/logger.ts` - 日志工具模块
- `lib/nextjs-logger.ts` - Next.js 日志工具
- `scripts/docker-entrypoint.sh` - Docker 启动脚本
- `logs/` - 日志目录
