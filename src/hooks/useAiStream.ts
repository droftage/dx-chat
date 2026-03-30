/**
 * DX-CHAT 流式聊天 Hook
 *
 * 基于 Insight 的 useAiStream 重写，import 路径改为 dxFetch。
 */

import { useCallback, useRef, useState } from 'react';
import type { ChatAdapter } from '../adapter';
import { createDxFetch, parseSseStream, DxFetchError } from '../api/dxFetch';
import type { AiStreamEvent, AiStreamEventType } from '../types';

// ================================================================
// 类型
// ================================================================

export interface UseAiStreamOptions {
  adapter: ChatAdapter;
  onEvent?: (event: AiStreamEvent) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export interface UseAiStreamReturn {
  /** 开始流式请求 */
  start: (path: string, body?: Record<string, unknown>) => Promise<void>;
  /** 取消当前流 */
  abort: () => void;
  /** 是否正在流式传输 */
  streaming: boolean;
  /** 当前错误 */
  error: Error | null;
}

/**
 * 流式 AI 聊天 Hook
 */
export function useAiStream(options: UseAiStreamOptions): UseAiStreamReturn {
  const { adapter, onEvent, onDone, onError } = options;

  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const start = useCallback(
    async (path: string, body?: Record<string, unknown>) => {
      // 取消之前的流
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      setError(null);

      try {
        const client = createDxFetch(adapter);
        const stream = await client.stream(path, body, controller.signal);

        for await (const chunk of parseSseStream(stream, controller.signal)) {
          if (controller.signal.aborted) break;

          let parsed: AiStreamEvent;
          try {
            parsed = JSON.parse(chunk.data) as AiStreamEvent;
          } catch {
            // 非 JSON 数据，当作 delta 处理
            parsed = { type: 'delta', data: chunk.data };
          }

          onEvent?.(parsed);

          if (parsed.type === 'done' || parsed.type === 'error') {
            break;
          }
        }

        onDone?.();
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // 用户取消，不算错误
          return;
        }
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        onError?.(e);
      } finally {
        abortRef.current = null;
        setStreaming(false);
      }
    },
    [adapter, onEvent, onDone, onError],
  );

  return { start, abort, streaming, error };
}
