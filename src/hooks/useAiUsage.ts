/**
 * DX-CHAT Usage 相关 Hooks
 *
 * 从 Insight 的 aiService.ts 抽取 usage 查询逻辑。
 */

import { useQuery } from '@tanstack/react-query';
import type { ChatAdapter } from '../adapter';
import { createDxFetch } from '../api/dxFetch';
import type { AiUsageRecord, PaginatedResponse } from '../types';

// ================================================================
// API 路径
// ================================================================

function apiPaths(baseUrl: string) {
  const base = baseUrl.replace(/\/+$/, '');
  return {
    usage: () => `${base}/usage-records`,
    usageDetail: (id: number) => `${base}/usage-records/${id}`,
  };
}

// ================================================================
// Query Keys
// ================================================================

export const aiUsageKeys = {
  all: ['ai-usage'] as const,
  lists: () => [...aiUsageKeys.all, 'list'] as const,
  list: (params: string) => [...aiUsageKeys.lists(), params] as const,
  detail: (id: number) => [...aiUsageKeys.all, 'detail', id] as const,
};

// ================================================================
// 类型
// ================================================================

export interface AiUsageQueryParams {
  page?: number;
  pageSize?: number;
  task_key?: string;
  status?: string;
  agent_id?: number;
}

// ================================================================
// Hook: Usage 列表
// ================================================================

export function useAiUsageQuery(adapter: ChatAdapter, params: AiUsageQueryParams = {}) {
  const client = createDxFetch(adapter);
  const paths = apiPaths(adapter.baseUrl);

  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.task_key) searchParams.set('task_key', params.task_key);
  if (params.status) searchParams.set('status', params.status);
  if (params.agent_id) searchParams.set('agent_id', String(params.agent_id));

  const queryString = searchParams.toString();
  const url = queryString ? `${paths.usage()}?${queryString}` : paths.usage();

  return useQuery({
    queryKey: aiUsageKeys.list(queryString),
    queryFn: () => client.get<PaginatedResponse<AiUsageRecord>>(url),
    staleTime: 30_000,
  });
}

// ================================================================
// Hook: Usage 详情
// ================================================================

export function useAiUsageDetailQuery(adapter: ChatAdapter, id: number | null) {
  const client = createDxFetch(adapter);
  const paths = apiPaths(adapter.baseUrl);

  return useQuery({
    queryKey: aiUsageKeys.detail(id ?? -1),
    queryFn: () => {
      if (id === null) return Promise.resolve(null);
      return client.get<AiUsageRecord>(paths.usageDetail(id));
    },
    enabled: id !== null,
    staleTime: 30_000,
  });
}
