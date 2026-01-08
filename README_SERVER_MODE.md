# 服务端模式（Node.js）使用说明

## 概述

服务端模式允许应用通过 Next.js API Routes 直接访问服务器本地文件系统，无需浏览器授权或手动选择文件。此模式支持实时文件更新和目录监听。

## 安全说明

⚠️ **重要**：服务端模式默认**禁用**，仅应在本地开发环境或受信任的环境中启用。在生产环境中启用可能导致安全风险。

## 配置

### 1. 创建 `.env.local` 文件

在项目根目录创建 `.env.local` 文件（可参考 `.env.local.example`）：

```env
# 启用本地文件系统访问（服务端模式）
ENABLE_LOCAL_FS=true

# 文件目录路径（相对于项目根目录）
FILES_DIRECTORY=./files

# Node.js 环境
NODE_ENV=development
```

### 2. 配置说明

- **`ENABLE_LOCAL_FS`**：
  - `true`：启用服务端模式
  - `false`：禁用（默认，生产环境建议禁用）
  - 仅在本地开发环境或受信任的环境中设置为 `true`

- **`FILES_DIRECTORY`**：
  - 默认值：`./files`
  - 服务端模式将从此目录读取文件
  - 路径相对于项目根目录

- **`NODE_ENV`**：
  - `development`：开发环境
  - `production`：生产环境（默认禁用服务端模式）

## 环境检测机制

应用通过以下方式检测是否允许使用服务端模式：

1. **环境变量检测**（最高优先级）：
   - `ENABLE_LOCAL_FS=true`：明确启用
   - `ENABLE_LOCAL_FS=false`：明确禁用

2. **环境模式检测**：
   - `NODE_ENV=development`：开发环境（加分）
   - `NODE_ENV=production`：生产环境（减分，默认禁用）

3. **主机名检测**：
   - `localhost` 或 `127.0.0.1`：本地环境（加分）
   - 包含 `local` 或 `DESKTOP-`：可能是本地环境（加分）
   - 其他：可能是远程环境（减分）

4. **请求来源检测**（运行时）：
   - Host header 包含 `localhost` 或 `127.0.0.1`：本地访问（加分）
   - Host header 是私有 IP（如 `192.168.x.x`）：内网访问（部分加分）
   - 其他：可能是远程访问（减分）

### 综合判断规则

- **高可信度启用**：`ENABLE_LOCAL_FS=true` 或 `ENABLE_LOCAL_FS=false`（显式配置）
- **中可信度启用**：开发环境 + localhost 主机名 + localhost 请求来源
- **低可信度启用**：开发环境 + 本地特征（但可能不安全）
- **默认禁用**：生产环境或远程访问（除非显式启用）

## 功能特性

### 1. 文件列表加载

服务端模式自动从配置的目录加载所有文本文件，无需手动选择。

### 2. 实时文件更新

- **文件内容更新**：当文件内容变化时，预览面板自动更新
- **文件列表更新**：当文件添加或删除时，文件列表自动更新

### 3. 目录监听

使用 Node.js `fs.watch` API 和 Server-Sent Events (SSE) 实现实时监听：
- 文件内容变化
- 文件添加/删除
- 子目录变化

## API Routes

### `/api/files/status`

检测服务端模式是否可用。

**请求**：`GET /api/files/status`

**响应**：
```json
{
  "available": true,
  "confidence": "high",
  "environment": "development",
  "hostname": "localhost",
  "enableLocalFS": "true",
  "filesDirectory": "./files",
  "reasons": ["Explicitly enabled by ENABLE_LOCAL_FS=true"],
  "message": "Server mode is available"
}
```

### `/api/files`

获取文件列表。

**请求**：`GET /api/files?path=<directory>`

**响应**：
```json
{
  "files": [
    {
      "name": "file.txt",
      "path": "file.txt",
      "fullPath": "/path/to/file.txt",
      "size": 1024,
      "mtime": "2024-01-01T00:00:00.000Z"
    }
  ],
  "directory": "./files"
}
```

