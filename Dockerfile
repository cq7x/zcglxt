# 多阶段构建：整合前端和后端
FROM node:18-slim AS builder

# 设置工作目录
WORKDIR /app

# 安装根目录依赖
COPY package*.json ./
RUN npm ci

# 1. 构建后端
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# 2. 构建前端
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# 3. 生产阶段：使用 Nginx + Node.js
FROM node:18-slim AS runner

# 安装 Nginx
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制后端构建产物
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/src ./server/src

# 复制前端构建产物
COPY --from=builder /app/client/dist /usr/share/nginx/html

# 创建数据和上传目录
RUN mkdir -p /app/server/data /app/server/uploads

# 安装后端生产依赖
WORKDIR /app/server
RUN npm ci --only=production

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 复制启动脚本
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# 暴露端口
EXPOSE 80

# 启动命令
CMD ["/app/start.sh"]
