/**
 * Visitor 角色认证工具（纯客户端）
 *
 * 从 localStorage 读取 wis_visitor，提取 api_key，
 * 通过 Authorization header 发送给后端。
 */

export function getVisitorKey(): string | null {
  try {
    const raw = localStorage.getItem('wis_visitor')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.value?.api_key || null
  } catch {
    return null
  }
}

export function getVisitorHeaders(): Record<string, string> {
  const key = getVisitorKey()
  if (key) console.log('[visitor] key found:', key.slice(0, 8) + '...')
  return key ? { Authorization: key } : {}
}
