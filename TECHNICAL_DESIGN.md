# 技术方案设计文档
## Dynamic Literature Matrix - Technical Design

**版本**: v1.0
**日期**: 2026-02-15
**状态**: Draft

---

## 1. 技术栈选型 (Technology Stack)

### 1.1 前端技术栈

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|----------|
| **React** | 18+ | UI框架 | 组件化开发，丰富的生态系统 |
| **TypeScript** | 5+ | 开发语言 | 类型安全，提升代码质量 |
| **Next.js** | 14+ | 全栈框架 | SSR/SSG支持，API Routes，优秀的开发体验 |
| **TanStack Table** | v8 | 表格组件 | 强大的虚拟滚动、列管理、无限加载支持 |
| **React-PDF** | 7+ | PDF渲染 | 支持文本高亮、页面跳转 |
| **Tailwind CSS** | 3+ | 样式方案 | 快速开发，一致的设计系统 |
| **Zustand** | 4+ | 状态管理 | 轻量级，适合中等复杂度应用 |
| **SWR** | 2+ | 数据获取 | 自动缓存、重验证，Stream支持 |

### 1.2 后端技术栈

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|----------|
| **Python** | 3.11+ | 主语言 | AI/ML生态丰富 |
| **FastAPI** | 0.109+ | Web框架 | 原生异步、自动文档、Stream支持 |
| **LangChain** | 0.1+ | LLM框架 | 提供Prompt管理、Chain编排 |
| **Anthropic Claude** | API | 核心LLM | 长上下文、高准确度 |
| **PostgreSQL** | 15+ | 主数据库 | 可靠性高，支持向量检索扩展 |
| **Redis** | 7+ | 缓存层 | 会话管理、任务队列 |
| **Celery** | 5+ | 异步任务 | 处理批量抽取任务 |
| **PyMuPDF** | 1.23+ | PDF解析 | 提取文本、坐标、页码 |

### 1.3 外部服务

| 服务 | 用途 | 备选方案 |
|------|------|----------|
| **Semantic Scholar API** | 论文搜索 | arXiv API, PubMed |
| **Anthropic Claude API** | 意图分析、信息提取 | OpenAI GPT-4, Gemini |
| **S3/OSS** | PDF文件存储 | MinIO (自建) |

---

## 2. 系统架构设计 (System Architecture)

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Search Input │  │ Matrix Table │  │ PDF Sidebar  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────┬────────────────────────────────────────────────┘
             │ HTTP/SSE
┌────────────▼────────────────────────────────────────────────┐
│                    API Gateway (FastAPI)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Search API   │  │ Extract API  │  │  PDF API     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────┬─────────┬────────────┬──────────────────┬──────────────┘
     │         │            │                  │
     │         │            │                  │
┌────▼─────┐ ┌▼────────┐  ┌▼──────────┐  ┌────▼──────┐
│ Paper    │ │ Intent  │  │ Info      │  │ PDF       │
│ Search   │ │ Analyzer│  │ Extractor │  │ Parser    │
│ Engine   │ │ (LLM)   │  │ (LLM)     │  │ Service   │
└──────────┘ └─────────┘  └───────────┘  └───────────┘
     │            │             │              │
┌────▼────────────▼─────────────▼──────────────▼────────┐
│              Core Services Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ LLM      │  │ Cache    │  │ Task     │            │
│  │ Provider │  │ Manager  │  │ Queue    │            │
│  └──────────┘  └──────────┘  └──────────┘            │
└────────────────────────────────────────────────────────┘
     │              │              │
┌────▼──────────────▼──────────────▼─────────────────────┐
│              Data Layer                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Postgres │  │  Redis   │  │  S3/OSS  │            │
│  └──────────┘  └──────────┘  └──────────┘            │
└─────────────────────────────────────────────────────────┘
```

### 2.2 核心模块职责

#### 2.2.1 前端模块

**SearchBar Component**
- 接收用户输入
- 触发搜索请求
- 管理搜索状态

**MatrixTable Component**
- 渲染动态表格
- 虚拟滚动（处理大量行）
- 列管理（添加/删除/修改）
- 单元格状态管理（Loading/Data/Error/NA）

**PDFViewer Component**
- PDF渲染
- 高亮定位
- 页面跳转

**State Management (Zustand Store)**
```typescript
interface MatrixStore {
  // 当前搜索会话
  sessionId: string;
  query: string;

