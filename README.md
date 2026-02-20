# Dynamic Literature Matrix

基于AI的学术论文搜索与信息提取工具，以动态表格形式展示文献关键信息。

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- Python >= 3.11
- Docker & Docker Compose

### 启动开发环境

1. **启动基础服务**
```bash
docker-compose up -d
```

2. **启动后端**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

3. **启动前端**
```bash
cd frontend
npm install
npm run dev
```

4. **访问应用**
- 前端: http://localhost:3000
- 后端API: http://localhost:8000/docs

## 项目结构

```
table-search/
├── frontend/          # Next.js 前端
├── backend/           # FastAPI 后端
├── docs/              # 文档
├── scripts/           # 工具脚本
└── docker-compose.yml # 开发环境
```

## 文档

- [API参考文档](./docs/API.md)
- [技术方案设计](./TECHNICAL_DESIGN.md)
- [技术决策记录](./TECH_DECISIONS.md)
- [快速开始指南](./GETTING_STARTED.md)

## 开发状态

当前版本: v0.2.0

### 后端
- ✅ FastAPI 项目结构与配置管理
- ✅ Mock SSE 搜索接口（分页，15篇预置论文）
- ✅ Mock SSE 信息抽取接口（批量 + 单列）
- ✅ Wispaper 真实搜索 API 集成
- ✅ MiniMax LLM 真实抽取服务（OpenAI 兼容接口）
- ✅ Mock / 真实模式可配置切换
- ✅ Paper 内存缓存（搜索结果供抽取使用）
- ✅ CORS、健康检查、Swagger 文档

### 前端
- ✅ Next.js 14 + TypeScript + Tailwind CSS
- ✅ SSE 客户端（POST 流式读取）
- ✅ Zustand 全局状态管理
- ✅ TanStack Table 动态表格（固定列 + 动态列）
- ✅ 单元格状态渲染（Loading / Completed / N/A / Error）
- ✅ 自定义列添加 / 编辑 / 删除
- ✅ 分页加载更多 + 新论文回填抽取
- ✅ 响应式设计（桌面表格 + 移动端卡片）

### 待开发
- ⏳ PDF 查看器集成（点击单元格查看原文）
- ⏳ 数据导出（CSV / Excel）
- ⏳ 搜索历史 / 会话保存
- ⏳ PostgreSQL 数据库持久化
- ⏳ 用户认证
- ⏳ 生产部署（Docker 镜像 + CI/CD）

## License

MIT
