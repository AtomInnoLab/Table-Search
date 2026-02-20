# 项目状态报告
**Dynamic Literature Matrix**

更新时间: 2026-02-20
版本: v0.2.0

---

## ✅ 已完成功能

### 后端 (FastAPI)
- [x] 项目结构初始化
- [x] Mock SSE搜索接口
  - 流式返回论文数据（15篇预置AI论文，分2页）
  - 自动生成推荐列（基于查询关键词匹配4组策略）
  - 支持分页
- [x] Mock SSE信息抽取接口
  - 批量提取（多论文×多列）
  - 单列提取（新增列时）
  - 流式返回单元格数据
- [x] Wispaper 真实搜索API集成
  - 代理Wispaper SSE事件并转换为内部格式
  - 从 `verification onAgentEnd` 事件提取论文元数据
  - 从 `search_verify_agent` 事件提取推荐列（criteria）
  - 超时与错误处理
- [x] MiniMax LLM 真实抽取服务
  - OpenAI兼容接口（AsyncOpenAI客户端）
  - System + User Prompt 结构化提取
  - JSON响应解析（含markdown fence剥离）
  - 认证失败、限流、网络错误分类处理
  - 并发控制（Semaphore，默认5并发）
- [x] Paper内存缓存（搜索结果供抽取复用）
- [x] Mock / 真实模式可配置切换（`USE_MOCK_SEARCH` / `USE_MOCK_EXTRACTION`）
- [x] 数据模型定义（Pydantic）
- [x] CORS配置
- [x] 健康检查端点（`/` 和 `/health`）
- [x] 自动API文档（Swagger UI）

### 前端 (Next.js + React)
- [x] 项目结构初始化（App Router）
- [x] Tailwind CSS配置
- [x] TypeScript类型定义
- [x] Zustand状态管理
  - 搜索会话管理
  - 表格数据管理（论文、列、单元格）
  - 分页状态（currentPage / hasMore）
- [x] SSE客户端工具（POST方式，支持跨chunk事件解析）
- [x] useSearch Hook（搜索 + 提取 + 加载更多编排）
  - 新搜索自动中止旧SSE连接
  - 搜索完成后自动触发批量提取
  - 加载更多后自动回填已有列
- [x] SearchBar组件
  - 搜索输入 + 快捷标签
  - SSE流式请求
  - 加载状态
- [x] MatrixTable组件
  - TanStack Table集成
  - 固定列（标题、年份、作者）+ sticky定位
  - 动态列（自动生成 + 自定义）
  - 单元格状态渲染（Loading动画/完成/N/A/错误）
  - 提取进度指示
- [x] AddColumnButton组件（用户手动添加自定义列）
- [x] ColumnHeader组件
  - 右键菜单（编辑定义 / 删除列）
  - 编辑后自动清除旧数据并重新提取
  - AUTO / CUSTOM 标签区分
- [x] LoadMoreButton组件（分页加载更多论文）
- [x] 响应式设计
  - 桌面端：横向滚动表格 + 固定列阴影
  - 移动端：可展开卡片视图

---

## 📂 项目结构

```
table-search/
├── backend/                    # FastAPI后端
│   ├── app/
│   │   ├── api/routes/
│   │   │   ├── search.py      ✅ SSE搜索（Mock + Wispaper）
│   │   │   └── extract.py     ✅ SSE提取（Mock + LLM）
│   │   ├── services/
│   │   │   ├── extraction.py  ✅ MiniMax LLM抽取服务
│   │   │   └── paper_store.py ✅ Paper内存缓存
│   │   ├── mocks/
│   │   │   └── mock_data.py   ✅ Mock数据（15篇论文）
│   │   ├── models/
│   │   │   └── schemas.py     ✅ Pydantic数据模型
│   │   ├── core/
│   │   │   └── config.py      ✅ 配置管理（环境变量）
│   │   └── main.py            ✅ FastAPI主应用
│   ├── requirements.txt       ✅
│   └── .env                   ✅
│
├── frontend/                   # Next.js前端
│   ├── app/
│   │   ├── page.tsx           ✅ 主页面
│   │   ├── layout.tsx         ✅ 布局
│   │   └── globals.css        ✅ 全局样式
│   ├── components/
│   │   ├── SearchBar.tsx      ✅ 搜索框
│   │   ├── MatrixTable.tsx    ✅ 表格（桌面+移动）
│   │   ├── AddColumnButton.tsx ✅ 添加自定义列
│   │   ├── ColumnHeader.tsx   ✅ 列头（编辑/删除菜单）
│   │   └── LoadMoreButton.tsx ✅ 加载更多
│   ├── hooks/
│   │   └── useSearch.ts       ✅ 搜索+提取编排Hook
│   ├── stores/
│   │   └── useMatrixStore.ts  ✅ Zustand状态
│   ├── lib/
│   │   ├── sse-client.ts      ✅ SSE客户端
│   │   └── api.ts             ✅ API工具
│   ├── types/
│   │   └── index.ts           ✅ TypeScript类型
│   ├── package.json           ✅
│   ├── tsconfig.json          ✅
│   └── tailwind.config.js     ✅
│
├── docs/
│   └── API.md                 ✅ API参考文档
│
├── scripts/
│   ├── start-backend.sh       ✅ 后端启动脚本
│   ├── start-frontend.sh      ✅ 前端启动脚本
│   └── init-db.sql            ✅ 数据库初始化
│
├── docker-compose.yml         ✅ 开发环境（PostgreSQL/Redis/MinIO）
├── README.md                  ✅ 项目说明
├── QUICKSTART.md              ✅ 快速启动指南
├── TECHNICAL_DESIGN.md        ✅ 技术方案设计
├── TECH_DECISIONS.md          ✅ 技术决策记录
└── GETTING_STARTED.md         ✅ 详细开发指南
```

