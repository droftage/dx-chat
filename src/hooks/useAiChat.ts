/**
 * DX-CHAT 聊天核心 Hook
 *
 * 封装流式发送、会话管理、reasoning/tool_call 状态、滚动管理。
 * 从 Insight 前端提取核心逻辑。
 */

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ChatAdapter } from '../adapter';
import { createDxFetch } from '../api/dxFetch';
import { useAiStream } from './useAiStream';
import { useAiMessagesQuery, aiConversationKeys } from './useAiConversation';
import type {
  AiMessage,
  AiConversation,
  AiChatSendResult,
  AiStreamEvent,
  PaginatedResponse,
} from '../types';

// ================================================================
// 类型
// ================================================================

export interface UseAiChatOptions {
  adapter: ChatAdapter;
  /** 当前会话 ID，null 表示尚未创建 */
  conversationId: number | null;
  /** 会话创建后的回调 */
  onConversationCreated?: (conversation: AiConversation) => void;
  /** 流式消息完成后的回调 */
  onMessageComplete?: (message: AiMessage) => void;
  /** Agent ID，可选 */
  agentId?: number;
}

export interface ChatState {
  /** 消息列表 */
  messages: AiMessage[];
  /** 是否正在加载历史消息 */
  loading: boolean;
  /** 是否正在流式传输 */
  streaming: boolean;
  /** 流式累积内容 */
  streamingContent: string;
  /** 流式推理内容（reasoning） */
  reasoningContent: string;
  /** 是否处于 reasoning 阶段 */
  isReasoning: boolean;
  /** tool_call 信息 */
  toolCallInfo: string | null;
  /** 错误 */
  error: Error | null;
}

export interface UseAiChatReturn extends ChatState {
  /** 发送消息 */
  send: (input: string) => Promise<void>;
  /** 取消流式输出 */
  cancel: () => void;
  /** 刷新消息列表 */
  refresh: () => void;
}

// ================================================================
// Hook
// ================================================================

