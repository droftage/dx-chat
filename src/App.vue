<script setup lang="ts">
import DxChat from './components/DxChat.vue'
</script>

<template>
  <div class="app">
    <DxChat
      title="AI 助手"
      placeholder="输入消息，按 Enter 发送…"
      api-url="/api/chat"
      model="gpt-4o-mini"
      :stream="true"
    />
  </div>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  background: #f0f2f5;
}

#app {
  height: 100%;
}

.app {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

/* On desktop, constrain width */
@media (min-width: 601px) {
  .app {
    padding: 24px;
  }

  .app > * {
    width: 100%;
    max-width: 760px;
    height: 680px;
  }
}

/* On mobile, fill full screen */
@media (max-width: 600px) {
  .app {
    padding: 0;
    align-items: stretch;
  }

  .app > * {
    width: 100%;
    height: 100%;
  }
}
</style>
