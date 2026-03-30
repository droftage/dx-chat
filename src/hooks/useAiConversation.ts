/**
 * DX-CHAT 会话管理 Hooks
 *
 * 从 Insight 的 aiService.ts 抽取会话相关逻辑，
 * 用 adapter 注入认证和 baseUrl，用原生 fetch 替代 apiClient。
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChatAdapter } from '../adapter';
import { createDxFetch } from '../api/dxFetch';
import type {
  AiConversation,
  AiMessage,
  AiAgentBrief,
  AiConversationDependencies,
  AiConversationDeleteResult,
  AiChatConversationCreateRequest,
  PaginatedResponse,
} from '../types';

// ================================================================
// API 路径
// ================================================================

function apiPaths(baseUrl: string) {
  const base = baseUrl.replace(/\/+$/, '');
  return {
    conversations: () => `${base}/chat/conversations`,
    conversationMessages: (id: number) => `${base}/chat/conversations/${id}/messages`,
    createConversation: () => `${base}/chat/conversations`,
    deleteConversation: (id: number) => `${base}/chat/conversations/${id}`,
    checkDependencies: (id: number) => `${base}/chat/conversations/${id}/dependencies`,
    agentsAvailable: () => `${base}/agents/available`,
  };
}

// ================================================================
// Query Keys
// ================================================================

export const aiConversationKeys = {
  all: ['ai-conversations'] as const,
  lists: () => [...aiConversationKeys.all, 'list'] as const,
  list: (adapterBaseUrl: string) => [...aiConversationKeys.lists(), adapterBaseUrl] as const,
  messages: (conversationId: number) =>
    [...aiConversationKeys.all, 'messages', conversationId] as const,
  agents: (adapterBaseUrl: string) =>
    [...aiConversationKeys.all, 'agents', adapterBaseUrl] as const,
};

// ================================================================
// Hook: 会话列表
// ================================================================

export function useAiConversationsQuery(adapter: ChatAdapter) {
  const client = createDxFetch(adapter);
  const paths = apiPaths(adapter.baseUrl);

  return useQuery({
    queryKey: aiConversationKeys.list(adapter.baseUrl),
    queryFn: () => client.get<PaginatedResponse<AiConversation>>(paths.conversations()),
    staleTime: 30_000,
  });
}

// ================================================================
// Hook: 消息列表
// ================================================================

export function useAiMessagesQuery(adapter: ChatAdapter, conversationId: number | null) {
  const client = createDxFetch(adapter);
  const paths = apiPaths(adapter.baseUrl);

  return useQuery({
    queryKey: aiConversationKeys.messages(conversationId ?? -1),
    queryFn: () => {
      if (conversationId === null) {
        return Promise.resolve({ items: [], page: { current: 1, size: 0, total: 0, last: 0 } });
      }
      return client.get<PaginatedResponse<AiMessage>>(paths.conversationMessages(conversationId));
    },
    enabled: conversationId !== null,
    staleTime: 10_000,
  });
}

// ================================================================
// Hook: 删除会话
// ================================================================

export function useDeleteAiConversationMutation(adapter: ChatAdapter) {
  const client = createDxFetch(adapter);
  const queryClient = useQueryClient();
  const paths = apiPaths(adapter.baseUrl);

  return useMutation({
    mutationFn: (conversationId: number) =>
      client.delete<AiConversationDeleteResult>(paths.deleteConversation(conversationId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiConversationKeys.lists() });
    },
  });
}

// ================================================================
// Hook: Agent 列表
// ================================================================

export function useAiAgentsQuery(adapter: ChatAdapter) {
  const client = createDxFetch(adapter);
  const paths = apiPaths(adapter.baseUrl);

  return useQuery({
    queryKey: aiConversationKeys.agents(adapter.baseUrl),
    queryFn: () => client.get<AiAgentBrief[]>(paths.agentsAvailable()),
    staleTime: 60_000,
  });
}

// ================================================================
// 检查会话依赖（非 hook，纯函数）
// ================================================================

export async function checkConversationDependencies(
  adapter: ChatAdapter,
  conversationId: number,
): Promise<AiConversationDependencies> {
  const client = createDxFetch(adapter);
  const paths = apiPaths(adapter.baseUrl);
  return client.get<AiConversationDependencies>(paths.checkDependencies(conversationId));
}
