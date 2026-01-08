# 需求可行性分析

## 需求1：本地部署 - Docker 端口和路径映射

### 需求描述
- 本地部署，个人访问
- 没有 HTTPS（个人使用场景）
- Docker 部署
- 需要检查端口和路径映射
- 挂载路径作为访问根路径，上一级无法访问
- 端口映射，本地访问（宿主 IP / 127.0.0.1 / localhost）
- 是否有 Web API 限制

### 可行性分析

#### ✅ **完全可行**

**1. 端口映射**
```bash
# Docker 端口映射示例
docker run -p 3000:3000 my-app
# 或指定特定端口
docker run -p 8080:3000 my-app
```

**访问方式：**
- `http://localhost:3000` ✅
- `http://127.0.0.1:3000` ✅
- `http://192.168.1.100:3000`（宿主 IP）✅
- 所有方式都可以访问，没有限制

**2. 路径挂载和根路径限制**
```bash
# 挂载日志目录
docker run -v /host/path/to/logs:/app/logs:ro my-app

# 环境变量设置根路径
docker run -e FILES_DIRECTORY=/app/logs -v /host/path/to/logs:/app/logs:ro my-app
```

**安全机制：**
- ✅ 挂载点 `/app/logs` 作为根路径
- ✅ 通过 `validatePath` 函数严格限制，无法访问上一级
- ⚠️ **需要修复当前代码的路径验证漏洞**（绝对路径处理问题）

**3. Web API 限制**

**Next.js API Routes 限制：**
- ✅ 没有特殊端口限制
- ✅ 支持 HTTP（不需要 HTTPS）
- ✅ 可以绑定到任意端口
- ✅ 可以通过环境变量配置

**注意事项：**
- Next.js 默认监听 `0.0.0.0:3000`（所有网络接口）
- 容器内访问：`localhost:3000` 或 `127.0.0.1:3000`
- 容器外访问：`宿主IP:3000` 或 `localhost:3000`（如果端口映射）

**4. 路径安全验证**

**当前问题：**
```typescript
// 当前代码存在问题（app/api/files/route.ts 第19-27行）
if (isAbsolute) {
  const requestedPath = resolve(userPath);
  return requestedPath; // ❌ 没有检查是否在 BASE_PATH 内
}
```

**需要改进：**
- 所有路径（包括绝对路径）必须严格限制在 `BASE_PATH` 内
- 使用 `path.relative()` 检查路径是否在允许范围内

---

## 需求2：Web 项目内部密码验证

### 需求描述
- 密码验证在 Web 项目内部实现（不是 Nginx Basic Auth）
- 通过代码配置密码

### 可行性分析

#### ✅ **完全可行**

**实现方案：**

