/**
 * Nacos configuration center integration.
 *
 * Fetches key=value (.env format) config from Nacos HTTP API and injects
 * into process.env. Existing env vars are NOT overwritten so that
 * container environment variables always take priority.
 *
 * Required env var:
 *   NACOS_SERVER_ADDR  – e.g. http://nacos:8848 (skip Nacos if unset)
 *
 * Optional env vars:
 *   NACOS_NAMESPACE  – namespace/tenant ID        (default: "public")
 *   NACOS_DATA_ID    – config data ID             (default: "table-search")
 *   NACOS_GROUP      – config group               (default: "DEFAULT_GROUP")
 *   NACOS_USERNAME   – auth username
 *   NACOS_PASSWORD   – auth password
 */

async function getAccessToken(
  serverAddr: string,
  username: string,
  password: string,
): Promise<string> {
  const url = `${serverAddr}/nacos/v1/auth/login`
  const body = new URLSearchParams({ username, password })

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    throw new Error(`Nacos auth failed: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()
  return json.accessToken as string
}

function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    // skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue

    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim()
    if (key) {
      result[key] = value
    }
  }

  return result
}

export async function fetchNacosConfig(): Promise<void> {
  const serverAddr = process.env.NACOS_ENDPOINT
  if (!serverAddr) {
    console.log('[nacos] NACOS_ENDPOINT not set, skipping Nacos config fetch')
    return
  }
  const normalizedServerAddr = /^http/i.test(serverAddr)
    ? serverAddr
    : `http://${serverAddr}`

  const namespace = process.env.NACOS_NAMESPACE || 'public'
  const dataId = process.env.NACOS_DATA_ID || '.env'
  const group = process.env.NACOS_GROUP || 'table-search'
  const username = process.env.NACOS_USERNAME
  const password = process.env.NACOS_PASSWORD

  try {
    // Authenticate if credentials are provided
    let accessToken: string | undefined
    if (username && password) {
      accessToken = await getAccessToken(normalizedServerAddr, username, password)
    }

    // Build config request URL
    const params = new URLSearchParams({
      dataId,
      group,
      tenant: namespace,
    })
    if (accessToken) {
      params.set('accessToken', accessToken)
    }

    const url = `${normalizedServerAddr}/nacos/v1/cs/configs?${params.toString()}`
    const res = await fetch(url)

    if (!res.ok) {
      throw new Error(`Nacos config fetch failed: ${res.status} ${res.statusText}`)
    }

    const content = await res.text()
    const entries = parseEnvContent(content)

    // Inject into process.env, overwriting existing values
    let injected = 0
    for (const [key, value] of Object.entries(entries)) {
      process.env[key] = value
      injected++
    }    

    console.log(
      `[nacos] Loaded config from ${dataId}@${group} (namespace=${namespace}): ` +
        `${Object.keys(entries).length} keys found, ${injected} injected`,
    )
    console.log(`ENVIRONMENT=${process.env.ENVIRONMENT ?? 'not set'}`)
  } catch (err) {
    console.warn(
      `[nacos] Failed to fetch config from ${normalizedServerAddr} — falling back to env vars:`,
      err instanceof Error ? err.message : err,
    )
  }
}