  // 表格数据
  rows: Paper[];
  columns: Column[];
  cells: Map<string, CellData>; // key: `${paperId}_${columnId}`

  // UI状态
  loadingRows: boolean;
  selectedCell: CellPosition | null;

  // 操作
  initSearch: (query: string) => void;
  addColumn: (prompt: string) => void;
  loadMoreRows: () => void;
  selectCell: (position: CellPosition) => void;
}
```

#### 2.2.2 后端模块

**Paper Search Engine**
- 调用Semantic Scholar API
- 分页管理
- 结果标准化

**Intent Analyzer**
- 输入：用户Query
- 输出：推荐的Column列表
- Prompt模板：
```
Given a research query: "{query}"
Generate 3-5 relevant information dimensions that users would want to compare across papers.
Return as JSON array of objects with: {name, prompt, description}
```

**Info Extractor**
- 输入：Paper PDF + Column Prompt
- 输出：{value, evidence_text, page_number, bbox}
- 支持批量并发提取
- Stream响应

**PDF Parser Service**
- PDF文本提取
- 坐标映射（文本 -> BBox）
- 缓存解析结果

---

## 3. 核心流程设计 (Core Flows)

### 3.1 初始搜索流程

```
[User Input Query]
    │
    ├─→ [Frontend] 清空当前状态，生成新sessionId
    │
    ├─→ [POST /api/search]
    │      └─→ Task A: Paper Search (返回Top K论文)
    │      └─→ Task B: Intent Analysis (返回推荐列)
    │
    ├─→ [Frontend] 渲染表格框架
    │      └─→ 固定列: [Title, Year, Authors]
    │      └─→ 动态列: 来自Task B
    │
    └─→ [POST /api/extract-batch] (Stream)
           └─→ 对K篇论文 × N个列，并发提取
           └─→ SSE流式返回每个单元格数据
           └─→ Frontend逐个亮起单元格
```

### 3.2 添加自定义列流程

```
[User Clicks "+" Button]
    │
    ├─→ [Modal] 输入Prompt
    │
    ├─→ [POST /api/columns]
    │      └─→ 创建新列定义
    │
    ├─→ [Frontend] 在表格最右侧添加新列（Loading状态）
    │
    └─→ [POST /api/extract-column] (Stream)
           └─→ 对当前所有行，执行新列的提取
           └─→ SSE流式返回
```

### 3.3 无限滚动回填流程

```
[User Scrolls to Bottom]
    │
    ├─→ [GET /api/search?page=2]
    │      └─→ 获取下一批论文
    │
    ├─→ [Frontend] 追加新行（Loading状态）
    │
    └─→ [POST /api/extract-backfill] (Stream)
           └─→ 对新行 × 所有现有列，执行提取
           └─→ SSE流式返回
```

### 3.4 原文溯源流程

```
[User Clicks Cell]
    │
    ├─→ [Frontend] 打开Sidebar
    │
    ├─→ [GET /api/papers/{id}/pdf]
    │      └─→ 返回PDF URL（预签名）
    │
    ├─→ [GET /api/cells/{cellId}/evidence]
    │      └─→ 返回{page, bbox, text}
    │
    └─→ [PDF Viewer]
           └─→ 跳转到指定页
           └─→ 高亮bbox区域
```

---

## 4. API设计 (API Design)

### 4.1 RESTful API规范

**Base URL**: `/api/v1`

#### 4.1.1 搜索相关

**POST /search**
```json
// Request
{
  "query": "LLM memory optimization",
  "page": 1,
  "page_size": 20
}

