<script setup lang="ts">
// Animated typing indicator shown while the assistant is responding
</script>

<template>
  <div class="typing-row">
    <div class="typing-avatar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a2 2 0 012 2v1a7 7 0 017 7v1a7 7 0 01-7 7v1a2 2 0 01-4 0v-1A7 7 0 015 13v-1A7 7 0 0110 5V4a2 2 0 012-2zm0 5a5 5 0 00-5 5v1a5 5 0 0010 0v-1a5 5 0 00-5-5zm-1 4a1 1 0 112 0v2a1 1 0 11-2 0v-2z"/>
      </svg>
    </div>
    <div class="typing-bubble">
      <span class="dot" />
      <span class="dot" />
      <span class="dot" />
    </div>
  </div>
</template>

<style scoped>
.typing-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.typing-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.typing-bubble {
  background: #f3f4f6;
  border-radius: 14px;
  border-bottom-left-radius: 4px;
  padding: 12px 16px;
  display: flex;
  gap: 5px;
  align-items: center;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #9ca3af;
  display: inline-block;
  animation: bounce 1.2s infinite ease-in-out;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}
</style>
