"""数据模型定义"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID


# ============ Paper相关模型 ============

class Paper(BaseModel):
    """论文模型"""
    id: str
    title: str
    authors: List[str]
    year: int
    abstract: str
    pdf_url: Optional[str] = None


class PaperBrief(BaseModel):
    """论文简要信息（用于列表）"""
    id: str
    title: str
    authors: List[str]
    year: int


# ============ Column相关模型 ============

class ColumnSuggestion(BaseModel):
    """自动生成的列建议"""
    id: str
    name: str
    prompt: str
    description: str


class Column(BaseModel):
    """列定义"""
    id: str
    name: str
    prompt: str
    column_type: str = "custom"  # 'auto' | 'custom'
    position: int


class ColumnCreate(BaseModel):
    """创建列的请求"""
    name: str
    prompt: str


# ============ Cell相关模型 ============

class Evidence(BaseModel):
    """证据信息"""
    text: str
    page: int
    bbox: Optional[List[float]] = None
    confidence: float = 1.0


class CellData(BaseModel):
    """单元格数据"""
    paper_id: str
    column_id: str
    value: Optional[str] = None
    status: str = "loading"  # 'loading' | 'completed' | 'error' | 'na'
    evidence: Optional[Evidence] = None


class CellUpdate(BaseModel):
    """单元格更新（SSE事件）"""
    paper_id: str
    column_id: str
    status: str
    value: Optional[str] = None
    evidence: Optional[Evidence] = None


# ============ Search相关模型 ============

class SearchRequest(BaseModel):
    """搜索请求"""
    query: str
    page: int = 1
    page_size: int = 20


class SearchResponse(BaseModel):
    """搜索响应"""
    session_id: str
    query: str
    papers: List[Paper]
    suggested_columns: List[ColumnSuggestion]
    total: int


class SearchStreamEvent(BaseModel):
    """搜索流式事件"""
    event_type: str  # 'paper' | 'column' | 'complete'
    data: Dict[str, Any]


# ============ Extract相关模型 ============

class ExtractRequest(BaseModel):
    """批量提取请求"""
    session_id: str
    paper_ids: List[str]
    column_ids: List[str]
    column_prompts: Dict[str, str] = {}  # column_id -> prompt text


class ExtractColumnRequest(BaseModel):
    """单列提取请求（新增列时）"""
    session_id: str
    column_id: str
    paper_ids: List[str]
    column_prompt: str = ""
