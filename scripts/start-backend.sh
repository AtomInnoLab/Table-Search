#!/bin/bash
# 启动后端开发服务器

cd "$(dirname "$0")/.."

echo "🚀 启动 Dynamic Literature Matrix 后端..."

# 检查虚拟环境
if [ ! -d "backend/venv" ]; then
    echo "创建Python虚拟环境..."
    cd backend
    python3 -m venv venv
    cd ..
fi

# 激活虚拟环境并安装依赖
echo "安装依赖..."
cd backend
source venv/bin/activate
pip install -q -r requirements.txt

# 启动服务
echo "启动FastAPI服务器..."
echo "API文档: http://localhost:8000/docs"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
