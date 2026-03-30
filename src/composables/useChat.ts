import { ref, readonly } from 'vue'
import type { Message, MessageRole, ChatConfig } from '../types'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useChat(config: ChatConfig = {}) {
  const messages = ref<Message[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  function addMessage(role: MessageRole, content: string): Message {
    const msg: Message = { id: generateId(), role, content, createdAt: Date.now() }
    messages.value.push(msg)
    return msg
  }

  function clearMessages() {
    messages.value = []
    error.value = null
  }

  async function sendMessage(userContent: string): Promise<void> {
    if (!userContent.trim() || loading.value) return

    error.value = null
    addMessage('user', userContent.trim())

    const apiUrl = config.apiUrl || '/api/chat'
    const model = config.model || 'gpt-4o-mini'
    const stream = config.stream !== false

    const systemMessages = config.systemPrompt
      ? [{ role: 'system' as MessageRole, content: config.systemPrompt }]
      : []

    const history = messages.value.map((m) => ({ role: m.role, content: m.content }))

    const body: Record<string, unknown> = {
      model,
      messages: [...systemMessages, ...history],
      stream,
      temperature: config.temperature ?? 0.7,
    }
    if (config.maxTokens) body.max_tokens = config.maxTokens

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`

    loading.value = true

    // placeholder for streaming assistant message
    const assistantMsg = addMessage('assistant', '')

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Request failed ${response.status}: ${text}`)
      }

      if (stream && response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed === 'data: [DONE]') continue
            if (!trimmed.startsWith('data: ')) continue

            try {
              const json = JSON.parse(trimmed.slice(6))
              const delta = json?.choices?.[0]?.delta?.content
              if (delta) {
                const idx = messages.value.findIndex((m) => m.id === assistantMsg.id)
                if (idx !== -1) messages.value[idx].content += delta
              }
            } catch {
              // skip malformed SSE chunk
            }
          }
        }
      } else {
        const json = await response.json()
        const content = json?.choices?.[0]?.message?.content ?? ''
        const idx = messages.value.findIndex((m) => m.id === assistantMsg.id)
        if (idx !== -1) messages.value[idx].content = content
      }
    } catch (err) {
      // Remove empty placeholder on error
      const idx = messages.value.findIndex((m) => m.id === assistantMsg.id)
      if (idx !== -1) messages.value.splice(idx, 1)

      const errMsg = err instanceof Error ? err.message : String(err)
      error.value = errMsg
    } finally {
      loading.value = false
    }
  }

  return {
    messages: readonly(messages),
    loading: readonly(loading),
    error: readonly(error),
    sendMessage,
    addMessage,
    clearMessages,
  }
}