---

## 🚀 快速启动

### 方式一：使用脚本（推荐）
```bash
# 终端1：启动后端
./scripts/start-backend.sh

# 终端2：启动前端
./scripts/start-frontend.sh

# 访问 http://localhost:3000
```

### 方式二：手动启动
参见 `QUICKSTART.md`

---

## 🎯 核心功能演示

### 1. 搜索流程
```
用户输入 "LLM memory optimization"
    ↓
SSE流式接收：
  → Session ID
  → 论文1, 论文2, ...（逐条显示）
  → 推荐列: 优化方法、显存节省、硬件环境
    ↓
自动触发信息提取
    ↓
单元格逐个填充（Loading → 完成/N/A）
```

### 2. 自定义列
```
点击表格右上角 "+" 按钮
    ↓
输入提取指令（如 "training dataset"）
    ↓
新列添加到表格最右侧
    ↓
自动提取所有论文的对应信息
```

### 3. 列管理
```
右键列头 → 弹出菜单
  → 编辑定义：修改Prompt后自动重新提取
  → 删除列：移除列及对应单元格数据
```

### 4. 加载更多
```
点击 "Load more papers"
    ↓
加载第二页论文（追加到表格底部）
    ↓
自动回填：新论文 × 所有已有列
```

### 5. Mock数据

**论文库（15篇，分2页）:**

第1页：
1. Attention Is All You Need
2. BERT
3. GPT-3
4. LLaMA
5. FlashAttention
6. LoRA
7. Scaling Laws
8. Constitutional AI
9. Chain-of-Thought
10. RetNet

第2页：
11. Mamba
12. Mistral 7B
13. QLoRA
14. DPO
15. Mixture of Experts

**推荐列策略:**
| 关键词 | 推荐列 |
|--------|--------|
| memory/显存 | 优化方法、显存节省、硬件环境 |
| model/模型 | 模型架构、参数量、训练数据 |
| attention/注意力 | 注意力机制、时间复杂度、性能提升 |
| 其他 | 主要方法、实验数据集、性能指标 |

---

## 📊 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js | 14.1.0 |
| UI库 | React | 18.2.0 |
| 语言 | TypeScript | 5.x |
| 表格 | TanStack Table | 8.11.0 |
| 状态管理 | Zustand | 4.5.0 |
| 样式 | Tailwind CSS | 3.4.0 |
| 后端框架 | FastAPI | 0.109.0 |
| Python | Python | 3.11+ |
| LLM API | MiniMax (OpenAI兼容) | M2.5 |
| 搜索API | Wispaper | - |
| HTTP客户端 | httpx | 0.26.0 |

---

## ⏳ 未完成功能（后续开发）

### 高优先级
- [ ] PDF查看器集成（点击单元格查看原文高亮）
- [ ] 单元格点击查看Evidence详情
- [ ] 数据导出（CSV/Excel）

### 中优先级
- [ ] 搜索历史
- [ ] 会话保存/加载
- [ ] 列排序、筛选
- [ ] 虚拟滚动（大量论文性能优化）

### 低优先级
- [ ] 用户认证
- [ ] 团队协作
- [ ] PostgreSQL数据库持久化
- [ ] 生产部署（Docker镜像 + CI/CD）

---

## 🐛 已知问题

1. **虚拟环境创建失败**
   - 原因：系统缺少python3-venv包
   - 临时方案：可直接使用系统Python运行
   - 解决方案：`sudo apt install python3-venv`

2. **Paper缓存为内存级别**
   - 当前使用模块级dict缓存论文数据
   - 服务重启后缓存丢失
   - 新搜索会清除旧缓存，多会话不共存

3. **REST搜索接口仅支持Mock**
   - `POST /search`（非流式）始终使用Mock数据
   - 真实搜索仅通过 `POST /search/stream` 可用

---

## 📈 下一步建议

### 短期计划
1. **PDF查看器**: 集成React-PDF，点击Evidence跳转到对应页面
2. **数据导出**: 将表格导出为CSV/Excel
3. **Evidence面板**: 点击单元格展开侧边栏显示原文证据

### 中期计划
1. **数据库持久化**: 使用PostgreSQL存储会话、论文、列、单元格
2. **搜索历史**: 保存和回顾历史搜索
3. **性能优化**: 虚拟滚动处理大量论文

### 长期计划
1. **用户认证与多用户支持**
2. **团队协作（共享Matrix）**
3. **生产部署与CI/CD**

---

## 💡 亮点与创新

1. **流式体验**: SSE实现数据流式加载，论文和单元格逐个展现
2. **自动列生成**: 根据查询意图自动推荐信息维度
3. **自定义列**: 用户可添加、编辑、删除提取列，实时触发重新提取
4. **双模式后端**: Mock和真实API可通过环境变量无缝切换
5. **响应式设计**: 桌面表格视图 + 移动端卡片视图自适应
6. **代码质量**:
   - TypeScript类型安全
   - 模块化设计（Hook编排、组件拆分）
   - Mock与真实API解耦

---

## 📞 支持

- **API文档**: 查看 `docs/API.md`
- **快速启动**: 查看 `QUICKSTART.md`
- **详细文档**: 查看 `GETTING_STARTED.md`
- **技术方案**: 查看 `TECHNICAL_DESIGN.md`
- **决策理由**: 查看 `TECH_DECISIONS.md`

---

**项目状态**: ✅ 核心功能完成，Mock与真实API均可运行
**下一步**: PDF查看器 → 数据导出 → 数据库持久化

更新于: 2026-02-20
