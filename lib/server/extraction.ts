/**
 * LLM-based extraction service using MiniMax / OpenAI-compatible API
 * (replaces backend/app/services/extraction.py)
 */
import OpenAI from 'openai'
import { config } from './config'

const SYSTEM_PROMPT = [
  'You are an academic paper analyst. Given a paper\'s metadata, ',
  'extract the requested information.\n\n',
  'Rules:\n',
  '1. Respond ONLY with a single JSON object, nothing else.\n',
  '2. Do NOT include any explanation, reasoning, or thinking.\n',
  '3. Format: {"value": "concise answer", "evidence": "quote from abstract"}\n',
  '4. If not available: {"value": null, "evidence": null}\n',
  '5. Use your knowledge about well-known papers to supplement the abstract.',
].join('')

function buildUserPrompt(
  paperData: Record<string, unknown>,
  columnPrompt: string,
): string {
  const title = (paperData.title as string) || 'Unknown'
  const year = (paperData.year as string | number) || 'Unknown'
  const rawAuthors = paperData.authors
  let authorsStr: string
  if (Array.isArray(rawAuthors)) {
    authorsStr = rawAuthors.join(', ')
  } else {
    authorsStr = String(rawAuthors || '')
  }
  const abstract =
    (paperData.abstract as string) || 'No abstract available.'

  return (
    `Paper: ${title} (${year})\n` +
    `Authors: ${authorsStr}\n` +
    `Abstract: ${abstract}\n\n` +
    `Extract: ${columnPrompt}`
  )
}

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: config.MINIMAX_API_KEY,
      baseURL: config.MINIMAX_BASE_URL,
    })
  }
  return client
}

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExtractionError'
  }
}

function repairTruncatedJson(
  raw: string,
): { value: string; evidence: string } | null {
  const valueMatch = raw.match(/"value"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (valueMatch) {
    const value = valueMatch[1]
    const evidenceMatch = raw.match(
      /"evidence"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    )
    const evidence = evidenceMatch ? evidenceMatch[1] : ''
    return { value, evidence }
  }
  return null
}

function parseLlmContent(
  content: string | null | undefined,
): { value: string; evidence_text: string } | null {
  if (!content) return null

  let cleaned = content.trim()

  // Strip <think>...</think> blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

  // Strip markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.split('\n').slice(1).join('\n')
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3)
    }
    cleaned = cleaned.trim()
  }

  if (!cleaned) return null

  let result: Record<string, unknown>
  try {
    result = JSON.parse(cleaned)
  } catch {
    const repaired = repairTruncatedJson(cleaned)
    if (!repaired) return null
    result = repaired
  }

  if (result.value == null) return null

  return {
    value: String(result.value),
    evidence_text: (result.evidence as string) || '',
  }
}

export async function extractCellWithLlm(
  paperData: Record<string, unknown>,
  columnPrompt: string,
): Promise<{ value: string; evidence_text: string } | null> {
  const llm = getClient()
  const userPrompt = buildUserPrompt(paperData, columnPrompt)

  let response: OpenAI.Chat.Completions.ChatCompletion
  try {
    response = await llm.chat.completions.create({
      model: config.MINIMAX_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    })
  } catch (err: unknown) {
    if (err instanceof OpenAI.AuthenticationError) {
      throw new ExtractionError('LLM API key invalid or expired')
    }
    if (err instanceof OpenAI.RateLimitError) {
      throw new ExtractionError(
        'LLM API rate limit exceeded, please retry later',
      )
    }
    if (err instanceof OpenAI.APIConnectionError) {
      throw new ExtractionError('Cannot connect to LLM API')
    }
    throw new ExtractionError(`LLM API error: ${err}`)
  }

  return parseLlmContent(response.choices[0]?.message?.content)
}
