# 快速启动指南

## 已完成功能

### 后端 (FastAPI)
- Mock SSE搜索接口（流式返回论文数据）
- Mock SSE信息抽取接口（流式返回单元格数据）
- 15篇预置AI论文（分2页），4组推荐列策略
- Wispaper 真实搜索API集成
- MiniMax LLM 真实抽取服务
- Mock / 真实模式通过环境变量切换

### 前端 (Next.js + React)
- 搜索框组件（SSE流式接收 + 快捷标签）
- 动态表格组件（TanStack Table，固定列 + 动态列）
- 自定义列添加 / 编辑定义 / 删除
- 分页加载更多论文（自动回填已有列）
- 状态管理（Zustand）
- 响应式设计（桌面表格 + 移动端卡片）

---

## 快速启动

### 方式一：使用脚本（推荐）

**1. 启动后端**
```bash
chmod +x scripts/start-backend.sh
./scripts/start-backend.sh
```

**2. 启动前端（新终端）**
```bash
chmod +x scripts/start-frontend.sh
./scripts/start-frontend.sh
```

### 方式二：手动启动

**后端:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**前端:**
```bash
cd frontend
npm install
npm run dev
```

---

## 使用步骤

1. **访问应用**: 打开浏览器访问 http://47.236.40.227:9991 （公网）或 http://localhost:9991 （本地）

2. **输入查询**: 在搜索框输入研究问题，或点击快捷标签，例如：
   - "LLM memory optimization"
   - "attention mechanism"
   - "model architecture comparison"

3. **观察搜索结果**:
   - 论文逐条流式加载到表格
   - 自动生成3个推荐列（AUTO标签），单元格逐个填充

4. **添加列**: 点击表格右上角 `+` 按钮，输入提取指令（如 "main method"、"training dataset"），系统会用 LLM 自动提取所有论文

5. **管理列**: 右键点击列头，可编辑定义或删除列

6. **加载更多**: 点击表格底部 "Load more papers" 加载第二页论文

---

## 切换真实API

默认使用Mock数据，无需外部API。搜索和抽取可以独立切换，支持四种组合模式。

### 模式组合

| 搜索 | 抽取 | 适用场景 |
|------|------|---------|
| Mock | Mock | 本地开发、前端调试 |
| Mock | 真实(MiniMax) | 测试LLM抽取效果 |
| 真实(Wispaper) | Mock | 测试搜索集成 |
| 真实(Wispaper) | 真实(MiniMax) | 生产环境 |

### 配置方法

编辑 `backend/.env`：

```bash
# === 搜索配置：Wispaper Search API ===
USE_MOCK_SEARCH=false
WISPAPER_API_URL=https://gateway.dev.wispaper.ai/api/v1/search/completions

# === 抽取配置：MiniMax LLM ===
USE_MOCK_EXTRACTION=false
MINIMAX_API_KEY=<sk-api-xxx>
MINIMAX_MODEL=MiniMax-M2.5
```

重启后端即可生效。

### Wispaper Search API

- **上游地址**: `https://gateway.dev.wispaper.ai/api/v1/search/completions`
- **认证方式**: JWT Bearer Token（从 Wispaper 认证服务获取）
- **返回数据**: 论文元数据（title, authors, year, abstract 等）+ 推荐分析维度（auto columns）
- **注意事项**:
  - JWT 有过期时间（`exp` 字段），过期后需重新获取
  - 搜索结果包含完整论文元数据和推荐列

验证 Token 是否有效：

```bash
curl -X POST 'https://gateway.dev.wispaper.ai/api/v1/search/completions' \
  -H 'accept: text/event-stream' \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <user-cookie-token>' \
  -H 'cache-control: no-cache' \
  -d '{"message":"test","stream":false,"search_scholar":true,"slow_search":true,"offset":0,"limit":5,"x-billing":"search"}'
```

### MiniMax LLM 抽取API

- **Base URL**: `https://api.minimax.chat/v1`（OpenAI 兼容接口）
- **模型**: `MiniMax-M2.5`（推理模型，会输出 `<think>` 标签，后端自动去除）
- **客户端**: 使用 `openai.AsyncOpenAI` SDK，配置 MiniMax 的 base_url
- **并发控制**: 默认最多 5 个并行 LLM 调用（`EXTRACTION_CONCURRENCY`）

验证 API Key 是否有效：

```bash
curl -X POST 'https://api.minimax.chat/v1/chat/completions' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <MINIMAX_API_KEY>' \
  -d '{"model":"MiniMax-M2.5","messages":[{"role":"user","content":"hi"}],"max_tokens":10}'
```

### 完整工作流

```
用户输入查询
    ↓
后端 → Wispaper Search API（SSE 流式搜索 + 验证）
    ↓
verification agent 逐篇返回论文元数据 → 立即发送给前端
    ↓
search_verify_agent 返回推荐分析维度 → 作为 auto columns 发送给前端
    ↓
前端自动触发批量抽取
    ↓
后端 → MiniMax LLM（逐单元格抽取，使用论文 abstract）→ 返回结构化数据
    ↓
前端表格逐步填充
```

