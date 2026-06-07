# 资产管理系统 (zcglxt)

一个功能完整的资产管理系统，支持资产追踪、二维码管理、导入导出等功能。

## 功能特性

- 📋 资产列表管理
- ➕ 添加和编辑资产
- 📷 二维码扫描
- 🖨️ 标签打印
- 📤 数据导入导出 (Excel/CSV)
- 📊 部门管理
- ⚙️ 参数设置

## 技术栈

### 后端
- Node.js + Express
- SQLite 数据库
- TypeScript

### 前端
- React + TypeScript
- Vite 构建工具
- Tailwind CSS

## 快速开始

### ⚠️ 国内服务器配置（重要）

如果您的服务器在中国大陆，建议先配置 Docker 和 npm 的镜像源以加速下载：

#### 1. 配置 Docker 镜像源
```bash
# 创建 Docker 配置目录
sudo mkdir -p /etc/docker

# 复制镜像源配置
sudo cp daemon.json /etc/docker/daemon.json

# 重启 Docker 服务
sudo systemctl restart docker

# 验证配置
sudo docker info | grep -A 5 "Registry Mirrors"
```

#### 2. Git 拉取加速（可选）
```bash
# 使用 GitHub 镜像加速克隆
git clone https://ghproxy.com/https://github.com/cq7x/zcglxt.git

# 或使用代理
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy https://127.0.0.1:7890
```

### 方式一：Docker 部署（推荐）

#### 1. 克隆项目
```bash
git clone https://github.com/cq7x/zcglxt.git
cd zcglxt
```

#### 2. 构建并启动 Docker 容器
```bash
docker-compose up -d --build
```

#### 3. 访问应用
- 应用访问：http://localhost:13081/

#### 4. 查看日志
```bash
# 查看服务日志
docker-compose logs -f app
```

#### 5. 停止服务
```bash
docker-compose down

# 停止并删除数据卷（清空数据）
docker-compose down -v
```

---

### 方式二：本地开发

#### 安装依赖

```bash
npm run install:all
```

#### 开发模式

```bash
npm run dev
```

#### 单独启动服务

**启动后端 (端口 3001):**
```bash
npm run dev:server
```

**启动前端 (端口 5177):**
```bash
npm run dev:client
```

#### 构建

```bash
npm run build
```

#### 生产环境

```bash
npm run start
```

## 默认登录账号

- 用户名: `admin`
- 密码: `admin123`

## Docker 说明

### Docker 相关文件
- `Dockerfile` - 整合前后端的 Docker 镜像
- `nginx.conf` - Nginx 反向代理配置
- `start.sh` - 启动脚本
- `docker-compose.yml` - Docker Compose 配置
- `daemon.json` - Docker 镜像源配置（国内加速）
- `.npmrc` - npm 镜像源配置（淘宝镜像）

### 架构说明
- 单个 Docker 容器运行
- Nginx 提供前端静态文件服务
- Nginx 反向代理 `/api/` 到后端 Node.js 服务
- Node.js 后端监听 localhost:3001

### 数据持久化
- 数据库：Docker Volume `app-data`
- 上传文件：Docker Volume `app-uploads`

### 网络端口
- 应用访问：13081

## 项目结构

```
zcglxt/
├── client/          # 前端项目
│   └── .npmrc       # 前端 npm 镜像源配置
├── server/          # 后端项目
│   └── .npmrc       # 后端 npm 镜像源配置
├── Dockerfile       # 整合 Dockerfile
├── nginx.conf       # Nginx 配置
├── start.sh         # 启动脚本
├── docker-compose.yml
├── daemon.json      # Docker 镜像源配置
├── .npmrc           # 根目录 npm 镜像源配置
├── .gitignore
├── .dockerignore
├── package.json     # 根 package.json
└── README.md
```

## License

MIT