// Response
{
  "session_id": "uuid",
  "papers": [
    {
      "id": "paper_123",
      "title": "...",
      "authors": ["..."],
      "year": 2024,
      "abstract": "...",
      "pdf_url": "..."
    }
  ],
  "suggested_columns": [
    {
      "id": "col_1",
      "name": "优化方法",
      "prompt": "What memory optimization method is used?",
      "description": "..."
    }
  ],
  "total": 150
}
```

**GET /search**
```
Query Params:
- session_id: string (required)
- page: int
- page_size: int

// 用于加载更多论文（Infinite Scroll）
```

#### 4.1.2 信息提取相关

**POST /extract-batch** (Server-Sent Events)
```json
// Request
{
  "session_id": "uuid",
  "paper_ids": ["paper_1", "paper_2"],
  "column_ids": ["col_1", "col_2"]
}

// Response (SSE Stream)
event: cell_update
data: {"paper_id": "paper_1", "column_id": "col_1", "status": "loading"}

event: cell_update
data: {
  "paper_id": "paper_1",
  "column_id": "col_1",
  "status": "completed",
  "value": "Gradient Checkpointing",
  "evidence": {
    "text": "We employ gradient checkpointing...",
    "page": 3,
    "bbox": [100, 200, 400, 220]
  }
}

event: cell_update
data: {"paper_id": "paper_1", "column_id": "col_2", "status": "na"}
```

#### 4.1.3 列管理相关

**POST /columns**
```json
// Request
{
  "session_id": "uuid",
  "name": "训练数据集",
  "prompt": "What dataset is used for training?"
}

// Response
{
  "column_id": "col_new",
  "name": "训练数据集",
  "prompt": "..."
}
```

**PATCH /columns/{column_id}**
```json
// Request
{
  "prompt": "What is the size of training dataset?"
}

// Response
{
  "column_id": "col_1",
  "updated": true
}
```

**DELETE /columns/{column_id}**

#### 4.1.4 PDF相关

**GET /papers/{paper_id}/pdf**
```
// Response
{
  "url": "https://s3.../paper_123.pdf?signature=...",
  "expires_in": 3600
}
```

**GET /cells/{cell_id}/evidence**
```json
// Response
{
  "paper_id": "paper_123",
  "column_id": "col_1",
  "evidence": {
    "text": "...",
    "page": 3,
    "bbox": [x1, y1, x2, y2],
    "confidence": 0.92
  }
}
```

---

## 5. 数据模型设计 (Data Model)

### 5.1 数据库Schema (PostgreSQL)

```sql
-- 搜索会话表
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 论文表
CREATE TABLE papers (
    id VARCHAR(255) PRIMARY KEY,  -- 外部ID (如Semantic Scholar ID)
    title TEXT NOT NULL,
    authors JSONB,  -- ["Author1", "Author2"]
    year INTEGER,
    abstract TEXT,
    pdf_url TEXT,
    pdf_stored_path TEXT,  -- S3路径
    metadata JSONB,  -- 其他元数据
    created_at TIMESTAMP DEFAULT NOW()
);

-- 会话-论文关联表
CREATE TABLE session_papers (
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    paper_id VARCHAR(255) REFERENCES papers(id),
    rank INTEGER,  -- 在该会话中的排序
    PRIMARY KEY (session_id, paper_id)
);

-- 列定义表
CREATE TABLE columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    column_type VARCHAR(50),  -- 'auto' | 'custom'
    position INTEGER,  -- 列顺序
    created_at TIMESTAMP DEFAULT NOW()
);

-- 单元格数据表
CREATE TABLE cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    paper_id VARCHAR(255) REFERENCES papers(id),
    column_id UUID REFERENCES columns(id) ON DELETE CASCADE,
    value TEXT,
    status VARCHAR(50),  -- 'loading' | 'completed' | 'error' | 'na'
    evidence JSONB,  -- {text, page, bbox, confidence}
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(session_id, paper_id, column_id)
);