export function useAiChat(options: UseAiChatOptions): UseAiChatReturn {
  const { adapter, conversationId, onConversationCreated, onMessageComplete, agentId } = options;

  const queryClient = useQueryClient();
  const client = createDxFetch(adapter);

  // 流式累积状态
  const [streamingContent, setStreamingContent] = useState('');
  const [reasoningContent, setReasoningContent] = useState('');
  const [isReasoning, setIsReasoning] = useState(false);
  const [toolCallInfo, setToolCallInfo] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // 消息列表 ref（用于滚动管理）
  const scrollTargetRef = useRef<HTMLElement | null>(null);

  // 历史消息查询
  const {
    data: messagesData,
    isLoading: loading,
    refetch: refreshMessages,
  } = useAiMessagesQuery(adapter, conversationId);

  const messages = messagesData?.items ?? [];

  // 流式事件处理
  const handleStreamEvent = useCallback((event: AiStreamEvent) => {
    switch (event.type) {
      case 'delta': {
        const content = typeof event.data === 'string' ? event.data : (event.data as { content?: string })?.content ?? '';
        setStreamingContent((prev) => prev + content);
        setIsReasoning(false);
        break;
      }
      case 'reasoning': {
        const reasoning =
          typeof event.data === 'string'
            ? event.data
            : (event.data as { content?: string })?.content ?? '';
        setReasoningContent((prev) => prev + reasoning);
        setIsReasoning(true);
        break;
      }
      case 'tool_call': {
        const toolInfo =
          typeof event.data === 'string'
            ? event.data
            : (event.data as { name?: string })?.name ?? 'executing...';
        setToolCallInfo(toolInfo);
        break;
      }
      case 'done': {
        setIsReasoning(false);
        setToolCallInfo(null);
        break;
      }
      case 'error': {
        const msg =
          typeof event.data === 'string'
            ? event.data
            : (event.data as { message?: string })?.message ?? 'Unknown stream error';
        setError(new Error(msg));
        break;
      }
    }
  }, []);

  const handleStreamDone = useCallback(() => {
    // 刷新消息列表以获取最终数据
    refreshMessages();
    setStreamingContent('');
    setReasoningContent('');
    setIsReasoning(false);
    setToolCallInfo(null);

    // 滚动到底部
    if (scrollTargetRef.current) {
      scrollTargetRef.current.scrollTo({
        top: scrollTargetRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [refreshMessages]);

  const handleStreamError = useCallback((err: Error) => {
    setError(err);
    setStreamingContent('');
    setReasoningContent('');
    setIsReasoning(false);
    setToolCallInfo(null);
  }, []);

  // 流式 hook
  const { start: startStream, abort: abortStream, streaming } = useAiStream({
    adapter,
    onEvent: handleStreamEvent,
    onDone: handleStreamDone,
    onError: handleStreamError,
  });

  // 发送消息
  const send = useCallback(
    async (input: string) => {
      if (!input.trim()) return;
      setError(null);

      const currentConversationId = conversationId;

      // 构建请求路径
      const base = adapter.baseUrl.replace(/\/+$/, '');
      let path: string;
      let body: Record<string, unknown>;

      if (currentConversationId) {
        // 已有会话：直接发送消息（SSE 流式）
        path = `${base}/chat/conversations/${currentConversationId}/messages`;
        body = { input };
      } else {
        // 新会话：通过 stream 接口创建
        path = `${base}/chat/stream`;
        body = { input };
        if (agentId) {
          body.agent_id = agentId;
        }
      }

      // 立即添加用户消息到本地（乐观更新）
      queryClient.setQueryData(
        aiConversationKeys.messages(currentConversationId ?? -1),
        (old: PaginatedResponse<AiMessage> | undefined) => {
          const userMessage: AiMessage = {
            id: Date.now(),
            role: 'user',
            content: input,
            created_at: new Date().toISOString(),
          };
          if (!old) {
            return { items: [userMessage], page: { current: 1, size: 1, total: 1, last: 1 } };
          }
          return { ...old, items: [...old.items, userMessage] };
        },
      );

      // 用原生 fetch 处理非流式响应（创建会话 + 获取消息）
      // 对于流式部分，通过 useAiStream 处理
      try {
        const token = adapter.getToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const fetchFn = adapter.fetch ?? globalThis.fetch.bind(globalThis);
        const res = await fetchFn(path, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          let errBody: unknown;
          try {
            errBody = await res.json();
          } catch {
            errBody = await res.text().catch(() => null);
          }
          const msg =
            (errBody as { message?: string })?.message ??
            (errBody as { error?: string })?.error ??
            res.statusText;
          throw new Error(`[DX-CHAT] ${msg}`);
        }

        // 检查响应类型
        const contentType = res.headers.get('content-type') ?? '';

        if (contentType.includes('text/event-stream') && res.body) {
          // 流式响应 —— 用 parseSseStream 处理
          // 但我们已经做了请求，复用 useAiStream 的逻辑不太方便
          // 所以直接在这里处理 SSE
          const { parseSseStream } = await import('../api/dxFetch');
          for await (const chunk of parseSseStream(res.body)) {
            let parsed: AiStreamEvent;
            try {
              parsed = JSON.parse(chunk.data) as AiStreamEvent;
            } catch {
              parsed = { type: 'delta', data: chunk.data };
            }
            handleStreamEvent(parsed);
            if (parsed.type === 'done' || parsed.type === 'error') break;
          }
          handleStreamDone();
        } else {
          // JSON 响应（非流式 fallback）
          const result = (await res.json()) as AiChatSendResult;

          // 如果服务端返回了新会话信息
          if (result.conversation && !currentConversationId) {
            onConversationCreated?.(result.conversation as unknown as AiConversation);
            // 刷新会话列表
            queryClient.invalidateQueries({ queryKey: aiConversationKeys.lists() });
          }

          // 刷新消息列表
          refreshMessages();
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        handleStreamError(e);
      }
    },
    [
      adapter,
      conversationId,
      agentId,
      queryClient,
      onConversationCreated,
      refreshMessages,
      handleStreamEvent,
      handleStreamDone,
      handleStreamError,
    ],
  );

  const cancel = useCallback(() => {
    abortStream();
    setStreamingContent('');
    setReasoningContent('');
    setIsReasoning(false);
    setToolCallInfo(null);
  }, [abortStream]);

  const refresh = useCallback(() => {
    refreshMessages();
  }, [refreshMessages]);

  return {
    messages,
    loading,
    streaming,
    streamingContent,
    reasoningContent,
    isReasoning,
    toolCallInfo,
    error,
    send,
    cancel,
    refresh,
  };
}
