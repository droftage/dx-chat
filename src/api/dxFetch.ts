/**
 * DX-CHAT Fetch 客户端
 *
 * 基于 Insight 的 aiFetchClient.ts 重写：
 * - 去掉 tokenManager / CSRF / VITE_API_URL
 * - 通过 ChatAdapter 注入 token 和 baseUrl
 * - 保留 SSE 流式解析、AbortSignal 合并、错误处理
 */

import type { ChatAdapter } from '../adapter';

// ================================================================
// 错误类
// ================================================================

export class DxFetchError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly body: unknown;

  constructor(message: string, status: number, statusText: string, body?: unknown) {
    super(message);
    this.name = 'DxFetchError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

// ================================================================
// 请求工具
// ================================================================

function buildHeaders(adapter: ChatAdapter): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const token = adapter.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

function buildUrl(adapter: ChatAdapter, path: string): string {
  // path 可以是绝对 URL（以 http 开头）或相对路径
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${adapter.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * 普通 JSON 请求，返回解析后的 data
 */
async function request<T>(adapter: ChatAdapter, path: string, init: RequestInit = {}): Promise<T> {
  const url = buildUrl(adapter, path);
  const fetchFn = adapter.fetch ?? globalThis.fetch.bind(globalThis);

  const res = await fetchFn(url, {
    ...init,
    headers: {
      ...buildHeaders(adapter),
      ...(init.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    const message =
      (body as { message?: string })?.message ??
      (body as { error?: string })?.error ??
      res.statusText;
    throw new DxFetchError(`[DX-CHAT] ${message}`, res.status, res.statusText, body);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ================================================================
// 公开 API
// ================================================================

export interface DxFetchClient {
  get: <T>(path: string) => Promise<T>;
  post: <T>(path: string, data?: unknown) => Promise<T>;
  put: <T>(path: string, data?: unknown) => Promise<T>;
  patch: <T>(path: string, data?: unknown) => Promise<T>;
  delete: <T>(path: string) => Promise<T>;
  /**
   * SSE 流式请求，返回 ReadableStream<Uint8Array>
   */
  stream: (path: string, data?: unknown, signal?: AbortSignal) => Promise<ReadableStream<Uint8Array>>;
}

/**
 * 创建基于 adapter 的 fetch 客户端
 */
export function createDxFetch(adapter: ChatAdapter): DxFetchClient {
  return {
    get: <T>(path: string) => request<T>(adapter, path, { method: 'GET' }),

    post: <T>(path: string, data?: unknown) =>
      request<T>(adapter, path, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      }),

    put: <T>(path: string, data?: unknown) =>
      request<T>(adapter, path, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      }),

    patch: <T>(path: string, data?: unknown) =>
      request<T>(adapter, path, {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      }),

    delete: <T>(path: string) => request<T>(adapter, path, { method: 'DELETE' }),

    stream: async (path: string, data?: unknown, signal?: AbortSignal) => {
      const url = buildUrl(adapter, path);
      const fetchFn = adapter.fetch ?? globalThis.fetch.bind(globalThis);

      const res = await fetchFn(url, {
        method: 'POST',
        headers: {
          ...buildHeaders(adapter),
          Accept: 'text/event-stream',
        },
        body: data ? JSON.stringify(data) : undefined,
        signal,
      });

      if (!res.ok) {
        let body: unknown;
        try {
          body = await res.json();
        } catch {
          body = await res.text().catch(() => null);
        }
        const message =
          (body as { message?: string })?.message ??
          (body as { error?: string })?.error ??
          res.statusText;
        throw new DxFetchError(`[DX-CHAT] ${message}`, res.status, res.statusText, body);
      }

      if (!res.body) {
        throw new DxFetchError('[DX-CHAT] Stream response has no body', 0, 'No Body');
      }

      return res.body;
    },
  };
}

// ================================================================
// SSE 解析器
// ================================================================

export interface SseChunk {
  event?: string;
  data: string;
}

/**
 * 从 ReadableStream 解析 SSE 事件
 */
export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<SseChunk> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 按行分割
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIdx).replace(/\r$/, '');
        buffer = buffer.slice(newlineIdx + 1);

        if (line === '') {
          // 空行表示一个 SSE 事件结束，但我们已经逐行 yield 了
          continue;
        }

        if (line.startsWith(':')) {
          // 注释行（心跳）
          continue;
        }

        if (line.startsWith('data:')) {
          const data = line.slice(5).trimStart();
          yield { data };
        } else if (line.startsWith('event:')) {
          // event 行暂不单独处理，和下一行 data 一起
          // 简单起见直接忽略，大多数 SSE 只用 data
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
