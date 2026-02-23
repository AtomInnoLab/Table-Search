/**
 * SSE (Server-Sent Events) 客户端工具
 */

export interface SSEOptions {
  onMessage?: (event: string, data: any) => void
  onError?: (error: Error) => void
  onComplete?: (data?: any) => void
}

export class SSEClient {
  private controller: AbortController | null = null

  /**
   * 发起GET SSE请求
   */
  async connect(url: string, options: SSEOptions = {}) {
    return this._run(
      () =>
        fetch(url, {
          method: 'GET',
          headers: { Accept: 'text/event-stream', 'Cache-Control': 'no-cache' },
          signal: this.controller!.signal,
        }),
      options,
    )
  }

  /**
   * 发起POST SSE请求
   */
  async connectPost(url: string, body: any, options: SSEOptions = {}) {
    return this._run(
      () =>
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify(body),
          signal: this.controller!.signal,
        }),
      options,
    )
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.controller) {
      this.controller.abort()
      this.controller = null
    }
  }

  // ========== 内部方法 ==========

  private async _run(
    doFetch: () => Promise<Response>,
    options: SSEOptions,
  ) {
    this.controller = new AbortController()

    try {
      const response = await doFetch()

      if (!response.ok) {
        throw new Error(`SSE request failed: ${response.status}`)
      }
      if (!response.body) {
        throw new Error('Response body is null')
      }

      await this._readStream(response.body, options)
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        options.onError?.(error)
      }
    }
  }

  private async _readStream(body: ReadableStream<Uint8Array>, options: SSEOptions) {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    // 关键修复：event / data 状态放在循环外部，跨 chunk 保持
    let currentEvent = 'message'
    let currentData = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          // 流结束，处理 buffer 中剩余的完整消息
          // 追加空行确保最后一条 SSE 消息被派发
          if (buffer.trim()) {
            const lines = (buffer + '\n').split('\n')
            this._processLines(lines, currentEvent, currentData, options)
          }
          break
        }

        buffer += decoder.decode(value, { stream: true })

        // 按行拆分，最后一个不完整行留在 buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        // 处理每一行
        const result = this._processLines(lines, currentEvent, currentData, options)
        currentEvent = result.event
        currentData = result.data
      }
    } finally {
      reader.releaseLock()
    }
  }

  private _processLines(
    lines: string[],
    currentEvent: string,
    currentData: string,
    options: SSEOptions,
  ): { event: string; data: string } {
    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        // SSE规范：多行data应拼接（用换行分隔）
        const payload = line.slice(5).trim()
        currentData = currentData ? currentData + '\n' + payload : payload
      } else if (line === '' || line === '\r') {
        // 空行 = 消息边界，派发事件
        if (currentData) {
          try {
            const parsed = JSON.parse(currentData)
            options.onMessage?.(currentEvent, parsed)

            if (currentEvent === 'complete') {
              options.onComplete?.(parsed)
            }
          } catch {
            console.error('Failed to parse SSE data:', currentData)
          }
        }
        // 重置，准备下一条消息
        currentEvent = 'message'
        currentData = ''
      }
    }

    return { event: currentEvent, data: currentData }
  }
}