详细API格式参见 `docs/API.md` 中的 "Upstream API: Wispaper Search" 和 "Upstream API: MiniMax LLM Extraction" 章节。

---

## 测试建议

### 测试查询关键词

不同关键词会触发不同的推荐列（Mock模式）：

| 查询关键词 | 推荐列 |
|-----------|--------|
| memory, 显存 | 优化方法、显存节省、硬件环境 |
| model, 模型 | 模型架构、参数量、训练数据 |
| attention, 注意力 | 注意力机制、时间复杂度、性能提升 |
| 其他 | 主要方法、实验数据集、性能指标 |

### 测试操作

1. 搜索后添加一个自定义列，观察单元格逐个提取
2. 右键点击列头 → 编辑定义，观察数据重新提取
3. 右键点击列头 → 删除列，观察列和数据移除
4. 点击 "Load more papers" 加载第二页，观察新论文回填已有列

### 查看API文档

访问 http://47.236.40.227:9992/docs 查看Swagger UI

---

## 项目结构

```
table-search/
├── backend/
│   ├── app/
│   │   ├── api/routes/
│   │   │   ├── search.py         # SSE搜索（Mock + Wispaper）
│   │   │   └── extract.py        # SSE提取（Mock + LLM）
│   │   ├── services/
│   │   │   ├── extraction.py     # MiniMax LLM抽取
│   │   │   └── paper_store.py    # Paper内存缓存
│   │   ├── mocks/
│   │   │   └── mock_data.py      # Mock数据（15篇论文）
│   │   ├── models/
│   │   │   └── schemas.py        # Pydantic数据模型
│   │   ├── core/
│   │   │   └── config.py         # 配置管理
│   │   └── main.py               # FastAPI主应用
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # 主页面
│   │   └── layout.tsx            # 布局
│   ├── components/
│   │   ├── SearchBar.tsx         # 搜索框
│   │   ├── MatrixTable.tsx       # 表格（桌面+移动）
│   │   ├── AddColumnButton.tsx   # 添加自定义列
│   │   ├── ColumnHeader.tsx      # 列头（编辑/删除）
│   │   └── LoadMoreButton.tsx    # 加载更多
│   ├── hooks/
│   │   └── useSearch.ts          # 搜索+提取编排
│   ├── stores/
│   │   └── useMatrixStore.ts     # Zustand状态
│   ├── lib/
│   │   ├── sse-client.ts         # SSE客户端
│   │   └── api.ts                # API工具
│   └── types/
│       └── index.ts              # TypeScript类型
│
├── docs/
│   └── API.md                    # API参考文档
│
└── scripts/                      # 启动脚本
```

---

## 故障排查

### 问题：后端启动失败

```bash
# 检查Python版本
python3 --version  # 需要 >= 3.11

# 检查端口占用
lsof -i :8000
```

### 问题：前端启动失败

```bash
# 检查Node版本
node --version  # 需要 >= 18

# 清除缓存
cd frontend
rm -rf .next node_modules
npm install
```

### 问题：SSE连接失败

1. 确认后端已启动（http://47.236.40.227:9992/health 返回200）
2. 检查浏览器控制台的网络请求
3. 确认CORS配置正确（`backend/.env` 中的 `CORS_ORIGINS`）

### 问题：真实API提取失败

1. 检查 `backend/.env` 中 `MINIMAX_API_KEY` 是否配置
2. 查看后端终端日志中的错误信息（认证失败 / 限流 / 网络问题）
3. 可先切回Mock模式验证前端功能：`USE_MOCK_EXTRACTION=true`

---

## Mock数据说明

### 论文数据

包含15篇AI论文，分2页：

**第1页（10篇）:**
1. Attention Is All You Need (2017)
2. BERT (2019)
3. GPT-3 (2020)
4. LLaMA (2023)
5. FlashAttention (2022)
6. LoRA (2021)
7. Scaling Laws (2020)
8. Constitutional AI (2022)
9. Chain-of-Thought (2022)
10. RetNet (2023)

**第2页（5篇）:**
11. Mamba (2023)
12. Mistral 7B (2023)
13. QLoRA (2023)
14. DPO (2023)
15. Mixture of Experts (2023)

### 单元格数据

- 预定义单元格：每篇论文 × 3个自动列均有对应数据
- 自定义列单元格：70%概率有数据，30%为N/A（基于确定性哈希）
- Mock提取延迟：0.15-0.6秒（模拟真实API延迟）

---

## 下一步开发

- **PDF查看器集成**（点击单元格查看原文高亮）
- **数据导出**（导出为CSV/Excel）
- **搜索历史 / 会话保存**
- **数据库持久化**（PostgreSQL）

详见 `PROJECT_STATUS.md`

---

**问题反馈**: 如有问题请查看 `docs/API.md` 或 `TECHNICAL_DESIGN.md`

**最后更新**: 2026-02-20
