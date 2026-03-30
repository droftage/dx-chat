<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useChat } from '../composables/useChat'
import type { ChatConfig } from '../types'
import MessageBubble from './MessageBubble.vue'
import TypingIndicator from './TypingIndicator.vue'

const props = withDefaults(defineProps<ChatConfig>(), {
  apiUrl: '/api/chat',
  model: 'gpt-4o-mini',
  title: 'AI 助手',
  placeholder: '输入消息，按 Enter 发送…',
  stream: true,
  temperature: 0.7,
})

const emit = defineEmits<{
  (e: 'message-sent', content: string): void
  (e: 'message-received', content: string): void
}>()

const { messages, loading, error, sendMessage, clearMessages } = useChat({
  apiUrl: props.apiUrl,
  apiKey: props.apiKey,
  model: props.model,
  systemPrompt: props.systemPrompt,
  stream: props.stream,
  temperature: props.temperature,
  maxTokens: props.maxTokens,
})

const inputValue = ref('')
const messagesEl = ref<HTMLElement | null>(null)
const textareaEl = ref<HTMLTextAreaElement | null>(null)

async function handleSend() {
  const content = inputValue.value.trim()
  if (!content || loading.value) return
  inputValue.value = ''
  resizeTextarea()
  emit('message-sent', content)
  await sendMessage(content)
  const lastMsg = messages.value[messages.value.length - 1]
  if (lastMsg?.role === 'assistant') emit('message-received', lastMsg.content)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function resizeTextarea() {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function scrollToBottom() {
  const el = messagesEl.value
  if (el) el.scrollTop = el.scrollHeight
}

watch(
  () => messages.value.length,
  () => nextTick(scrollToBottom),
)

watch(
  () => messages.value.map((m) => m.content).join(''),
  () => nextTick(scrollToBottom),
)
</script>

<template>
  <div class="dx-chat">
    <!-- Header -->
    <div class="dx-chat__header">
      <span class="dx-chat__title">{{ title }}</span>
      <button
        class="dx-chat__clear"
        title="清空对话"
        :disabled="loading || messages.length === 0"
        @click="clearMessages"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      </button>
    </div>

    <!-- Messages -->
    <div ref="messagesEl" class="dx-chat__messages">
      <div v-if="messages.length === 0" class="dx-chat__empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        <p>有什么可以帮助你的？</p>
      </div>

      <MessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
      />

      <TypingIndicator v-if="loading" />

      <div v-if="error" class="dx-chat__error">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {{ error }}
      </div>
    </div>

    <!-- Input -->
    <div class="dx-chat__input-area">
      <textarea
        ref="textareaEl"
        v-model="inputValue"
        class="dx-chat__input"
        :placeholder="placeholder"
        :disabled="loading"
        rows="1"
        @keydown="handleKeydown"
        @input="resizeTextarea"
      />
      <button
        class="dx-chat__send"
        :disabled="loading || !inputValue.trim()"
        title="发送"
        @click="handleSend"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.dx-chat {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ── Header ── */
.dx-chat__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  flex-shrink: 0;
}

.dx-chat__title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.dx-chat__clear {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: color 0.2s, background 0.2s;
}

.dx-chat__clear:hover:not(:disabled) {
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
}

.dx-chat__clear:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Messages ── */
.dx-chat__messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-behavior: smooth;
}

.dx-chat__messages::-webkit-scrollbar {
  width: 4px;
}
.dx-chat__messages::-webkit-scrollbar-track {
  background: transparent;
}
.dx-chat__messages::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.dx-chat__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  gap: 12px;
  user-select: none;
}

.dx-chat__empty p {
  font-size: 15px;
  margin: 0;
}

.dx-chat__error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 8px;
  font-size: 13px;
  align-self: center;
  max-width: 90%;
}

/* ── Input area ── */
.dx-chat__input-area {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
  flex-shrink: 0;
}

.dx-chat__input {
  flex: 1;
  resize: none;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 15px;
  line-height: 1.5;
  background: #fff;
  color: #111827;
  outline: none;
  transition: border-color 0.2s;
  max-height: 160px;
  overflow-y: auto;
}

.dx-chat__input:focus {
  border-color: #667eea;
}

.dx-chat__input:disabled {
  background: #f9fafb;
  color: #9ca3af;
}

.dx-chat__send {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s, transform 0.1s;
}

.dx-chat__send:hover:not(:disabled) {
  opacity: 0.9;
  transform: scale(1.04);
}

.dx-chat__send:active:not(:disabled) {
  transform: scale(0.96);
}

.dx-chat__send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Mobile ── */
@media (max-width: 600px) {
  .dx-chat {
    border-radius: 0;
    box-shadow: none;
  }

  .dx-chat__header {
    padding: 12px 16px;
  }

  .dx-chat__messages {
    padding: 12px;
    gap: 10px;
  }

  .dx-chat__input-area {
    padding: 10px 12px;
  }

  .dx-chat__input {
    font-size: 16px; /* prevent iOS zoom */
  }
}
</style>
