-- 初始化数据库Schema

-- 搜索会话表
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 论文表
CREATE TABLE IF NOT EXISTS papers (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    authors JSONB,
    year INTEGER,
    abstract TEXT,
    pdf_url TEXT,
    pdf_stored_path TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 会话-论文关联表
CREATE TABLE IF NOT EXISTS session_papers (
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    paper_id VARCHAR(255) REFERENCES papers(id),
    rank INTEGER,
    PRIMARY KEY (session_id, paper_id)
);

-- 列定义表
CREATE TABLE IF NOT EXISTS columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    column_type VARCHAR(50),
    position INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 单元格数据表
CREATE TABLE IF NOT EXISTS cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    paper_id VARCHAR(255) REFERENCES papers(id),
    column_id UUID REFERENCES columns(id) ON DELETE CASCADE,
    value TEXT,
    status VARCHAR(50),
    evidence JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(session_id, paper_id, column_id)
);

-- PDF解析缓存表
CREATE TABLE IF NOT EXISTS pdf_cache (
    paper_id VARCHAR(255) PRIMARY KEY REFERENCES papers(id),
    full_text TEXT,
    text_blocks JSONB,
    parsed_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_session_papers_session ON session_papers(session_id);
CREATE INDEX IF NOT EXISTS idx_columns_session ON columns(session_id);
CREATE INDEX IF NOT EXISTS idx_cells_session ON cells(session_id);
CREATE INDEX IF NOT EXISTS idx_cells_paper_column ON cells(paper_id, column_id);

-- 插入测试数据（用于开发）
-- 这些数据会在真实API可用时被替换
