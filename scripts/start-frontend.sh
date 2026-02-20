#!/bin/bash
# 启动前端开发服务器

cd "$(dirname "$0")/../frontend"

echo "🚀 启动 Dynamic Literature Matrix 前端..."

# 检查node_modules
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

# 启动开发服务器
echo "启动Next.js开发服务器..."
echo "访问: http://localhost:3000"
npm run dev
