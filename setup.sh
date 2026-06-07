#!/bin/bash

echo "正在安装依赖..."
npm install
cd server && npm install
cd ../client && npm install
cd ..

echo ""
echo "依赖安装完成！"
echo ""
echo "启动方式："
echo "  开发模式: npm run dev"
echo "  仅后端:   npm run dev:server"
echo "  仅前端:   npm run dev:client"
echo ""
echo "访问地址："
echo "  前端: http://localhost:5173"
echo "  后端: http://localhost:3001"
echo ""
