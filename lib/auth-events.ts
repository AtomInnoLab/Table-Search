export const AUTH_REQUIRED_EVENT = 'auth-required'

const AUTH_EVENT_DEDUPE_MS = 1500
let lastAuthEventAt = 0

export function emitAuthRequired() {
  if (typeof window === 'undefined') return
  const now = Date.now()
  if (now - lastAuthEventAt < AUTH_EVENT_DEDUPE_MS) return
  lastAuthEventAt = now
  window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT))
}

export function isAuthErrorMessage(message: string): boolean {
  const text = message.toLowerCase()
  return (
    text.includes('401') ||
    text.includes('unauthorized') ||
    text.includes('auth token not found in header') ||
    text.includes('token not found')
  )
}
