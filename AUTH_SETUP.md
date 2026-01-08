# 认证系统设置说明

## 快速开始

### 1. 创建环境变量文件

复制示例文件并编辑：

```bash
cp .env.local.example .env.local
```

### 2. 配置密码

编辑 `.env.local` 文件，设置访问密码：

```env
ACCESS_PASSWORD=your_secure_password_123
```

### 3. 生成 Session 密钥（推荐）

使用以下命令生成随机密钥：

```bash
# Linux/macOS
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

将生成的密钥设置到 `.env.local`：

```env
SESSION_SECRET=生成的随机字符串
```

### 4. 可选：使用密码哈希（更安全）

**推荐方式：** 使用密码哈希而不是明文密码

生成密码哈希：

```bash
# 使用 Node.js
node -e "const bcrypt=require('bcryptjs');bcrypt.hash('your_password',10).then(h=>console.log('PASSWORD_HASH='+h))"
```

将生成的哈希值设置到 `.env.local`：

```env
PASSWORD_HASH=$2a$10$生成的哈希值
```

**注意：** 如果设置了 `PASSWORD_HASH`，`ACCESS_PASSWORD` 将被忽略。

## 功能特性

### ✅ 已实现的功能

1. **登录页面** (`/login`)
   - 美观的登录界面
   - 密码输入
   - 错误提示

2. **认证中间件**
   - 自动保护所有路由（除了登录页）
   - API 路由自动验证
   - 未认证用户自动重定向到登录页

3. **Session 管理**
   - HttpOnly Cookie（防止 XSS）
   - Session 过期时间（默认 24 小时）
   - Session 签名验证

4. **安全措施**
   - 密码使用 bcrypt 加密
   - 登录失败次数限制（5 次）
   - IP 锁定机制（15 分钟）
   - 防暴力破解

5. **登出功能**
   - Viewer 页面右上角登出按钮
   - 清除 session cookie

## 使用方式

### 访问应用

1. 启动开发服务器：
   ```bash
   pnpm dev
   ```

2. 访问应用：
   ```
   http://localhost:3000
   ```

3. 自动重定向到登录页：
   ```
   http://localhost:3000/login
   ```

4. 输入密码登录

5. 登录成功后，可以访问 `/viewer` 查看日志文件

### 登出

- 点击 Viewer 页面右上角的"登出"按钮
- 或访问 `/api/auth/logout`

## 配置选项

### 环境变量

| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| `ACCESS_PASSWORD` | 访问密码 | 是 | `default_password` |
| `SESSION_SECRET` | Session 密钥 | 是 | `change-me-in-production...` |
| `PASSWORD_HASH` | 密码哈希（推荐） | 否 | - |
| `AUTH_ENABLED` | 是否启用认证 | 否 | `true` |
| `FILES_DIRECTORY` | 文件目录 | 否 | `./files` |
| `ENABLE_LOCAL_FS` | 启用本地文件系统 | 否 | - |

### 配置文件

认证配置在 `config/auth.ts` 中，可以修改：

- `sessionMaxAge`: Session 过期时间（默认 24 小时）
- `maxLoginAttempts`: 最大登录尝试次数（默认 5 次）
- `lockoutDuration`: 锁定持续时间（默认 15 分钟）

## 安全建议

1. **生产环境必须设置强密码**
   ```env
   ACCESS_PASSWORD=强密码至少16位包含大小写数字特殊字符
   ```

2. **使用密码哈希**
   - 不要将明文密码存储在环境变量中
   - 使用 `PASSWORD_HASH` 存储加密后的密码

3. **使用随机 Session 密钥**
   ```bash
   openssl rand -base64 32
   ```

4. **定期更换密码**
   - 建议每 3-6 个月更换一次密码

5. **HTTPS（如果可能）**
   - 虽然个人使用可以接受 HTTP
   - 但如果有条件，建议使用 HTTPS

## 禁用认证

如果需要临时禁用认证（仅用于开发/测试）：

```env
AUTH_ENABLED=false
```

**警告：** 禁用认证后，任何人都可以访问你的日志文件！

## 故障排除

### 无法登录

1. 检查 `.env.local` 文件是否存在
2. 检查 `ACCESS_PASSWORD` 是否正确设置
3. 检查密码是否匹配
4. 查看浏览器控制台和服务器日志

### Session 过期太快

修改 `config/auth.ts` 中的 `sessionMaxAge` 值。

### 登录后立即被登出

1. 检查 `SESSION_SECRET` 是否设置
2. 检查 Cookie 是否被浏览器阻止
3. 检查中间件配置

## API 端点

### `POST /api/auth/login`
登录接口

**请求：**
```json
{
  "password": "your_password"
}
```

**响应：**
```json
{
  "success": true,
  "message": "Login successful"
}
```

### `POST /api/auth/logout`
登出接口

### `GET /api/auth/status`
检查认证状态

**响应：**
```json
{
  "authenticated": true
}
```

## 下一步

- [ ] 实现路径安全修复（防止路径遍历）
- [ ] 创建 Dockerfile
- [ ] 实现升级机制
