# 技术决策记录 (Architecture Decision Records)

## ADR-001: 前端框架选择 Next.js

**日期**: 2026-02-15
**状态**: Accepted

### 背景
需要选择一个现代化的前端框架来构建动态文献矩阵应用。

### 决策
选择 **Next.js 14** (App Router) + React + TypeScript

### 理由

**优势**:
1. **全栈能力**: Next.js的API Routes可以处理简单的后端逻辑，降低部署复杂度
2. **SSR/SSG**: 对于搜索结果页面，可以提升SEO和首屏加载速度
3. **开发体验**: 热重载、TypeScript支持、自动路由等
4. **生态丰富**: 大量成熟的React组件库可用
5. **性能优化**: 自动代码分割、图片优化、字体优化

**替代方案与对比**:

| 方案 | 优势 | 劣势 | 评分 |
|------|------|------|------|
| **Next.js** | 全栈、性能好、生态强 | 学习曲线稍陡 | ⭐⭐⭐⭐⭐ |
| Vite + React | 极快的开发服务器 | 需要额外配置SSR | ⭐⭐⭐⭐ |
| SvelteKit | 更小的包体积 | 生态较小 | ⭐⭐⭐ |
| Remix | 优秀的数据加载 | 相对较新 | ⭐⭐⭐⭐ |

### 后果
- 团队需要学习Next.js的App Router（如果不熟悉）
- 部署时需要Node.js运行环境

---

## ADR-002: 表格组件选择 TanStack Table

**日期**: 2026-02-15
**状态**: Accepted

### 背景
需要一个强大的表格组件来支持：
- 动态列添加/删除
- 虚拟滚动（处理大量数据）
- 列排序、筛选
- 单元格状态管理

### 决策
选择 **TanStack Table v8** (原React Table)

### 理由

**核心优势**:
1. **Headless UI**: 完全控制样式和渲染逻辑
2. **虚拟滚动**: 内置支持，可处理10000+行无性能问题
3. **列管理**: 灵活的列定义、动态增删
4. **TypeScript**: 完美的类型支持
5. **框架无关**: 未来可复用逻辑到Vue/Svelte

**替代方案对比**:

| 方案 | 虚拟滚动 | 动态列 | 自定义性 | 评分 |
|------|----------|--------|----------|------|
| **TanStack Table** | ✅ | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| AG Grid | ✅ | ✅ | ⭐⭐⭐ (付费功能) | ⭐⭐⭐⭐ |
| Material Table | ⚠️ | ✅ | ⭐⭐ | ⭐⭐⭐ |
| 手写 | ✅ | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐ (成本高) |

### 实现要点
```typescript
// 支持动态列的配置示例
const columnHelper = createColumnHelper<Paper>();

const dynamicColumns = userColumns.map(col =>
  columnHelper.accessor(row => getCellData(row.id, col.id), {
    id: col.id,
    header: col.name,
    cell: info => <StreamingCell value={info.getValue()} />
  })
);
```

---

## ADR-003: 后端框架选择 FastAPI

**日期**: 2026-02-15
**状态**: Accepted

### 背景
需要一个Python Web框架来处理：
- RESTful API
- Server-Sent Events (SSE)
- 异步任务调度
- LLM集成

### 决策
选择 **FastAPI** + **Uvicorn**

### 理由

**优势**:
1. **原生异步**: 基于asyncio，支持高并发
2. **类型提示**: Pydantic数据验证，自动生成API文档
3. **SSE支持**: StreamingResponse轻松实现流式响应
4. **性能**: 接近Node.js/Go的性能水平
5. **AI生态**: 与LangChain、Anthropic SDK无缝集成

**对比**:

| 框架 | 异步 | 性能 | AI生态 | 文档质量 | 评分 |
|------|------|------|--------|----------|------|
| **FastAPI** | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Flask | ⚠️ (需扩展) | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Django | ⚠️ (ASGI) | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Sanic | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

### SSE实现示例
```python
from fastapi.responses import StreamingResponse

@app.post("/extract-batch")
async def extract_batch(request: ExtractRequest):
    async def event_stream():
        async for cell_update in extract_service.process(request):
            yield f"data: {cell_update.json()}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream"
    )
```

---

## ADR-004: LLM提供商选择 Anthropic Claude

**日期**: 2026-02-15
**状态**: Accepted

### 背景
需要选择一个LLM来执行：
- 意图分析（Query -> 推荐列）
- 信息提取（PDF -> 结构化数据）

### 决策
主要使用 **Claude 3.5 Sonnet**，辅助使用 **Claude 3 Haiku**

### 理由

**Claude的优势**:
1. **长上下文**: 200K tokens，可处理完整论文
2. **准确度**: 在信息提取任务上表现优秀
3. **成本**: Sonnet性价比高，Haiku更便宜
4. **结构化输出**: 可靠的JSON生成能力
5. **引用能力**: 可以准确引用原文位置

