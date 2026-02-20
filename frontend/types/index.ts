/**
 * 前端类型定义
 */

// ============ Paper相关类型 ============

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  abstract: string;
  pdf_url?: string;
}

// ============ Column相关类型 ============

export interface Column {
  id: string;
  name: string;
  prompt: string;
  column_type: 'fixed' | 'auto' | 'custom';
  position: number;
}

export interface ColumnSuggestion {
  id: string;
  name: string;
  prompt: string;
  description: string;
}

// ============ Cell相关类型 ============

export interface Evidence {
  text: string;
  page: number;
  bbox?: number[];
  confidence: number;
}

export interface CellData {
  paper_id: string;
  column_id: string;
  value?: string;
  status: 'loading' | 'completed' | 'error' | 'na';
  evidence?: Evidence;
}

// ============ 表格相关类型 ============

export interface TableRow extends Paper {
  // 动态单元格数据通过getCellData获取
}

// ============ SSE事件类型 ============

export interface SSEEvent {
  event: string;
  data: any;
}

// ============ API请求/响应类型 ============

export interface SearchRequest {
  query: string;
  page?: number;
  page_size?: number;
}

export interface ExtractBatchRequest {
  session_id: string;
  paper_ids: string[];
  column_ids: string[];
}

export interface ExtractColumnRequest {
  session_id: string;
  column_id: string;
  paper_ids: string[];
}
