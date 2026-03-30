export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: number
}

export interface ChatConfig {
  /** API endpoint URL for the chat completions */
  apiUrl?: string
  /** API key (Bearer token) */
  apiKey?: string
  /** Model name, e.g. 'gpt-4o', 'deepseek-chat' */
  model?: string
  /** System prompt shown to the model at the start */
  systemPrompt?: string
  /** Placeholder text for the input field */
  placeholder?: string
  /** Chat window title */
  title?: string
  /** Whether to stream the response token by token */
  stream?: boolean
  /** Max tokens per response */
  maxTokens?: number
  /** Temperature (0-2) */
  temperature?: number
}
