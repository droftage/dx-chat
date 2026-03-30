# @dx/chat

DX-CHAT — 纯前端 AI 聊天组件库，支持 PC + Mobile。

## 特性

- 🎨 **独立样式** — 不依赖任何项目，自带 CSS 变量默认值
- 🔌 **插槽系统** — 通过 slots 注入自定义 UI，不 Fork 代码
- 🔄 **模式系统** — 支持 ASK/Agent/Vision 等多模式切换
- 📡 **SSE 流式** — 完整的流式输出 + reasoning + tool_call 展示
- 📱 **响应式** — PC + Mobile 自适应
- 🎯 **Adapter 驱动** — 认证、URL、路由全部通过 adapter 注入

## 安装

```bash
npm install @dx/chat

# 必须的 peer dependencies
npm install antd @ant-design/icons @ant-design/x @tanstack/react-query react react-dom
```

## 使用

```tsx
import { ChatWindow, createAdapter } from '@dx/chat';
import '@dx/chat/styles.css';

const adapter = createAdapter({
  baseUrl: '/admin/ai',          // API 基础路径
  getToken: () => 'your-token',  // 认证 token
  mediaUrl: (path) => `/storage/${path}`,
});

function App() {
  return (
    <ChatWindow
      adapter={adapter}
      agentPicker
      locale="zh"
    />
  );
}
```

## 插槽系统

```tsx
<ChatWindow
  adapter={adapter}
  headerExtra={<Button>消耗记录</Button>}
  sidebarExtra={<ProjectSelector />}
  toolbarExtra={<ModelConfig />}
  welcomeExtra={<QuickActions />}
  renderMessage={(msg, defaultRender) => customRender(msg)}
/>
```

## 模式系统

```tsx
<ChatWindow
  adapter={adapter}
  modes={[
    { key: 'ask', label: '问答', icon: <MessageOutlined /> },
    { key: 'agent', label: 'Agent', icon: <RobotOutlined /> },
  ]}
  currentMode={mode}
  onModeChange={setMode}
/>
```

## 样式覆盖

```css
:root {
  --dx-primary-color: #your-color;
  --dx-gradient-primary: linear-gradient(135deg, #color1, #color2);
}
```

## 构建

```bash
npm install
npm run build
```

## License

PRIVATE