### `/api/file-content`

读取文件内容。

**请求**：`GET /api/file-content?path=<file_path>`

**响应**：
```json
{
  "content": "file content...",
  "size": 1024,
  "mtime": "2024-01-01T00:00:00.000Z",
  "path": "file.txt"
}
```

### `/api/file-watch`

监听文件变化（Server-Sent Events）。

**请求**：`GET /api/file-watch?path=<file_path>`

**响应**：SSE 流
```
data: {"type":"connected","message":"Watching file for changes","path":"file.txt"}

data: {"type":"update","content":"new content...","mtime":"2024-01-01T00:00:00.000Z","timestamp":"2024-01-01T00:00:00.000Z"}
```

### `/api/directory-watch`

监听目录变化（Server-Sent Events）。

**请求**：`GET /api/directory-watch?path=<directory>`

**响应**：SSE 流
```
data: {"type":"connected","message":"Watching directory for changes","path":"./files"}

data: {"type":"directory-change","files":[...],"changedFile":"file.txt","eventType":"change","timestamp":"2024-01-01T00:00:00.000Z"}
```

## 使用步骤

1. **配置环境变量**：
   ```bash
   cp .env.local.example .env.local
   # 编辑 .env.local，设置 ENABLE_LOCAL_FS=true
   ```

2. **启动开发服务器**：
   ```bash
   pnpm dev
   ```

3. **访问应用**：
   ```
   http://localhost:3000/viewer
   ```

4. **切换到服务端模式**：
   - 点击模式切换按钮，选择"服务端"模式
   - 如果服务端模式可用，文件列表将自动加载

## 注意事项

1. **安全性**：
   - 仅在生产环境禁用服务端模式（默认）
   - 如果必须在生产环境启用，请确保：
     - 应用运行在受信任的环境中
     - 已配置适当的访问控制
     - 已限制文件目录访问范围

2. **路径安全**：
   - API Routes 会验证所有路径，防止路径遍历攻击
   - 文件访问被限制在 `FILES_DIRECTORY` 配置的目录内

3. **实时更新**：
   - 文件监听使用 `fs.watch`，在某些系统上可能不够稳定
   - 建议在文件保存后稍等片刻再查看更新

4. **性能**：
   - 大量文件可能影响性能
   - 建议仅在需要实时更新的场景使用服务端模式

## 故障排除

### 服务端模式不可用

1. 检查 `.env.local` 是否存在且配置正确
2. 确保 `ENABLE_LOCAL_FS=true`
3. 检查 `NODE_ENV` 是否为 `development`
4. 检查是否从 `localhost` 访问

### 文件列表为空

1. 检查 `FILES_DIRECTORY` 配置是否正确
2. 确保目录存在且包含文本文件
3. 检查文件扩展名是否在支持的列表中

### 实时更新不工作

1. 检查浏览器控制台是否有错误
2. 确认 SSE 连接已建立（查看 Network 标签）
3. 检查文件监听是否正常工作（查看服务器日志）

## 与其他模式对比

| 特性 | FSA 模式 | 传统模式 | 服务端模式 |
|------|----------|----------|------------|
| 浏览器授权 | ✅ 需要 | ❌ 不需要 | ❌ 不需要 |
| 手动选择文件 | ✅ 需要 | ✅ 需要 | ❌ 不需要 |
| 实时更新 | ✅ 支持 | ❌ 不支持 | ✅ 支持 |
| 目录监听 | ✅ 支持 | ❌ 不支持 | ✅ 支持 |
| 跨浏览器支持 | ⚠️ 部分 | ✅ 全部 | ✅ 全部 |
| 生产环境 | ✅ 安全 | ✅ 安全 | ⚠️ 需谨慎 |

## 技术实现

- **文件系统访问**：Node.js `fs` 模块
- **实时监听**：`fs.watch` API
- **实时通信**：Server-Sent Events (SSE)
- **路径验证**：防止路径遍历攻击
- **环境检测**：多重检测机制确保安全
