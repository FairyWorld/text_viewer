# Text Viewer

## 启动

### 使用 Docker

挂载一个 `files` 目录

#### 1. 准备文件目录

```bash
mkdir files
# 将你要查看的文件放入 files 目录
```

#### 2. 启动容器

**使用 docker-compose：**

启动：

```bash
docker-compose up -d
```

**使用 docker run：**

```bash
docker build -t text-viewer .

docker run -d \
  --name text-viewer \
  -p 3200:3200 \
  -p 3100:3100 \
  -v ./files:/web_files:ro \
  -e ACCESS_PASSWORD=666666 \
  -e SESSION_SECRET=f379eaf3c831b04de153469d1bec345e \
  -e NODE_ENV=production \
  -e ENABLE_LOCAL_FS=true \
  --restart unless-stopped \
  text-viewer
```

#### 3. 域名

- **生产环境**：`http://localhost:3200`
- **开发环境**：`http://localhost:3100`

## 升级

```bash
# 使用 docker
docker exec text-viewer sh -l -c "upgrade"

# 使用 docker-compose
docker-compose exec app sh -l -c "upgrade"
```
