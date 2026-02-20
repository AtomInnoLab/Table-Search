# 快速开始指南
## Dynamic Literature Matrix - Getting Started

本指南将帮助你快速搭建开发环境并运行项目。

---

## 前置要求

### 必需
- **Node.js**: >= 18.0.0
- **Python**: >= 3.11
- **Docker**: >= 20.10 (用于本地数据库)
- **Git**: 最新版本

### 推荐
- **pnpm**: 用于前端依赖管理（比npm快3倍）
- **pyenv**: Python版本管理
- **VSCode**: 推荐IDE（配置见下文）

---

## 项目结构搭建

### Step 1: 初始化项目

```bash
# 克隆仓库（如果已有）或创建新目录
cd /home/ecs-user/workspace/table-search

# 创建目录结构
mkdir -p frontend backend docs scripts
```

### Step 2: 初始化前端项目

```bash
cd frontend

# 使用Next.js CLI创建项目
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

# 安装核心依赖
pnpm add @tanstack/react-table zustand swr
pnpm add react-pdf pdfjs-dist
pnpm add @anthropic-ai/sdk  # 如果前端需要直接调用

# 安装开发依赖
pnpm add -D @types/react-pdf
```

**package.json 关键配置**:
```json
{
  "name": "dynamic-literature-matrix",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "@tanstack/react-table": "^8.11.0",
    "zustand": "^4.5.0",
    "swr": "^2.2.0",
    "react-pdf": "^7.7.0"
  }
}
```

### Step 3: 初始化后端项目

```bash
cd ../backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

# 创建requirements.txt
cat > requirements.txt << EOF
# Web框架
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.0
pydantic-settings==2.1.0

# LLM相关
anthropic==0.18.0
langchain==0.1.0
langchain-anthropic==0.1.0

# 数据库
sqlalchemy==2.0.25
asyncpg==0.29.0
alembic==1.13.0

# 缓存与任务队列
redis==5.0.1
celery==5.3.6

# PDF处理
PyMuPDF==1.23.0

# 工具库
python-dotenv==1.0.0
httpx==0.26.0
tenacity==8.2.3  # 重试机制
EOF

# 安装依赖
pip install -r requirements.txt

# 开发依赖
pip install pytest pytest-asyncio black ruff mypy
```

### Step 4: 配置Docker Compose

在项目根目录创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # PostgreSQL数据库
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: dlm_user
      POSTGRES_PASSWORD: dlm_pass_dev
      POSTGRES_DB: literature_matrix
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dlm_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # MinIO (本地S3替代)
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

**启动服务**:
```bash
docker-compose up -d

# 验证服务状态
docker-compose ps
```

---

## 环境配置

### 后端环境变量

创建 `backend/.env`:

```bash
# 数据库
DATABASE_URL=postgresql+asyncpg://dlm_user:dlm_pass_dev@localhost:5432/literature_matrix

# Redis
REDIS_URL=redis://localhost:6379/0

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-...  # 替换为你的Key

# PDF存储（本地开发使用MinIO）
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=pdfs

# Semantic Scholar API（无需Key，但有速率限制）
SEMANTIC_SCHOLAR_API_URL=https://api.semanticscholar.org/graph/v1

# 应用配置
APP_ENV=development
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
```

### 前端环境变量

创建 `frontend/.env.local`:

```bash
# API地址
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# 环境
NEXT_PUBLIC_ENV=development
```

---

## 数据库初始化

### 创建Migration

```bash
cd backend

# 初始化Alembic
alembic init alembic

# 编辑 alembic.ini
# sqlalchemy.url = postgresql+asyncpg://...

# 创建初始migration
alembic revision --autogenerate -m "Initial schema"

# 应用migration
alembic upgrade head
```

### 创建初始Schema（手动）

如果不用Alembic，直接执行SQL:

```bash
psql -U dlm_user -d literature_matrix -f scripts/schema.sql
```

`scripts/schema.sql`:
```sql
-- (之前TECHNICAL_DESIGN.md中的Schema)
```

---

## 运行项目

### 启动后端

```bash
cd backend

# 激活虚拟环境
source venv/bin/activate

# 启动FastAPI（开发模式，自动重载）
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 启动Celery Worker（另一个终端）
celery -A app.celery_app worker --loglevel=info
```

访问 http://localhost:8000/docs 查看API文档（自动生成）。

### 启动前端

```bash
cd frontend

# 开发模式
pnpm dev
```

访问 http://localhost:3000 查看应用。

---

## 开发工作流

### 典型开发流程

1. **后端开发**:
   ```bash
   # 1. 创建新API路由
   # backend/app/api/routes/new_feature.py

   # 2. 创建Service
   # backend/app/services/new_service.py

   # 3. 测试
   pytest tests/test_new_feature.py

   # 4. 代码格式化
   black app/ tests/
   ruff check app/
   ```

2. **前端开发**:
   ```bash
   # 1. 创建新组件
   # frontend/components/NewComponent.tsx

   # 2. 添加状态管理
   # frontend/stores/useNewStore.ts

   # 3. 类型检查
   pnpm type-check

   # 4. Lint
   pnpm lint
   ```

### Git工作流

```bash
# 创建功能分支
git checkout -b feature/add-column-management

# 提交代码
git add .
git commit -m "feat: add column management API"

# 推送并创建PR
git push origin feature/add-column-management
```