**模型选择策略**:
- **意图分析**: Claude 3.5 Sonnet (需要更强的理解能力)
- **信息提取**: Claude 3.5 Sonnet (准确度优先)
- **简单分类**: Claude 3 Haiku (成本优化)

**对比**:

| 模型 | 上下文 | 准确度 | 成本 | 速度 | 适用场景 |
|------|--------|--------|------|------|----------|
| **Claude 3.5 Sonnet** | 200K | ⭐⭐⭐⭐⭐ | $$ | ⭐⭐⭐⭐ | 核心提取 |
| Claude 3 Haiku | 200K | ⭐⭐⭐⭐ | $ | ⭐⭐⭐⭐⭐ | 简单任务 |
| GPT-4 Turbo | 128K | ⭐⭐⭐⭐⭐ | $$$ | ⭐⭐⭐ | 备选 |
| GPT-3.5 Turbo | 16K | ⭐⭐⭐ | $ | ⭐⭐⭐⭐⭐ | 不推荐 |

### 成本估算
假设每篇论文平均40K tokens（约30页），每个单元格提取：
- Input: 40K tokens × $3/M = $0.12
- Output: 500 tokens × $15/M = $0.0075
- **单元格成本**: ~$0.13

1000个单元格（50篇论文×20列）= $130

**优化策略**:
- 智能截断（只发送相关章节）
- 缓存相同提取结果
- 批量请求（Batch API，如果可用）

---

## ADR-005: PDF解析方案选择 PyMuPDF

**日期**: 2026-02-15
**状态**: Accepted

### 背景
需要从PDF中提取：
- 完整文本内容
- 文本块坐标（用于高亮定位）
- 页码信息

### 决策
使用 **PyMuPDF (fitz)** 作为主解析器

### 理由

**优势**:
1. **速度快**: C++底层，比纯Python快10-100倍
2. **坐标精确**: 可获取每个文本块的bbox
3. **功能完整**: 支持文本、图片、元数据提取
4. **稳定**: 成熟的项目，广泛使用

**对比**:

| 库 | 速度 | 坐标 | 易用性 | 评分 |
|------|------|------|--------|------|
| **PyMuPDF** | ⭐⭐⭐⭐⭐ | ✅ 精确 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| pdfplumber | ⭐⭐⭐ | ✅ 精确 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| PyPDF2 | ⭐⭐ | ❌ | ⭐⭐⭐⭐ | ⭐⭐ |
| Adobe PDF SDK | ⭐⭐⭐⭐⭐ | ✅ | ⭐⭐ (收费) | ⭐⭐⭐ |

### 文本定位策略
```python
import fitz

def extract_with_coords(pdf_path):
    doc = fitz.open(pdf_path)
    blocks = []

    for page_num, page in enumerate(doc):
        # 获取文本块（带坐标）
        text_dict = page.get_text("dict")

        for block in text_dict["blocks"]:
            if "lines" in block:
                blocks.append({
                    "page": page_num + 1,
                    "text": extract_block_text(block),
                    "bbox": block["bbox"]  # (x0, y0, x1, y1)
                })

    return blocks
```

**Fallback方案**:
- 如果PyMuPDF失败（扫描版PDF）-> OCR (Tesseract)
- 如果坐标不准（复杂排版）-> 模糊匹配 + 用户反馈

---

## ADR-006: 状态管理选择 Zustand

**日期**: 2026-02-15
**状态**: Accepted

### 背景
前端需要管理复杂的全局状态：
- 搜索会话
- 表格数据（行、列、单元格）
- UI状态（选中的单元格、侧边栏状态等）

### 决策
使用 **Zustand** + **SWR**（数据获取）

### 理由

**Zustand优势**:
1. **轻量**: ~1KB，比Redux小90%
2. **简单**: 无需Provider包裹，直接hook使用
3. **TypeScript友好**: 完美的类型推断
4. **性能**: 细粒度更新，避免不必要的重渲染
5. **DevTools**: 支持Redux DevTools

**对比**:

| 方案 | 体积 | 易用性 | 性能 | 学习曲线 | 评分 |
|------|------|--------|------|----------|------|
| **Zustand** | 1KB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Redux Toolkit | 10KB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Jotai | 3KB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Recoil | 20KB | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

**为什么配合SWR**:
- Zustand管理UI状态
- SWR管理服务器数据（自动缓存、重验证）
- 职责分离，降低复杂度

### 示例实现
```typescript
import { create } from 'zustand';

interface MatrixStore {
  sessionId: string | null;
  query: string;
  rows: Paper[];
  columns: Column[];
  cells: Map<string, CellData>;

  initSearch: (query: string) => void;
  addColumn: (column: Column) => void;
  updateCell: (cellId: string, data: CellData) => void;
}

export const useMatrixStore = create<MatrixStore>((set) => ({
  sessionId: null,
  query: '',
  rows: [],
  columns: [],
  cells: new Map(),

  initSearch: (query) => set({
    sessionId: generateUUID(),
    query,
    rows: [],
    columns: [],
    cells: new Map()
  }),

  addColumn: (column) => set((state) => ({
    columns: [...state.columns, column]
  })),

  updateCell: (cellId, data) => set((state) => {
    const newCells = new Map(state.cells);
    newCells.set(cellId, data);
    return { cells: newCells };
  })
}));
```