**1. Next.js Middleware 认证**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 检查认证状态
  const session = request.cookies.get('auth-session');
  if (!session || !isValidSession(session.value)) {
    // 重定向到登录页
    if (!request.nextUrl.pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/viewer/:path*', '/api/:path*'],
};
```

**2. 登录页面和 API**
```typescript
// app/login/page.tsx - 登录页面
// app/api/auth/login/route.ts - 登录 API
// app/api/auth/logout/route.ts - 登出 API
```

**3. Session 管理**
- 使用加密的 Cookie 存储 session
- 或使用 JWT token
- 使用 `next-auth` 库（可选，更专业）

**4. 密码存储和验证**

**配置方式：**
```typescript
// config/auth.ts
export const AUTH_CONFIG = {
  password: process.env.ACCESS_PASSWORD || 'default_password',
  // 或从配置文件读取
};
```

**密码加密：**
- 使用 `bcrypt` 加密存储密码哈希
- 验证时比较哈希值

**安全措施：**
- ✅ 密码使用 bcrypt 加密
- ✅ Session 使用 HttpOnly Cookie（防止 XSS）
- ✅ 添加登录失败次数限制（防止暴力破解）
- ✅ Session 过期时间
- ⚠️ 没有 HTTPS 时，Cookie 可能被中间人攻击（个人使用可接受）

**实现复杂度：**
- 中等：需要实现登录页面、API、中间件
- 预计代码量：~300-500 行

---

## 需求3：简单升级方案

### 需求描述
- 希望项目可以简单升级
- 两种方案：
  - **方案A：镜像升级** - 删除实例 -> 更新镜像 -> 重启（不够方便）
  - **方案B：内部升级** - 容器提供环境，自动 git pull -> 重启/打包
  - 最好能 hook 自动或 exec 执行升级

### 可行性分析

#### ✅ **两种方案都可行，推荐方案B（内部升级）**

### 方案A：镜像升级

**流程：**
```bash
# 1. 停止并删除容器
docker stop my-app
docker rm my-app

# 2. 拉取新镜像
docker pull my-app:latest

# 3. 重新启动
docker run -d --name my-app -p 3000:3000 -v /path:/app/logs my-app:latest
```

**优点：**
- ✅ 简单直接
- ✅ 环境隔离好
- ✅ 回滚容易（使用旧镜像）

**缺点：**
- ❌ 需要手动操作
- ❌ 需要重新配置挂载和端口
- ❌ 可能丢失容器内的临时数据

**改进方案（使用 docker-compose）：**
```bash
# 升级命令
docker-compose pull
docker-compose up -d
```
这样会更简单，但用户觉得不够方便。

---

### 方案B：内部升级（推荐）

**架构设计：**

**1. 容器内 Git 仓库**
```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app

# 安装 git
RUN apk add --no-cache git

# 克隆代码（或挂载代码目录）
# 方式1：构建时克隆
# RUN git clone https://github.com/user/repo.git /app

# 方式2：运行时挂载（推荐）
# 通过 docker run -v 挂载代码目录
```

**2. 升级脚本**
```bash
#!/bin/bash
# scripts/upgrade.sh

cd /app

# 拉取最新代码
git pull origin main

# 安装依赖（如果有变化）
npm install

# 重新构建（如果需要）
npm run build

# 重启应用（使用 PM2 或类似工具）
pm2 restart app
# 或
pkill -f "next start" && npm start &
```

**3. 升级触发方式**

**方式1：手动 exec 执行**
```bash
# 用户手动执行
docker exec -it my-app /app/scripts/upgrade.sh
```

**方式2：Web Hook 自动升级**
```typescript
// app/api/webhook/upgrade/route.ts
export async function POST(request: NextRequest) {
  // 验证 webhook secret
  const secret = request.headers.get('x-webhook-secret');
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 执行升级脚本
  const { exec } = require('child_process');
  exec('/app/scripts/upgrade.sh', (error, stdout, stderr) => {
    // 处理结果
  });

  return NextResponse.json({ message: 'Upgrade started' });
}
```

**方式3：定时检查升级**
```typescript
// 在应用启动时启动后台任务
setInterval(async () => {
  const hasUpdate = await checkGitUpdates();
  if (hasUpdate) {
    await executeUpgrade();
  }
}, 3600000); // 每小时检查一次
```

**方式4：管理界面升级按钮**
```typescript
// app/admin/upgrade/page.tsx
// 提供升级按钮，点击后执行升级脚本
```

**4. 使用 PM2 管理进程**
```json
// ecosystem.config.js
{
  "apps": [{
    "name": "log-viewer",
    "script": "npm",
    "args": "start",
    "instances": 1,
    "autorestart": true
  }]
}
```

**优点：**
- ✅ 升级简单：一条命令或点击按钮
- ✅ 可以自动化（webhook）
- ✅ 不需要重新构建镜像
- ✅ 代码更新快

**缺点：**
- ⚠️ 需要容器内有 git 和代码
- ⚠️ 需要处理依赖更新
- ⚠️ 需要进程管理工具（PM2）

**推荐实现：**
1. 容器挂载代码目录：`-v /host/code:/app`
2. 使用 PM2 管理进程
3. 提供 Web API 触发升级：`POST /api/admin/upgrade`
4. 可选：GitHub Webhook 自动升级

---

## 需求4：配置文件密码 + 加密安全

### 需求描述
- 代码中有 config 配置密码
- 作为访问密码
- 需要加密和其他安全措施

### 可行性分析

#### ✅ **完全可行**

**实现方案：**

**1. 配置文件结构**
```typescript
// config/auth.ts
export const authConfig = {
  // 方式1：环境变量（推荐）
  password: process.env.ACCESS_PASSWORD || 'default_password',
  
  // 方式2：配置文件（不推荐，密码会暴露在代码中）
  // password: 'my_password',
  
  // 安全配置
  sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',
  sessionMaxAge: 24 * 60 * 60 * 1000, // 24小时
  maxLoginAttempts: 5, // 最大登录尝试次数
  lockoutDuration: 15 * 60 * 1000, // 锁定15分钟
};
```

**2. 密码加密存储**
```typescript
// utils/auth.ts
import bcrypt from 'bcryptjs';

// 生成密码哈希（初始化时使用）
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// 验证密码
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}
```

**3. 初始化密码**
```typescript
// scripts/init-password.ts
// 首次运行时生成密码哈希
const password = process.env.ACCESS_PASSWORD || 'default_password';
const hashed = await hashPassword(password);
// 保存到环境变量或配置文件
```

**4. 安全措施**

**a. 密码加密**
- ✅ 使用 bcrypt 加密（不可逆）
- ✅ 密码哈希存储在环境变量或配置文件中

**b. Session 安全**
- ✅ 使用 HttpOnly Cookie（防止 XSS）
- ✅ 使用 Secure Cookie（HTTPS 时，但你没有 HTTPS，可跳过）
- ✅ Session 过期时间
- ✅ Session 签名（防止篡改）

**c. 防暴力破解**
- ✅ 登录失败次数限制
- ✅ IP 锁定机制
- ✅ 验证码（可选，如果失败次数过多）

**d. 其他安全**
- ✅ 密码不在代码中硬编码
- ✅ 使用环境变量存储敏感信息
- ✅ 日志不记录密码
- ✅ API 请求频率限制

**5. 配置文件示例**

**.env.local:**
```env
# 访问密码（明文，用于验证）
ACCESS_PASSWORD=my_secure_password_123

