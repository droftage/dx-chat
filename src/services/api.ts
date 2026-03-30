/**
 * DX-CHAT 统一 API 服务
 *
 * 基于 ChatAdapter 创建类型安全的 API 方法集合，
 * 用原生 fetch 替代 Insight 的 apiClient。
 */

import type { ChatAdapter } from '../adapter';
import { createDxFetch, type DxFetchClient } from '../api/dxFetch';
import type {
  AiConversation,
  AiMessage,
  AiAgentBrief,
  AiConversationDependencies,
  AiConversationDeleteResult,
  AiChatConversationCreateRequest,
  AiChatSendResult,
  AiUsageRecord,
  PaginatedResponse,
} from '../types';

// ================================================================
// API 路径构建
// ================================================================

function paths(baseUrl: string) {
  const base = baseUrl.replace(/\/+$/, '');
  return {
    // 会话
    conversations: () => `${base}/chat/conversations`,
    conversationMessages: (id: number) => `${base}/chat/conversations/${id}/messages`,
    createConversation: () => `${base}/chat/conversations`,
    deleteConversation: (id: number) => `${base}/chat/conversations/${id}`,
    sendMessage: (id: number) => `${base}/chat/conversations/${id}/messages`,
    checkDependencies: (id: number) => `${base}/chat/conversations/${id}/dependencies`,

    // 流式
    stream: () => `${base}/chat/stream`,

    // Agent
    agentsAvailable: () => `${base}/agents/available`,

    // Usage
    usage: () => `${base}/usage-records`,
    usageDetail: (id: number) => `${base}/usage-records/${id}`,
  };
}

// ================================================================
// Usage 查询参数
// ================================================================

export interface UsageListParams {
  page?: number;
  pageSize?: number;
  task_key?: string;
  status?: string;
  agent_id?: number;
}

// ================================================================
// API 服务类型
// ================================================================

export interface ApiService {
  // 会话 CRUD
  listConversations: () => Promise<PaginatedResponse<AiConversation>>;
  getMessages: (conversationId: number) => Promise<PaginatedResponse<AiMessage>>;
  createConversation: (data?: AiChatConversationCreateRequest) => Promise<AiConversation>;
  deleteConversation: (id: number) => Promise<AiConversationDeleteResult>;
  checkDependencies: (id: number) => Promise<AiConversationDependencies>;

  // 发送消息（SSE 流式，返回 ReadableStream） + JSON fallback
  streamSendMessage: (
    conversationId: number,
    body: { input: string },
  ) => Promise<ReadableStream<Uint8Array>>;
  sendMessage: (
    conversationId: number,
    body: { input: string },
  ) => Promise<AiChatSendResult>;

  // 新会话流式（创建会话 + 发送消息）
  streamNewConversation: (body: {
    input: string;
    agent_id?: number;
  }) => Promise<ReadableStream<Uint8Array>>;

  // Agent 列表
  listAgents: () => Promise<AiAgentBrief[]>;

  // Usage
  listUsage: (params?: UsageListParams) => Promise<PaginatedResponse<AiUsageRecord>>;
  getUsageDetail: (id: number) => Promise<AiUsageRecord>;
}

// ================================================================
// 工厂函数
// ================================================================

export function createApiService(adapter: ChatAdapter): ApiService {
  const client = createDxFetch(adapter);
  const p = paths(adapter.baseUrl);

  return {
    // 会话 CRUD
    listConversations: () => client.get<PaginatedResponse<AiConversation>>(p.conversations()),

    getMessages: (conversationId: number) =>
      client.get<PaginatedResponse<AiMessage>>(p.conversationMessages(conversationId)),

    createConversation: (data?: AiChatConversationCreateRequest) =>
      client.post<AiConversation>(p.createConversation(), data),

    deleteConversation: (id: number) =>
      client.delete<AiConversationDeleteResult>(p.deleteConversation(id)),

    checkDependencies: (id: number) =>
      client.get<AiConversationDependencies>(p.checkDependencies(id)),

    // 发送消息（SSE 流式）
    streamSendMessage: (conversationId: number, body: { input: string }) =>
      client.stream(p.sendMessage(conversationId), body),

    // 发送消息（JSON 响应，非流式 fallback）
    sendMessage: (conversationId: number, body: { input: string }) =>
      client.post<AiChatSendResult>(p.sendMessage(conversationId), body),

    // 新会话流式
    streamNewConversation: (body: { input: string; agent_id?: number }) =>
      client.stream(p.stream(), body),

    // Agent 列表
    listAgents: () => client.get<AiAgentBrief[]>(p.agentsAvailable()),

    // Usage
    listUsage: (params?: UsageListParams) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
      if (params?.task_key) searchParams.set('task_key', params.task_key);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.agent_id) searchParams.set('agent_id', String(params.agent_id));
      const qs = searchParams.toString();
      const url = qs ? `${p.usage()}?${qs}` : p.usage();
      return client.get<PaginatedResponse<AiUsageRecord>>(url);
    },

    getUsageDetail: (id: number) => client.get<AiUsageRecord>(p.usageDetail(id)),
  };
}
