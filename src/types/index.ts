/**
 * DX-CHAT 类型定义
 *
 * 从 Insight AI Chat 提取，去除应用特定依赖。
 */

// ================================================================
// Agent（角色）
// ================================================================

export interface AiAgentBrief {
  id: number;
  name: string;
  slug: string;
  avatar?: string | null;
  description?: string | null;
  is_default?: boolean;
  model?: string | null;
}

// ================================================================
// 会话
// ================================================================

export interface AiConversation {
  id: number;
  admin_id?: number;
  ai_agent_id?: number | null;
  title: string;
  summary?: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  last_agent?: {
    id: number;
    name: string;
    slug: string;
    avatar?: string | null;
  } | null;
}

// ================================================================
// 消息
// ================================================================

export interface AiMessage {
  id: number;
  conversation_id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning_content?: string | null;
  model?: string;
  tokens?: number;
  created_at: string;
  ai_agent_id?: number | null;
  agent?: {
    id: number;
    name: string;
    slug: string;
    avatar?: string | null;
    model?: string | null;
  } | null;
}

// ================================================================
// 聊天策略
// ================================================================

export interface AiChatPolicy {
  task_key: string;
  max_conversations: number;
  max_messages: number;
  max_input_chars: number;
  context_window_messages: number;
  max_context_chars: number;
}

// ================================================================
// 发送消息结果
// ================================================================

export interface AiChatSendResult {
  conversation: {
    id: number;
    title: string | null;
    last_message_at: string | null;
  };
  messages: Array<{
    id: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
  }>;
  usage_record_id?: number;
  model?: string | null;
  usage?: Record<string, unknown> | null;
}

export interface AiChatConversationCreateRequest {
  title?: string;
  agent_id?: number;
}

export interface AiChatMessageCreateRequest {
  input: string;
}

// ================================================================
// 会话依赖 / 删除
// ================================================================

export interface AiConversationDependencies {
  exists: boolean;
  debug_reports_count: number;
  debug_reports: Array<{
    id: number;
    title: string;
    status: string;
  }>;
}

export interface AiConversationDeleteResult {
  deleted: boolean;
  debug_reports_unlinked: number;
}

// ================================================================
// Usage 记录
// ================================================================

export type AiUsageStatus = 'success' | 'failed' | 'error';

export interface AiUsageRecord {
  id: number;
  admin_id?: number | null;
  admin?: {
    id: number;
    name: string;
    nickname?: string | null;
    avatar?: string | null;
  } | null;
  module?: string | null;
  ai_agent_id?: number | null;
  ai_agent?: {
    id?: number | null;
    name?: string | null;
    slug?: string | null;
    avatar?: string | null;
  } | null;
  task_key: string;
  model?: string | null;
  input_text?: string | null;
  output_text?: string | null;
  total_tokens?: number | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  duration_ms?: number | null;
  status: AiUsageStatus;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

// ================================================================
// 分页
// ================================================================

export interface PaginatedResponse<TItem> {
  items: TItem[];
  page: {
    current: number;
    size: number;
    total: number;
    last: number;
  };
}

// ================================================================
// SSE 流式事件
// ================================================================

export type AiStreamEventType = 'start' | 'delta' | 'reasoning' | 'tool_call' | 'done' | 'error';

export interface AiStreamEvent {
  type: AiStreamEventType;
  data?: unknown;
}
