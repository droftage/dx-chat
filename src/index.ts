/**
 * @dx/chat - DX-CHAT AI 聊天组件库
 *
 * 使用方式：
 * ```typescript
 * import { ChatWindow, createAdapter } from '@dx/chat';
 * import '@dx/chat/styles.css';
 *
 * const adapter = createAdapter({
 *   baseUrl: '/admin/ai',
 *   getToken: () => 'your-token',
 *   mediaUrl: (path) => `/storage/${path}`,
 * });
 *
 * <ChatWindow adapter={adapter} />
 * ```
 */

// Core
export { createAdapter } from './adapter';
export type { ChatAdapter } from './adapter';

// Components
export { ChatWindow } from './components/ChatWindow/ChatWindow';
export type { ChatWindowProps, ChatMode } from './components/ChatWindow/ChatWindow';

export { ChatHeader } from './components/Chat/ChatHeader';
export type { ChatMode as ChatModeFromHeader } from './components/Chat/ChatHeader';
export { ChatWelcome } from './components/Chat/ChatWelcome';
export { DeleteConversationModal } from './components/Chat/DeleteConversationModal';
export { SenderToolbar } from './components/Chat/SenderToolbar';
export { Sidebar } from './components/Sidebar/Sidebar';
export { MessageList } from './components/MessageList/MessageList';
export { StreamingBubble } from './components/StreamingBubble/StreamingBubble';

// Hooks
export { useAiStream } from './hooks/useAiStream';
export type { AiStreamEvent, AiStreamEventType, UseAiStreamOptions, UseAiStreamReturn } from './hooks/useAiStream';

// Types
export type {
  AiAgentBrief,
  AiConversation,
  AiMessage,
  AiChatPolicy,
  AiChatSendResult,
  AiUsageRecord,
  AiUsageStatus,
  PaginatedResponse,
  AiStreamEvent as AiStreamEventFromTypes,
} from './types';

// API
export { createApiService } from './services/api';
export type { ApiService } from './services/api';

// Styles (import these in your app)
// import '@dx/chat/styles.css';
// import '@dx/chat/variables.css'; // optional: CSS variables with defaults
