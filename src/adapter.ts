/**
 * DX-CHAT Adapter 接口
 *
 * 各接入方（ZERO / Insight / 未来项目）实现此接口，
 * DX-CHAT 不关心认证方式、路由、媒体 URL 等实现细节。
 */
export interface ChatAdapter {
  /** 获取当前认证 token */
  getToken: () => string | null;

  /** API 基础路径，如 '/admin/ai' 或 '/api/ai' */
  baseUrl: string;

  /** 媒体文件 URL 拼接 */
  mediaUrl: (path: string) => string;

  /** 可选：自定义 fetch 实现（处理签名、加密等） */
  fetch?: (url: string, init: RequestInit) => Promise<Response>;

  /** 可选：错误上报 */
  onError?: (error: Error, context: Record<string, unknown>) => void;
}

/**
 * 创建 adapter 的便捷函数（带类型校验）
 */
export function createAdapter(config: ChatAdapter): ChatAdapter {
  if (!config.baseUrl) {
    throw new Error('[DX-CHAT] adapter.baseUrl is required');
  }

  if (typeof config.getToken !== 'function') {
    throw new Error('[DX-CHAT] adapter.getToken must be a function');
  }

  if (typeof config.mediaUrl !== 'function') {
    throw new Error('[DX-CHAT] adapter.mediaUrl must be a function');
  }

  return {
    ...config,
    baseUrl: config.baseUrl.replace(/\/+$/, ''), // 去掉尾部斜杠
  };
}
