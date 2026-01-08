# Nginx Basic Auth 详细说明

## 什么是 Nginx Basic Auth？

Nginx Basic Auth（HTTP Basic Authentication）是一种基于**用户名和密码**的简单身份验证机制。它是 HTTP 协议的标准认证方式，由浏览器原生支持。

## 验证机制

### 1. 基于用户名和密码

✅ **是的，就是密码验证！**

- 用户需要提供**用户名**和**密码**
- 密码存储在服务器上的 `.htpasswd` 文件中
- 密码经过加密（不是明文存储）

### 2. 密码存储方式

密码存储在 `.htpasswd` 文件中，格式如下：

```
username1:$apr1$salt$encrypted_password1
username2:$apr1$salt$encrypted_password2
```

**密码加密方式：**
- 使用 `apr1`（Apache MD5 变体）加密
- 或使用 `crypt()` 函数加密
- **不是明文存储**，即使文件泄露，也无法直接看到原始密码

### 3. 创建密码文件

**方法1：使用 `htpasswd` 工具（推荐）**

```bash
# 安装 htpasswd（Apache 工具）
# Ubuntu/Debian:
sudo apt-get install apache2-utils

# macOS:
brew install httpd

# 创建新文件并添加用户
htpasswd -c .htpasswd username
# 会提示输入密码

# 添加更多用户（不加 -c）
htpasswd .htpasswd another_user
```

**方法2：使用 `openssl`**

```bash
# 生成密码哈希
openssl passwd -apr1
# 输入密码后会生成哈希值，然后手动添加到 .htpasswd 文件

# 或一行命令创建
echo "username:$(openssl passwd -apr1 'your_password')" > .htpasswd
```

**方法3：在线工具**

- 访问 https://hostingcanada.org/htpasswd-generator/
- 输入用户名和密码
- 复制生成的哈希值到 `.htpasswd` 文件

---

## 用户如何访问？

### 访问流程

1. **用户在浏览器输入网址**
   ```
   http://your-server-ip/
   ```

2. **浏览器自动弹出登录对话框**
   - 这是**浏览器原生弹窗**，不是网页的一部分
   - 显示 "Authentication required" 或 "需要身份验证"
   - 要求输入用户名和密码

3. **用户输入凭据**
   - 输入用户名
   - 输入密码
   - 点击"确定"或"登录"

4. **浏览器发送认证信息**
   - 浏览器将用户名和密码用 Base64 编码
   - 添加到 HTTP 请求头的 `Authorization` 字段：
     ```
     Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
     ```
   - 注意：Base64 只是编码，**不是加密**，可以轻易解码

5. **Nginx 验证凭据**
   - Nginx 解码 Authorization 头
   - 从 `.htpasswd` 文件中查找用户名
   - 比较密码哈希值
   - 如果匹配，允许访问；否则返回 401，要求重新输入

6. **访问成功**
   - 浏览器会**记住**用户名和密码（在本次会话中）
   - 后续请求自动带上认证信息
   - 用户无需重复输入

### 浏览器界面示例

**Chrome/Edge:**
```
┌─────────────────────────────────────┐
│  Sign in                            │
├─────────────────────────────────────┤
│  The server http://your-server      │
│  requires a username and password.  │
│                                     │
│  Username: [________________]       │
│  Password: [________________]       │
│                                     │
│  [Cancel]  [Sign in]                │
└─────────────────────────────────────┘
```

**Firefox:**
```
┌─────────────────────────────────────┐
│  Authentication Required            │
├─────────────────────────────────────┤
│  A username and password are being  │
│  requested by http://your-server    │
│                                     │
│  Username: [________________]       │
│  Password: [________________]       │
│                                     │
│  [Cancel]  [Log in]                 │
└─────────────────────────────────────┘
```

---

## 实际使用示例

### 场景：用户访问日志查看器

1. **用户打开浏览器，输入：**
   ```
   http://192.168.1.100/
   ```

2. **浏览器弹出登录框：**
   - 用户看到 "Authentication required"
   - 输入用户名：`admin`
   - 输入密码：`mypassword123`
   - 点击"登录"

