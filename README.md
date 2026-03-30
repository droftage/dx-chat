# dx-chat

一个支持 PC 与手机访问的 AI 对话组件，基于 Vue 3 + TypeScript + Vite 构建。

## 特性

- 💬 AI 流式对话（Server-Sent Events / SSE）
- 📱 响应式布局，完美适配桌面端与移动端
- ⌨️ 自动伸缩输入框，支持 Enter 发送 / Shift+Enter 换行
- 🎨 内置渐变色主题，UI 简洁现代
- 🧩 高可配置：API 地址、模型、系统提示、温度等均可通过 Props 传入
- 🛠️ 同时暴露 `useChat` composable，方便二次集成

## 快速开始

```bash
npm install
npm run dev
```

## 使用示例

```vue
<template>
  <DxChat
    title="AI 助手"
    api-url="https://api.openai.com/v1/chat/completions"
    api-key="sk-..."
    model="gpt-4o-mini"
    system-prompt="你是一个友善的 AI 助手。"
    :stream="true"
    :temperature="0.7"
    placeholder="输入消息，按 Enter 发送…"
  />
</template>

<script setup lang="ts">
import { DxChat } from './src/index'
</script>
```

## Props

| Prop           | 类型      | 默认值              | 说明                              |
| -------------- | --------- | ------------------- | --------------------------------- |
| `apiUrl`       | `string`  | `/api/chat`         | Chat Completions API 地址         |
| `apiKey`       | `string`  | —                   | Bearer Token（API Key）           |
| `model`        | `string`  | `gpt-4o-mini`       | 模型名称                          |
| `systemPrompt` | `string`  | —                   | 系统提示词                        |
| `title`        | `string`  | `AI 助手`           | 对话框标题                        |
| `placeholder`  | `string`  | `输入消息…`         | 输入框占位文字                    |
| `stream`       | `boolean` | `true`              | 是否启用流式输出                  |
| `temperature`  | `number`  | `0.7`               | 温度（0~2）                       |
| `maxTokens`    | `number`  | —                   | 最大 Token 数                     |

## Events

| Event              | 参数                | 说明               |
| ------------------ | ------------------- | ------------------ |
| `message-sent`     | `content: string`   | 用户发送消息后触发 |
| `message-received` | `content: string`   | 收到完整回复后触发 |

## useChat Composable

```ts
import { useChat } from './src/composables/useChat'

const { messages, loading, error, sendMessage, clearMessages } = useChat({
  apiUrl: 'https://api.example.com/v1/chat/completions',
  apiKey: 'sk-...',
  model: 'gpt-4o',
  stream: true,
})
```

## 构建

```bash
npm run build
```
