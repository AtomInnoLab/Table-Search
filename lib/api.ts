/**
 * API utility functions
 */

const API_BASE_URL = '/agents/lit-matrix/api/v1'

export function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

export const searchApi = {
  stream: () => getApiUrl('/search/stream'),
  onboarding: () => getApiUrl('/search/onboarding/stream'),
  rest: () => getApiUrl('/search'),
}

export const extractApi = {
  batch: () => getApiUrl('/extract/batch'),
  column: () => getApiUrl('/extract/column'),
}

export const paperApi = {
  restore: () => getApiUrl('/papers/restore'),
}

export const quotaApi = {
  benefit: () => getApiUrl('/order/benefit'),
}
