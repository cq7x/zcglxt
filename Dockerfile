FROM node:20-alpine3.19

# 设置 npm 镜像源
RUN npm config set registry https://registry.npmmirror.com

# 设置 Alpine 国内镜像源（阿里云）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 设置 node-gyp 镜像源（淘宝镜像）
ENV NODE_GYP_MIRROR=https://npmmirror.com/mirrors/node

# 安装 Nginx、构建工具和 bash
RUN apk add --no-cache \
    nginx \
    python3 \
    make \
    g++ \
    bash

WORKDIR /app

# 复制所有文件
COPY . .

# 1. 安装后端依赖并构建
WORKDIR /app/server
RUN npm ci
RUN npm run build

# 2. 安装前端依赖并构建
WORKDIR /app/client
RUN npm ci
RUN npm run build

# 3. 创建 Nginx 目录并复制前端构建产物
RUN mkdir -p /usr/share/nginx/html
RUN rm -rf /usr/share/nginx/html/*
RUN cp -r /app/client/dist/* /usr/share/nginx/html/

# 4. 复制 Nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 5. 创建必要目录
RUN mkdir -p /app/server/data /app/server/uploads

# 6. 设置启动脚本权限
RUN chmod +x /app/start.sh

# 暴露端口
EXPOSE 80

# 启动命令
CMD ["/app/start.sh"]
