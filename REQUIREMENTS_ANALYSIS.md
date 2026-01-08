# 需求分析与实现方案

## 需求概述

1. **需求3**：浏览 web server 端的本地路径，类似一个 tree panel 的东西，但需要限制路径不能超出某个 root path，即 sanitize 一下路径，防止 path escape 查看到其他文件
2. **需求4**：把项目做成 Dockerfile，最终会用 docker 来挂载一个 log 文件的路径来跑这个前端 app
3. **需求5**：加个密码认证（因为会看到 server side 的 log）。要么在前端实现，要么用 docker compose 弄个 nginx 在 nginx 那层靠 .htpasswd 做个简单的 http basic auth

## 需求3和4的合并方案分析

### 当前实现状态

✅ **已有功能：**
- 文件树组件（`FileTree.tsx`）已存在，可以显示目录结构
- 路径验证机制（`validatePath`）已实现，但存在安全漏洞
- 支持通过 `FILES_DIRECTORY` 环境变量配置根目录

⚠️ **存在的问题：**

1. **路径验证漏洞**（`app/api/files/route.ts` 和 `app/api/file-content/route.ts`）：
   ```typescript
   // 当前代码第19-27行存在问题
   if (isAbsolute) {
     const requestedPath = resolve(userPath);
     // ❌ 没有检查绝对路径是否在 BASE_PATH 内！
     return requestedPath;
   }
   ```
   这允许用户通过绝对路径访问容器内的任何文件，即使不在挂载目录内。

2. **目录浏览功能不完整**：
   - 当前只显示包含 `.txt` 文件的目录
   - 空目录不会显示
   - 无法浏览到子目录

### 合并方案设计

**核心思路：** 使用 Docker 的 `-v` 挂载机制，将挂载点作为应用的可访问根路径，容器外的文件无法访问。

#### 1. Docker 挂载配置

```dockerfile
# Dockerfile 中设置工作目录
WORKDIR /app

# 通过环境变量设置挂载点
ENV FILES_DIRECTORY=/app/logs
```

```bash
# docker run 时挂载
docker run -v /host/path/to/logs:/app/logs my-app
```

#### 2. 路径验证改进

**改进策略：**
- 移除对绝对路径的特殊处理
- 所有路径（相对和绝对）都必须解析后严格限制在 `BASE_PATH` 内
- 使用 `path.resolve()` 规范化路径，然后检查是否以 `BASE_PATH` 开头
- 处理 Windows 和 Linux 路径差异

**改进后的 `validatePath` 函数：**
```typescript
function validatePath(userPath: string): string | null {
  // 1. 检查路径遍历攻击
  if (userPath.includes('..') || userPath.includes('~')) {
    return null;
  }
  
  // 2. 规范化路径（处理相对路径和绝对路径）
  let requestedPath: string;
  if (path.isAbsolute(userPath)) {
    requestedPath = path.resolve(userPath);
  } else {
    requestedPath = path.resolve(BASE_PATH, userPath);
  }
  
  // 3. 规范化 BASE_PATH（确保路径比较的一致性）
  const normalizedBase = path.resolve(BASE_PATH);
  const normalizedRequested = path.resolve(requestedPath);
  
  // 4. 严格检查：请求路径必须在 BASE_PATH 内
  // 使用 path.relative 检查，如果不在子目录内会返回包含 '..' 的路径
  const relative = path.relative(normalizedBase, normalizedRequested);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null; // 路径在 BASE_PATH 外
  }
  
  return normalizedRequested;
}
```

#### 3. 目录浏览功能增强

**需要改进的地方：**
- API 需要支持返回目录结构（不仅仅是文件）
- 前端需要支持点击目录展开子目录
- 支持显示空目录

**API 改进：**
```typescript
// 修改 /api/files 返回目录和文件
{
  "directories": [...],
  "files": [...],
  "currentPath": "/app/logs",
  "parentPath": null
}
```

### 实现步骤

1. ✅ 修复路径验证漏洞
2. ✅ 增强目录浏览 API
3. ✅ 更新前端文件树组件支持目录导航
4. ✅ 创建 Dockerfile
5. ✅ 创建 docker-compose.yml（可选，用于本地测试）