# Session 密钥（用于签名）
SESSION_SECRET=your-random-secret-key-here

# 文件目录
FILES_DIRECTORY=/app/logs

# 启用本地文件系统访问
ENABLE_LOCAL_FS=true
```

**config/auth.ts:**
```typescript
import bcrypt from 'bcryptjs';

// 密码哈希（通过脚本生成后存储）
const PASSWORD_HASH = process.env.PASSWORD_HASH || 
  await bcrypt.hash(process.env.ACCESS_PASSWORD || 'default', 10);

export const authConfig = {
  passwordHash: PASSWORD_HASH,
  sessionSecret: process.env.SESSION_SECRET!,
  // ... 其他配置
};
```

---

## 综合方案设计

### 推荐架构

```
┌─────────────────────────────────────────┐
│  Docker Container                       │
│  ┌───────────────────────────────────┐  │
│  │  Next.js App                      │  │
│  │  - 认证中间件                      │  │
│  │  - 登录页面                        │  │
│  │  - 文件查看器                      │  │
│  │  - 升级 API                        │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Git Repository (/app)             │  │
│  │  - 代码目录（挂载）                │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Logs Directory (/app/logs)        │  │
│  │  - 挂载的日志目录                  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 部署流程

**1. 首次部署**
```bash
# 1. 构建镜像（基础环境）
docker build -t log-viewer:base .

# 2. 运行容器（挂载代码和日志）
docker run -d \
  --name log-viewer \
  -p 3000:3000 \
  -v /host/code:/app \
  -v /host/logs:/app/logs:ro \
  -e ACCESS_PASSWORD=my_password \
  -e SESSION_SECRET=random_secret \
  log-viewer:base

# 3. 容器内安装依赖并启动
docker exec -it log-viewer npm install
docker exec -it log-viewer npm run build
docker exec -it log-viewer npm start
```

**2. 日常升级**
```bash
# 方式1：手动执行
docker exec -it log-viewer /app/scripts/upgrade.sh

# 方式2：Web API
curl -X POST http://localhost:3000/api/admin/upgrade \
  -H "Authorization: Bearer <token>"

# 方式3：GitHub Webhook（自动）
# 配置 GitHub Webhook 指向 http://your-server/api/webhook/upgrade
```

**3. 访问应用**
```
http://localhost:3000
→ 自动跳转到登录页
→ 输入密码
→ 访问文件查看器
```

---

## 技术栈建议

### 需要添加的依赖

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",        // 密码加密
    "@types/bcryptjs": "^2.4.6", // TypeScript 类型
    "jsonwebtoken": "^9.0.2",    // JWT（可选，用于 token）
    "cookie": "^0.6.0"           // Cookie 处理
  }
}
```

### 文件结构

```
app/
├── login/
│   └── page.tsx              # 登录页面
├── api/
│   ├── auth/
│   │   ├── login/route.ts   # 登录 API
│   │   └── logout/route.ts  # 登出 API
│   └── admin/
│       └── upgrade/route.ts # 升级 API
├── middleware.ts             # 认证中间件
config/
├── auth.ts                   # 认证配置
scripts/
├── upgrade.sh                # 升级脚本
└── init-password.ts          # 初始化密码脚本
```

---

## 风险评估

### 安全风险

1. **没有 HTTPS**
   - ⚠️ 密码和 session 可能被中间人攻击
   - ✅ 个人使用场景可接受
   - 💡 建议：如果可能，使用自签名证书或 Let's Encrypt

2. **密码存储在环境变量**
   - ✅ 比硬编码安全
   - ⚠️ 如果容器被入侵，环境变量可能泄露
   - 💡 建议：使用 Docker secrets（如果支持）

3. **路径遍历攻击**
   - ⚠️ 当前代码存在漏洞
   - ✅ 需要修复路径验证函数

### 功能风险

1. **升级失败处理**
   - ⚠️ 升级脚本失败可能导致应用不可用
   - 💡 建议：添加回滚机制

2. **Git 依赖**
   - ⚠️ 容器内需要 git
   - ⚠️ 需要网络访问 GitHub
   - 💡 建议：提供离线升级方案

---

## 总结

### ✅ 所有需求都可行

1. **Docker 部署**：✅ 完全可行，端口和路径映射无问题
2. **Web 内部认证**：✅ 完全可行，使用 Next.js Middleware + 登录页面
3. **内部升级**：✅ 完全可行，推荐方案B（Git + 升级脚本）
4. **配置密码加密**：✅ 完全可行，使用 bcrypt + 环境变量

### 推荐实现顺序

1. **第一阶段**：修复路径验证 + Docker 配置
2. **第二阶段**：实现 Web 认证系统
3. **第三阶段**：实现升级机制
4. **第四阶段**：完善安全措施

### 预计工作量

- 路径安全修复：1-2 小时
- Docker 配置：2-3 小时
- 认证系统：4-6 小时
- 升级机制：3-4 小时
- 测试和优化：2-3 小时

**总计：约 12-18 小时**