---

## ADR-007: 数据库选择 PostgreSQL

**日期**: 2026-02-15
**状态**: Accepted

### 背景
需要存储：
- 会话数据
- 论文元数据
- 列定义
- 单元格数据
- PDF解析缓存

### 决策
使用 **PostgreSQL 15** + **Redis**（缓存）

### 理由

**PostgreSQL优势**:
1. **可靠性**: ACID保证，数据安全
2. **JSON支持**: 原生JSONB，适合存储灵活的元数据
3. **全文搜索**: 内置FTS（如果不用外部搜索引擎）
4. **扩展性**: pgvector（未来可能需要语义搜索）
5. **生态**: 成熟的ORM（SQLAlchemy）、迁移工具（Alembic）

**为什么不选NoSQL**:
- 数据有明确的关系（Session-Papers-Columns-Cells）
- 需要事务支持（保证数据一致性）
- 查询模式相对固定

**Redis的角色**:
- Session元数据缓存
- Celery任务队列
- PDF解析结果缓存（短期）
- 速率限制计数器

**对比**:

| 数据库 | 关系型 | JSON | 性能 | 运维成本 | 评分 |
|--------|--------|------|------|----------|------|
| **PostgreSQL** | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| MySQL | ✅ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| MongoDB | ❌ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| SQLite | ✅ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ (扩展性差) |

---

## ADR-008: 异步任务队列选择 Celery

**日期**: 2026-02-15
**状态**: Accepted

### 背景
批量信息提取是耗时任务（单个提取可能需5-10秒），需要异步处理避免阻塞API。

### 决策
使用 **Celery** + **Redis**（Broker）

### 理由

**Celery优势**:
1. **成熟**: Python生态的标准异步任务方案
2. **分布式**: 可横向扩展Worker
3. **可靠**: 任务重试、结果存储
4. **监控**: Flower提供Web UI监控

**任务场景**:
- 批量信息提取（50篇×10列=500个提取任务）
- PDF下载与解析
- 定时清理过期会话

**替代方案**:

| 方案 | 成熟度 | 分布式 | 监控 | Python生态 | 评分 |
|------|--------|--------|------|------------|------|
| **Celery** | ⭐⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| RQ | ⭐⭐⭐⭐ | ✅ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Dramatiq | ⭐⭐⭐ | ✅ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| ARQ | ⭐⭐⭐ | ✅ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

**注意**: 对于实时Stream响应，仍使用FastAPI的异步路由，不经过Celery。

---

## ADR-009: 部署方案选择 Docker + Cloud Run

**日期**: 2026-02-15
**状态**: Proposed

### 背景
需要选择一个易于部署、扩展的方案。

### 建议方案
**开发阶段**: Docker Compose (本地)
**生产阶段**: Google Cloud Run / AWS ECS

### 理由

**Cloud Run优势**:
1. **Serverless**: 自动扩缩容，按请求付费
2. **容器化**: 使用Docker镜像，环境一致性
3. **成本**: 无流量时零成本
4. **易用**: 一键部署，HTTPS自动配置

**架构**:
```
Frontend (Next.js) -> Cloud Run (SSR + API)
Backend (FastAPI) -> Cloud Run
Celery Workers -> Cloud Run Jobs
PostgreSQL -> Cloud SQL
Redis -> Memorystore
PDF Storage -> Cloud Storage
```

**替代方案**:

| 方案 | 成本 | 扩展性 | 运维 | 评分 |
|------|------|--------|------|------|
| **Cloud Run** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| AWS Lambda | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Kubernetes | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| VPS (单机) | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

**成本估算**（月流量：1000次搜索）:
- Cloud Run: ~$20
- Cloud SQL (db-f1-micro): ~$10
- Memorystore (1GB): ~$30
- Cloud Storage: ~$5
- Anthropic API: ~$500-1000（主要成本）
- **总计**: ~$565-1065/月

---

## 总结：技术栈一览

### 前端
- **框架**: Next.js 14 + React 18 + TypeScript
- **表格**: TanStack Table v8
- **PDF**: React-PDF
- **状态**: Zustand + SWR
- **样式**: Tailwind CSS

### 后端
- **框架**: FastAPI + Uvicorn
- **LLM**: Anthropic Claude 3.5 Sonnet
- **PDF**: PyMuPDF (fitz)
- **异步**: Celery + Redis

### 数据
- **主库**: PostgreSQL 15
- **缓存**: Redis 7
- **存储**: S3/Cloud Storage

### DevOps
- **容器**: Docker + Docker Compose
- **部署**: Cloud Run / ECS
- **CI/CD**: GitHub Actions
- **监控**: Sentry (错误) + Prometheus (性能)

---

**下一步**: 开始项目初始化，创建脚手架代码