**Commit Message规范** (Conventional Commits):
- `feat:` 新功能
- `fix:` Bug修复
- `docs:` 文档更新
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具配置

---

## 常用命令

### 数据库操作

```bash
# 连接数据库
docker-compose exec postgres psql -U dlm_user -d literature_matrix

# 备份数据库
docker-compose exec postgres pg_dump -U dlm_user literature_matrix > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U dlm_user literature_matrix < backup.sql

# 查看表
\dt

# 清空所有表
TRUNCATE sessions, papers, columns, cells CASCADE;
```

### Redis操作

```bash
# 连接Redis
docker-compose exec redis redis-cli

# 查看所有Key
KEYS *

# 清空缓存
FLUSHDB

# 查看特定Key
GET session:abc-123:meta
```

### Docker操作

```bash
# 查看日志
docker-compose logs -f postgres

# 重启服务
docker-compose restart redis

# 完全清理（删除数据）
docker-compose down -v
```

---

## VSCode配置

### 推荐扩展

创建 `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-python.python",
    "ms-python.vscode-pylance",
    "charliermarsh.ruff",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

### 工作区设置

`.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "python.linting.enabled": true,
  "python.linting.ruffEnabled": true,
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

---

## 调试配置

### 后端调试

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "app.main:app",
        "--reload",
        "--port",
        "8000"
      ],
      "cwd": "${workspaceFolder}/backend",
      "envFile": "${workspaceFolder}/backend/.env"
    }
  ]
}
```

### 前端调试

在浏览器中使用React DevTools + Redux DevTools（Zustand兼容）。

---

## 测试

### 后端测试

```bash
cd backend

# 运行所有测试
pytest

# 运行特定文件
pytest tests/test_extraction.py

# 查看覆盖率
pytest --cov=app tests/

# 只运行标记的测试
pytest -m "integration"
```

示例测试文件 `tests/test_extraction.py`:

```python
import pytest
from app.services.info_extractor import extract_info

@pytest.mark.asyncio
async def test_extract_simple_info():
    result = await extract_info(
        paper_id="test_paper",
        column_prompt="What is the model architecture?",
        paper_text="We use a Transformer-based model..."
    )

    assert result.value is not None
    assert "Transformer" in result.value
    assert result.evidence is not None
```

### 前端测试

```bash
cd frontend

# 安装测试依赖
pnpm add -D @testing-library/react @testing-library/jest-dom vitest

# 运行测试
pnpm test
```

---

## 故障排查

### 问题：数据库连接失败

```bash
# 检查Docker容器状态
docker-compose ps

# 检查PostgreSQL日志
docker-compose logs postgres

# 确认端口未被占用
lsof -i :5432
```

### 问题：API调用返回500

```bash
# 查看FastAPI日志
# 终端输出会显示详细错误栈

# 或查看日志文件（如果配置了）
tail -f backend/logs/app.log
```

### 问题：Celery任务不执行

```bash
# 检查Celery Worker状态
celery -A app.celery_app inspect active

# 查看队列中的任务
celery -A app.celery_app inspect reserved

# 清空队列
celery -A app.celery_app purge
```

### 问题：前端Hot Reload不工作

```bash
# 删除.next缓存
rm -rf .next

# 重启开发服务器
pnpm dev
```

---

## 性能优化建议

### 开发阶段

1. **使用热重载**: FastAPI和Next.js都支持，修改代码即时生效
2. **Mock外部API**: 开发时使用Mock数据，避免频繁调用Anthropic API
3. **减少日志级别**: 开发时设置 `LOG_LEVEL=DEBUG`，生产时用 `INFO`

### Mock Anthropic API

创建 `backend/app/mocks/claude_mock.py`:

```python
class MockClaudeClient:
    async def messages.create(self, **kwargs):
        # 返回预定义的响应
        return MockResponse(
            content=[{"text": '{"value": "Transformer", "evidence": {...}}'}]
        )

# 在配置中启用
if settings.USE_MOCK_LLM:
    claude_client = MockClaudeClient()
else:
    claude_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
```

---

## 下一步

完成环境搭建后，建议按以下顺序开发：

1. **Phase 1**: 基础搜索功能
   - [ ] Semantic Scholar API集成
   - [ ] 搜索结果展示（列表）
   - [ ] 固定列渲染

2. **Phase 2**: 信息提取
   - [ ] Claude API集成
   - [ ] 意图分析实现
   - [ ] 单元格提取逻辑

3. **Phase 3**: 动态表格
   - [ ] TanStack Table集成
   - [ ] 自定义列添加
   - [ ] Stream响应前端

4. **Phase 4**: PDF查看
   - [ ] PDF上传/存储
   - [ ] React-PDF集成
   - [ ] 文本高亮定位

参考 `TECHNICAL_DESIGN.md` 了解详细的技术方案。

---

## 有用的资源

- [Next.js文档](https://nextjs.org/docs)
- [FastAPI文档](https://fastapi.tiangolo.com/)
- [TanStack Table文档](https://tanstack.com/table/v8)
- [Anthropic API文档](https://docs.anthropic.com/)
- [Semantic Scholar API](https://api.semanticscholar.org/)
- [PyMuPDF文档](https://pymupdf.readthedocs.io/)

---

**问题反馈**: 开发过程中遇到问题，请在项目Issue中提出。

**最后更新**: 2026-02-15
