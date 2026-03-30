<script setup lang="ts">
import type { Message } from '../types'

const props = defineProps<{ message: Message }>()

const isUser = props.message.role === 'user'
</script>

<template>
  <div :class="['bubble-row', isUser ? 'bubble-row--user' : 'bubble-row--assistant']">
    <div v-if="!isUser" class="bubble-avatar bubble-avatar--assistant">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a2 2 0 012 2v1a7 7 0 017 7v1a7 7 0 01-7 7v1a2 2 0 01-4 0v-1A7 7 0 015 13v-1A7 7 0 0110 5V4a2 2 0 012-2zm0 5a5 5 0 00-5 5v1a5 5 0 0010 0v-1a5 5 0 00-5-5zm-1 4a1 1 0 112 0v2a1 1 0 11-2 0v-2z"/>
      </svg>
    </div>

    <div :class="['bubble', isUser ? 'bubble--user' : 'bubble--assistant']">
      <span class="bubble__text" v-text="message.content || '…'" />
    </div>

    <div v-if="isUser" class="bubble-avatar bubble-avatar--user">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z"/>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.bubble-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 100%;
}

.bubble-row--user {
  flex-direction: row-reverse;
}

.bubble-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bubble-avatar--assistant {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.bubble-avatar--user {
  background: #e5e7eb;
  color: #374151;
}

.bubble {
  max-width: calc(100% - 80px);
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
}

.bubble--user {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.bubble--assistant {
  background: #f3f4f6;
  color: #111827;
  border-bottom-left-radius: 4px;
}

.bubble__text {
  display: block;
}

@media (max-width: 600px) {
  .bubble {
    max-width: calc(100% - 52px);
    font-size: 14px;
  }

  .bubble-avatar {
    width: 28px;
    height: 28px;
  }
}
</style>