3. **如果密码正确：**
   - 浏览器显示你的 Next.js 应用
   - 可以正常浏览日志文件
   - 在本次浏览器会话中，无需再次输入密码

4. **如果密码错误：**
   - 浏览器再次弹出登录框
   - 提示 "Invalid username or password"（某些浏览器）
   - 需要重新输入

5. **关闭浏览器后：**
   - 下次访问需要重新输入密码
   - 或者浏览器可能记住密码（取决于浏览器设置）

---

## 安全性说明

### ⚠️ 重要安全提示

1. **必须使用 HTTPS**
   - Basic Auth 使用 Base64 编码传输密码，**不是加密**
   - 在 HTTP 下，密码可以被中间人攻击者轻易获取
   - **生产环境必须配置 HTTPS**

2. **密码文件权限**
   ```bash
   # 设置正确的文件权限
   chmod 600 .htpasswd  # 只有所有者可读写
   chown nginx:nginx .htpasswd  # 确保 Nginx 可以读取
   ```

3. **定期更换密码**
   - 建议定期更换密码
   - 如果怀疑泄露，立即更换

---

## 完整配置示例

### 1. 创建 `.htpasswd` 文件

```bash
# 创建密码文件
htpasswd -c .htpasswd admin
# 输入密码：mypassword123

# 查看文件内容（密码已加密）
cat .htpasswd
# admin:$apr1$salt$encrypted_hash
```

### 2. Nginx 配置

```nginx
server {
    listen 80;
    server_name _;

    # 启用 Basic Auth
    auth_basic "Restricted Access - Log Viewer";
    auth_basic_user_file /etc/nginx/.htpasswd;

    # 代理到 Next.js 应用
    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Docker Compose 配置

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"  # HTTPS（如果配置了 SSL）
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./.htpasswd:/etc/nginx/.htpasswd:ro
      # - ./ssl:/etc/nginx/ssl:ro  # SSL 证书（如果使用 HTTPS）
    depends_on:
      - app
    restart: unless-stopped

  app:
    build: .
    environment:
      - FILES_DIRECTORY=/app/logs
      - ENABLE_LOCAL_FS=true
      - NODE_ENV=production
    volumes:
      - /host/path/to/logs:/app/logs:ro  # 挂载日志目录
    restart: unless-stopped
```

### 4. 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 访问应用
# 浏览器打开 http://localhost
# 会弹出登录框，输入用户名和密码
```

---

## 常见问题

### Q1: 用户如何知道用户名和密码？

**A:** 管理员需要提前告知用户：
- 通过邮件、文档、或安全渠道分发
- 建议首次登录后要求用户修改密码（需要额外实现）

### Q2: 可以自定义登录界面吗？

**A:** Basic Auth 使用浏览器原生弹窗，**无法自定义样式**。如果需要自定义 UI，需要：
- 使用方案C（混合方案）
- 或实现自定义认证页面（但 Basic Auth 仍然作为第一层防护）

### Q3: 密码可以包含特殊字符吗？

**A:** 可以，但某些特殊字符在 URL 中可能需要编码。建议使用字母、数字和常见符号。

### Q4: 如何添加/删除用户？

**A:** 
```bash
# 添加用户
htpasswd .htpasswd new_user

# 删除用户（手动编辑文件，删除对应行）
# 或使用 sed
sed -i '/^username:/d' .htpasswd

# 修改密码
htpasswd .htpasswd existing_user
```

### Q5: 如何测试 Basic Auth？

**A:** 使用 curl：
```bash
# 测试（会提示输入密码）
curl -u username:password http://localhost/

# 或直接提供凭据
curl http://username:password@localhost/
```

---

## 总结

- ✅ **验证方式**：基于用户名和密码
- ✅ **密码存储**：加密存储在 `.htpasswd` 文件
- ✅ **用户访问**：浏览器自动弹出登录框
- ✅ **使用简单**：配置简单，浏览器原生支持
- ⚠️ **安全要求**：生产环境必须使用 HTTPS

Basic Auth 虽然简单，但对于日志查看器这种应用场景，是一个很好的安全防护方案！
