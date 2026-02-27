/**
 * Server-side configuration (replaces backend/app/core/config.py)
 *
 * Reads env vars lazily via getters so runtime env vars are respected
 * (not baked in at build time).
 */

function envBool(key: string, defaultVal: boolean): boolean {
  const v = process.env[key]
  if (v === undefined) return defaultVal
  return v === 'true' || v === '1'
}

export const config = {
  get USE_MOCK_SEARCH() {
    return envBool('USE_MOCK_SEARCH', true)
  },
  get USE_MOCK_EXTRACTION() {
    return envBool('USE_MOCK_EXTRACTION', true)
  },
  get WISPAPER_API_URL() {
    return (
      process.env.WISPAPER_API_URL ||
      'https://gateway.dev.wispaper.ai/api/v1/search/completions'
    )
  },
  get MINIMAX_API_KEY() {
    return process.env.MINIMAX_API_KEY || ''
  },
  get MINIMAX_BASE_URL() {
    return process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1'
  },
  get MINIMAX_MODEL() {
    return process.env.MINIMAX_MODEL || 'MiniMax-M2.5'
  },
  get EXTRACTION_CONCURRENCY() {
    return parseInt(process.env.EXTRACTION_CONCURRENCY || '10', 10)
  },
}
