#!/bin/bash

# 创建必要的目录
mkdir -p /app/server/data /app/server/uploads

# 启动后端服务
cd /app/server
echo "Starting backend server..."
node dist/index.js &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动 Nginx
echo "Starting Nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!

# 等待任一进程退出
wait -n $BACKEND_PID $NGINX_PID

# 如果任一进程退出，停止所有进程
kill $BACKEND_PID $NGINX_PID 2>/dev/null
wait