-- PDF解析缓存表
CREATE TABLE pdf_cache (
    paper_id VARCHAR(255) PRIMARY KEY REFERENCES papers(id),
    full_text TEXT,
    text_blocks JSONB,  -- [{text, page, bbox}, ...]
    parsed_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_session_papers_session ON session_papers(session_id);
CREATE INDEX idx_columns_session ON columns(session_id);
CREATE INDEX idx_cells_session ON cells(session_id);
CREATE INDEX idx_cells_paper_column ON cells(paper_id, column_id);
```

### 5.2 Redis缓存设计

```
# Session元数据
session:{session_id}:meta -> {query, created_at, ...}

# 论文列表缓存
session:{session_id}:papers -> Sorted Set (score=rank)

# 单元格状态缓存
cell:{session_id}:{paper_id}:{column_id} -> {value, evidence, status}

# Celery任务队列
celery:task:{task_id} -> {status, result}

# PDF解析缓存
pdf:parsed:{paper_id} -> {full_text, blocks}

# 速率限制
ratelimit:extract:{user_id} -> Counter (TTL: 60s)
```

---

## 6. 核心算法与实现细节

### 6.1 意图分析算法 (Intent Analyzer)

**Prompt设计**:
```python
INTENT_ANALYSIS_PROMPT = """
You are an expert in academic research. Given a user's search query,
generate 3-5 relevant information dimensions that would be valuable
for comparing papers in a table format.

Query: "{query}"

Requirements:
1. Each dimension should be a factual, extractable piece of information
2. Avoid subjective dimensions (like "quality" or "importance")
3. Prioritize quantitative metrics when applicable
4. Consider the domain context

Output JSON format:
[
  {{
    "name": "Short column name (2-4 words)",
    "prompt": "Clear extraction instruction for LLM",
    "description": "Why this dimension matters"
  }}
]

Examples:
- For ML papers: [Model Architecture, Dataset Size, Performance Metric]
- For medical papers: [Study Type, Sample Size, Primary Outcome]
"""
```

**实现**:
```python
async def analyze_intent(query: str) -> List[ColumnSuggestion]:
    prompt = INTENT_ANALYSIS_PROMPT.format(query=query)

    response = await claude_client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    suggestions = json.loads(response.content[0].text)
    return [ColumnSuggestion(**s) for s in suggestions]
```

### 6.2 信息提取算法 (Info Extractor)

**核心挑战**:
1. 准确提取信息
2. 提供可验证的证据
3. 处理"未提及"情况

**Prompt设计**:
```python
EXTRACTION_PROMPT = """
You are extracting specific information from an academic paper.

Paper Title: {title}
Paper Abstract: {abstract}

Extraction Task: {column_prompt}

Full Paper Text:
{full_text}

Instructions:
1. Find the most relevant information that answers the extraction task
2. If the information is not mentioned, return null
3. Provide the exact quote as evidence
4. Include the page number where the evidence was found

Output JSON format:
{{
  "value": "Concise answer (max 100 chars)" or null,
  "evidence": {{
    "text": "Exact quote from paper",
    "page": page_number,
    "confidence": 0.0-1.0
  }} or null,
  "reasoning": "Brief explanation of your answer"
}}
"""
```

**实现（带Streaming）**:
```python
async def extract_info_stream(
    paper_id: str,
    column: Column,
    session_id: str
) -> AsyncGenerator[CellUpdate, None]:
    # 1. 获取PDF文本
    pdf_text = await get_pdf_text(paper_id)

    # 2. 构建prompt
    prompt = EXTRACTION_PROMPT.format(
        title=paper.title,
        abstract=paper.abstract,
        column_prompt=column.prompt,
        full_text=pdf_text[:50000]  # 截断控制成本
    )

    # 3. Stream响应
    yield CellUpdate(
        paper_id=paper_id,
        column_id=column.id,
        status="loading"
    )

    async with claude_client.messages.stream(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    ) as stream:
        full_response = ""
        async for text in stream.text_stream:
            full_response += text

    # 4. 解析结果
    result = json.loads(full_response)

    # 5. 如果有evidence，提取bbox
    if result["evidence"]:
        bbox = await find_text_bbox(
            paper_id,
            result["evidence"]["text"],
            result["evidence"]["page"]
        )
        result["evidence"]["bbox"] = bbox

    # 6. 返回最终结果
    yield CellUpdate(
        paper_id=paper_id,
        column_id=column.id,
        status="completed" if result["value"] else "na",
        value=result["value"],
        evidence=result["evidence"]
    )
```

### 6.3 PDF文本定位算法

**挑战**: 将提取的文本片段映射到PDF坐标

**方案**: PyMuPDF文本块匹配

```python
import fitz  # PyMuPDF

async def find_text_bbox(
    paper_id: str,
    target_text: str,
    target_page: int
) -> List[float]:
    pdf_path = await get_pdf_path(paper_id)
    doc = fitz.open(pdf_path)

    page = doc[target_page - 1]  # 0-indexed

    # 获取所有文本块
    blocks = page.get_text("dict")["blocks"]

    # 模糊匹配
    best_match = None
    best_score = 0

    for block in blocks:
        if "lines" not in block:
            continue

        block_text = " ".join(
            span["text"]
            for line in block["lines"]
            for span in line["spans"]
        )

        # 使用difflib计算相似度
        score = difflib.SequenceMatcher(
            None,
            target_text.lower(),
            block_text.lower()
        ).ratio()

        if score > best_score:
            best_score = score
            best_match = block["bbox"]  # [x0, y0, x1, y1]

    return best_match if best_score > 0.6 else None
```

### 6.4 并发控制与性能优化

**批量提取策略**:
```python
async def extract_batch(
    session_id: str,
    paper_ids: List[str],
    column_ids: List[str]
) -> AsyncGenerator[CellUpdate, None]:
    tasks = []

    # 创建所有提取任务
    for paper_id in paper_ids:
        for column_id in column_ids:
            task = extract_info_stream(
                paper_id,
                await get_column(column_id),
                session_id
            )
            tasks.append(task)

    # 限制并发数（避免API限流）
    semaphore = asyncio.Semaphore(10)

    async def bounded_task(task):
        async with semaphore:
            async for update in task:
                yield update

    # 并发执行
    for task in tasks:
        async for update in bounded_task(task):
            yield update
```

**缓存策略**:
- PDF解析结果缓存（Redis + DB）
- 相同paper+column的重复提取去重
- LLM响应缓存（相同prompt复用）

---

## 7. 非功能性需求 (Non-Functional Requirements)

### 7.1 性能指标

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| 搜索响应时间 | < 2s | 从输入到首屏显示 |
| 单元格填充速度 | > 5 cells/s | Stream响应速率 |
| PDF加载时间 | < 3s | 打开侧边栏到PDF可见 |
| 并发用户数 | 100+ | Load Testing |
| 数据库查询 | < 100ms | 95th percentile |

### 7.2 可扩展性设计

**水平扩展点**:
- FastAPI实例（无状态，负载均衡）
- Celery Worker（任务队列扩展）
- Redis集群（缓存分片）
- PostgreSQL读副本（读写分离）

**成本控制**:
- LLM API调用优化：
  - 文本截断策略（只发送相关章节）
  - 批量请求合并
  - 缓存相同提取结果
- PDF存储优化：
  - 按需下载（不预加载）
  - CDN缓存

### 7.3 安全性

**认证授权**:
- JWT Token认证
- Session隔离（用户间数据不可见）

**数据安全**:
- PDF URL预签名（限时访问）
- 敏感信息脱敏（如果处理内部文档）

**速率限制**:
```python
# 每用户每分钟限制
- 搜索: 10次
- 提取: 100个单元格
- PDF下载: 20次
```

---

## 8. 技术风险与应对方案

### 8.1 风险矩阵

| 风险 | 影响 | 概率 | 应对方案 |
|------|------|------|----------|
| LLM提取准确度低 | 高 | 中 | 1) Prompt工程优化 2) 人工反馈loop 3) 多模型ensemble |
| API费用超支 | 高 | 中 | 1) 智能缓存 2) 文本截断 3) 成本监控告警 |
| PDF解析失败 | 中 | 高 | 1) 多解析器fallback 2) OCR补充 3) 用户反馈 |
| 大量论文加载慢 | 中 | 中 | 1) 虚拟滚动 2) 懒加载 3) 预加载优化 |
| 外部API不稳定 | 中 | 低 | 1) 重试机制 2) 降级策略 3) 多数据源 |

### 8.2 关键技术验证 (PoC)

**在MVP前需验证**:
1. ✅ Claude API的信息提取准确度（准备测试集）
2. ✅ PyMuPDF的文本定位精度
3. ✅ SSE Stream在大量单元格时的性能
4. ✅ TanStack Table处理1000+行的流畅度

---

## 9. 开发计划与里程碑

### Phase 1: MVP (2-3周)
- ✅ 基础搜索功能
- ✅ 固定3个自动生成列
- ✅ 信息提取（最多20篇论文）
- ✅ 基础PDF查看（无高亮）

### Phase 2: 核心功能 (3-4周)
- ✅ 自定义列添加/删除/修改
- ✅ 无限滚动
- ✅ PDF高亮定位
- ✅ Stream响应优化

### Phase 3: 优化与增强 (2-3周)
- ✅ 性能优化（缓存、并发）
- ✅ 用户体验优化（加载动画、错误处理）
- ✅ 数据导出（CSV/Excel）
- ✅ 分享功能（只读链接）

### Phase 4: 生产就绪 (2周)
- ✅ 监控与日志
- ✅ 自动化测试（E2E）
- ✅ 文档完善
- ✅ 部署CI/CD

---

## 10. 附录

### 10.1 目录结构

```
table-search/
├── frontend/                 # Next.js前端
│   ├── src/
│   │   ├── app/             # App Router
│   │   ├── components/      # React组件
│   │   │   ├── SearchBar/
│   │   │   ├── MatrixTable/
│   │   │   └── PDFViewer/
│   │   ├── stores/          # Zustand状态
│   │   ├── lib/             # 工具函数
│   │   └── types/           # TypeScript类型
│   ├── public/
│   └── package.json
│
├── backend/                  # FastAPI后端
│   ├── app/
│   │   ├── api/             # API路由
│   │   │   ├── search.py
│   │   │   ├── extract.py
│   │   │   ├── columns.py
│   │   │   └── pdf.py
│   │   ├── services/        # 业务逻辑
│   │   │   ├── paper_search.py
│   │   │   ├── intent_analyzer.py
│   │   │   ├── info_extractor.py
│   │   │   └── pdf_parser.py
│   │   ├── models/          # 数据模型
│   │   ├── db/              # 数据库连接
│   │   └── core/            # 配置与依赖
│   ├── tests/
│   ├── requirements.txt
│   └── alembic/             # 数据库迁移
│
├── docs/                     # 文档
│   ├── PRD.md
│   ├── TECHNICAL_DESIGN.md
│   └── API.md
│
└── docker-compose.yml        # 本地开发环境
```

### 10.2 关键依赖版本

**Frontend**:
```json
{
  "next": "^14.1.0",
  "react": "^18.2.0",
  "@tanstack/react-table": "^8.11.0",
  "react-pdf": "^7.7.0",
  "zustand": "^4.5.0",
  "swr": "^2.2.0",
  "tailwindcss": "^3.4.0"
}
```

**Backend**:
```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
anthropic==0.18.0
langchain==0.1.0
sqlalchemy==2.0.25
asyncpg==0.29.0
redis==5.0.1
celery==5.3.6
PyMuPDF==1.23.0
```

---

## 11. 下一步行动

### 立即可执行
1. **项目初始化**
   - 创建前后端项目脚手架
   - 配置开发环境（Docker Compose）
   - 设置Git仓库与分支策略

2. **技术验证**
   - 测试Anthropic API信息提取效果
   - 验证Semantic Scholar API可用性
   - 测试PyMuPDF文本定位精度

3. **数据库设计**
   - 编写migration脚本
   - 创建测试数据

### 待讨论
- [ ] 是否需要用户认证系统？
- [ ] 是否支持多语言论文（中文、日文等）？
- [ ] 是否需要团队协作功能（共享Matrix）？
- [ ] 预算限制（LLM API费用上限）？

---

**文档维护者**: Claude
**最后更新**: 2026-02-15
**反馈**: [GitHub Issues](待创建)
