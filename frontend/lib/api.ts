/**
 * API 工具函数
 */

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
).replace(/\/+$/, '')

export function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

export const searchApi = {
  stream: () => getApiUrl('/search/stream'),
  rest: () => getApiUrl('/search'),
}

export const extractApi = {
  batch: () => getApiUrl('/extract/batch'),
  column: () => getApiUrl('/extract/column'),
}

export const paperApi = {
  restore: () => getApiUrl('/papers/restore'),
}