---

## 需求5：密码认证方案分析

### 方案A：前端实现认证

#### 实现方式
- 在 Next.js 中添加一个认证中间件或页面
- 使用 session/cookie 或 JWT token
- 在访问 viewer 页面前检查认证状态

#### 优点
- ✅ 实现简单，不需要额外的服务
- ✅ 可以自定义 UI，用户体验好
- ✅ 可以集成到现有的 Next.js 应用中

#### 缺点
- ❌ **安全性较低**：前端代码可被查看，认证逻辑暴露
- ❌ **容易被绕过**：用户可以直接访问 API 端点，绕过前端认证
- ❌ **需要额外的状态管理**：session/cookie 管理
- ❌ **不适合生产环境**：对于敏感日志文件，安全性不足

#### 适用场景
- 开发/测试环境
- 内部网络，信任度高的环境
- 对安全性要求不高的场景

---

### 方案B：Nginx HTTP Basic Auth（推荐）

#### 实现方式
- 使用 Docker Compose 部署 Nginx 作为反向代理
- Nginx 配置 HTTP Basic Authentication
- 使用 `.htpasswd` 文件存储用户名和密码（加密后的）

#### 架构
```
用户请求 → Nginx (Basic Auth) → Next.js App → 文件系统
```

#### 优点
- ✅ **安全性高**：认证在 Nginx 层，无法绕过
- ✅ **标准方案**：HTTP Basic Auth 是 Web 标准
- ✅ **简单可靠**：Nginx 的 Basic Auth 实现成熟稳定
- ✅ **性能好**：Nginx 处理认证，减轻应用负担
- ✅ **易于管理**：`.htpasswd` 文件易于创建和更新
- ✅ **适合生产环境**：企业级应用常用方案

#### 缺点
- ⚠️ 需要额外的 Nginx 容器（但这是标准做法）
- ⚠️ 需要配置 Docker Compose（但配置简单）
- ⚠️ UI 是浏览器原生的 Basic Auth 弹窗（不够美观，但安全）

#### 实现步骤

1. **创建 `.htpasswd` 文件**：
   ```bash
   # 使用 htpasswd 工具（Apache 工具，或使用在线工具）
   htpasswd -c .htpasswd username
   # 或使用 openssl
   echo "username:$(openssl passwd -apr1 'password')" > .htpasswd
   ```

2. **Nginx 配置**：
   ```nginx
   server {
       listen 80;
       server_name _;
       
       # Basic Auth
       auth_basic "Restricted Access";
       auth_basic_user_file /etc/nginx/.htpasswd;
       
       location / {
           proxy_pass http://nextjs-app:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Docker Compose 配置**：
   ```yaml
   services:
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
       volumes:
         - ./nginx.conf:/etc/nginx/conf.d/default.conf
         - ./.htpasswd:/etc/nginx/.htpasswd:ro
       depends_on:
         - app
     
     app:
       build: .
       environment:
         - FILES_DIRECTORY=/app/logs
       volumes:
         - /host/path/to/logs:/app/logs:ro
   ```

---

### 方案C：混合方案（可选）

如果既想要安全性，又想要更好的用户体验：

- **Nginx Basic Auth**：作为第一层防护（必须）
- **前端认证页面**：作为第二层，提供更好的 UI 和用户体验

---

## 推荐方案

### 对于需求3和4：
✅ **合并实现**：使用 Docker 挂载目录作为根路径，改进路径验证确保安全

### 对于需求5：
✅ **推荐方案B（Nginx Basic Auth）**

**理由：**
1. 查看服务器日志是敏感操作，需要高安全性
2. Nginx Basic Auth 是业界标准，成熟可靠
3. 实现简单，维护成本低
4. 适合生产环境使用

**如果用户更注重用户体验**，可以考虑方案C（混合方案），但建议至少要有 Nginx Basic Auth 作为基础防护。

---

## 实施优先级

1. **高优先级**：需求3+4（路径安全 + Docker）
2. **高优先级**：需求5（Nginx Basic Auth）
3. **中优先级**：目录浏览功能增强
4. **低优先级**：前端认证 UI（如果采用混合方案）
