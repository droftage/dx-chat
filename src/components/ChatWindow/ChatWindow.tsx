/**
 * ChatWindow - DX-CHAT 主入口组件
 *
 * 接收 adapter 和配置，渲染完整的聊天窗口。
 * 通过插槽系统（Slots）支持各项目注入自定义 UI，不 Fork 代码。
 */
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Typography, Button, Tooltip, Avatar, Space } from 'antd';
import { Bubble, Sender } from '@ant-design/x';
import {
  RobotOutlined,
  UserOutlined,
  EditOutlined,
  ReadOutlined,
  CodeOutlined,
  TranslationOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons';
import type { ChatAdapter } from '../../adapter';
import type {
  AiConversation,
  AiMessage,
  AiAgentBrief,
  AiStreamEvent,
} from '../../types';
import { useAiStream } from '../../hooks/useAiStream';
import { useAiConversation, useAiAgents, useAiMessages } from '../../hooks/useAiConversation';
import { createApiService } from '../../services/api';

import { Sidebar } from '../Sidebar/Sidebar';
import { ChatHeader } from './ChatHeader';
import { MessageList } from '../MessageList/MessageList';
import { SenderToolbar } from './SenderToolbar';
import { StreamingBubble } from '../StreamingBubble/StreamingBubble';
import { ChatWelcome } from './ChatWelcome';
import { DeleteConversationModal } from './DeleteConversationModal';

import styles from '../../styles/ChatWindow.module.css';
import 'highlight.js/styles/github.css';

const TEMP_CONVERSATION_ID = -1 as const;

type ViewState = 'list' | 'chat';

// ================================================================
// 模式配置
// ================================================================

export interface ChatMode {
  /** 模式唯一标识，如 'ask', 'agent', 'vision' */
  key: string;
  /** 显示名称 */
  label: string;
  /** 图标 */
  icon?: React.ReactNode;
  /** 是否禁用 */
  disabled?: boolean;
  /** 禁用提示 */
  disabledTooltip?: string;
}

// ================================================================
// 插槽系统
// ================================================================

export interface ChatWindowProps {
  // ---- 核心 ----
  adapter: ChatAdapter;

  // ---- 配置 ----
  agentPicker?: boolean;
  theme?: 'light' | 'dark';
  locale?: 'zh' | 'en';
  className?: string;
  maxHeight?: string | number;
  title?: string;

  // ---- 模式系统 ----
  /** 支持的模式列表，不传则不显示模式切换 */
  modes?: ChatMode[];
  /** 当前激活模式 */
  currentMode?: string;
  /** 模式切换回调 */
  onModeChange?: (mode: string) => void;

  // ---- 欢迎页提示词 ----
  /** 自定义提示词，不传则用默认 */
  prompts?: Array<{ key: string; label: string; description: string; icon?: React.ReactNode }>;
  /** 提示词点击回调 */
  onPromptClick?: (description: string) => void;

  // ---- 插槽：注入自定义 UI ----
  /** 头部右侧额外内容（如 Usage 入口、设置按钮） */
  headerExtra?: React.ReactNode;
  /** 侧边栏底部额外内容（如项目选择器） */
  sidebarExtra?: React.ReactNode;
  /** 输入框上方额外内容（如模型配置入口） */
  toolbarExtra?: React.ReactNode;
  /** 欢迎页底部额外内容 */
  welcomeExtra?: React.ReactNode;

  // ---- 渲染拦截器 ----
  /** 自定义消息渲染，默认渲染 Markdown */
  renderMessage?: (message: AiMessage, defaultRender: React.ReactNode) => React.ReactNode;
  /** 自定义工具调用卡片渲染 */
  renderToolCall?: (toolCall: Record<string, unknown>, defaultRender: React.ReactNode) => React.ReactNode;
  /** 自定义头像获取 */
  getAvatarUrl?: (entity: 'user' | 'agent', data?: Record<string, unknown>) => string | undefined;

  // ---- 事件钩子 ----
  onConversationChange?: (id: number | null) => void;
  onMessageSent?: (message: string) => void;
  onStreamStart?: () => void;
  onStreamEnd?: (conversationId: number | null) => void;
  onError?: (error: string) => void;
}

// 默认提示词
const suggestedPrompts = [
  { key: '1', label: '优化标题', description: '帮我优化这篇文章的标题，使其更具吸引力', icon: <EditOutlined /> },
  { key: '2', label: '生成摘要', description: '为这篇内容生成一段简洁的摘要', icon: <ReadOutlined /> },
  { key: '3', label: '代码解释', description: '解释这段代码的作用和原理', icon: <CodeOutlined /> },
  { key: '4', label: '翻译文本', description: '将这段文字翻译成英文', icon: <TranslationOutlined /> },
];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  adapter,
  agentPicker = true,
  theme = 'light',
  locale = 'zh',
  className,
  maxHeight,
  title,

  // 模式系统
  modes,
  currentMode,
  onModeChange,

  // 提示词
  prompts: customPrompts,
  onPromptClick,

  // 插槽
  headerExtra,
  sidebarExtra,
  toolbarExtra,
  welcomeExtra,

  // 渲染拦截器
  renderMessage,
  renderToolCall,
  getAvatarUrl,

  // 事件钩子
  onConversationChange,
  onMessageSent,
  onStreamStart,
  onStreamEnd,
  onError,
}) => {
  // ---- 视图状态 ----
  const [viewState, setViewState] = useState<ViewState>('list');
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [streamingAssistantMessage, setStreamingAssistantMessage] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [streamingToolCall, setStreamingToolCall] = useState('');
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(true);
  const [reasoningMode, setReasoningMode] = useState<'fast' | 'thinking'>('fast');

  const streamingAssistantRef = useRef('');
  const streamingReasoningRef = useRef('');
  const streamingToolCallRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // RAF 节流
  const rafIdRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef({ reasoning: false, assistant: false, toolCall: false });

  const flushStreamingUpdates = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const pending = pendingUpdateRef.current;
      if (pending.reasoning) { setStreamingReasoning(streamingReasoningRef.current); pending.reasoning = false; }
      if (pending.assistant) { setStreamingAssistantMessage(streamingAssistantRef.current); pending.assistant = false; }
      if (pending.toolCall) { setStreamingToolCall(streamingToolCallRef.current); pending.toolCall = false; }
    });
  }, []);

  useEffect(() => {
    return () => { if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current); };
  }, []);

  // ---- 滚动 ----
  const [isNearBottom, setIsNearBottom] = useState(true);
  const isNearBottomRef = useRef(true);
  const forceScrollToBottomRef = useRef(false);

  const computeIsNearBottom = useCallback((el: HTMLDivElement) => {
    return el.scrollHeight - el.scrollTop - el.clientHeight <= 120;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    if (viewState !== 'chat') return;
    const el = scrollRef.current;
    if (!el) return;
    let rafId: number | null = null;
    const update = () => {
      const next = computeIsNearBottom(el);
      if (next !== isNearBottomRef.current) { isNearBottomRef.current = next; setIsNearBottom(next); }
    };
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => { rafId = null; update(); });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => { el.removeEventListener('scroll', onScroll); if (rafId !== null) cancelAnimationFrame(rafId); };
  }, [computeIsNearBottom, viewState]);

  useEffect(() => {
    if (viewState !== 'chat') return;
    if (forceScrollToBottomRef.current || isNearBottomRef.current) {
      scrollToBottom('auto');
      forceScrollToBottomRef.current = false;
    }
  }, [viewState, scrollToBottom]);

  // ---- API Service ----
  const apiService = useMemo(() => createApiService(adapter), [adapter]);

  // ---- Queries ----
  const { data: agentsData, isLoading: isAgentsLoading } = useAiAgents(adapter);
  const agents: AiAgentBrief[] = agentsData ?? [];

  const { data: conversationsData, isLoading: isConversationsLoading } = useAiConversation(adapter);
  const conversations: AiConversation[] = conversationsData ?? [];

  const shouldFetchMessages = typeof activeConversationId === 'number' && activeConversationId > 0;
  const { data: messagesData, isLoading: isMessagesLoading } = useAiMessages(
    adapter,
    shouldFetchMessages ? activeConversationId : undefined,
  );
  const messages: AiMessage[] = messagesData ?? [];

  // ---- SSE 流式处理 ----
  const stream = useAiStream({
    adapter,
    onEvent: (evt: AiStreamEvent) => {
      if (evt.type === 'reasoning') {
        const reasoningContent = (evt.data as { content?: string })?.content;
        if (typeof reasoningContent === 'string' && reasoningContent !== '') {
          if (streamingReasoningRef.current === '') setIsReasoningExpanded(true);
          streamingReasoningRef.current += reasoningContent;
          pendingUpdateRef.current.reasoning = true;
          flushStreamingUpdates();
        }
        return;
      }

      if (evt.type === 'tool_call') {
        const toolContent = (evt.data as { content?: string })?.content;
        if (typeof toolContent === 'string' && toolContent !== '') {
          streamingToolCallRef.current += toolContent;
          pendingUpdateRef.current.toolCall = true;
          flushStreamingUpdates();
        }
        return;
      }

      if (evt.type === 'delta') {
        const delta = (evt.data as { delta?: string })?.delta;
        if (typeof delta === 'string' && delta !== '') {
          if (streamingAssistantRef.current === '' && streamingReasoningRef.current !== '') {
            setIsReasoningExpanded(false);
          }
          streamingAssistantRef.current += delta;
          pendingUpdateRef.current.assistant = true;
          flushStreamingUpdates();
        }
        return;
      }

      if (evt.type === 'done') {
        const payload = evt.data as { conversation_id?: number; conversation?: { id?: number } };
        const conversationId = payload?.conversation_id || (typeof payload?.conversation?.id === 'number' ? payload.conversation.id : null);
        if (conversationId) setActiveConversationId(conversationId);
        onStreamEnd?.(conversationId);

        setTimeout(() => {
          setPendingUserMessage(null);
          setStreamingAssistantMessage('');
          setStreamingReasoning('');
          setStreamingToolCall('');
          streamingAssistantRef.current = '';
          streamingReasoningRef.current = '';
          streamingToolCallRef.current = '';
        }, 300);
        return;
      }

      if (evt.type === 'error') {
        const errorMessage = (evt.data as { message?: string })?.message;
        const errMsg = typeof errorMessage === 'string' && errorMessage !== '' ? errorMessage : '发送失败，请稍后重试';
        setSendError(errMsg);
        onError?.(errMsg);
        setPendingUserMessage(null);
        setStreamingAssistantMessage('');
        setStreamingReasoning('');
        setStreamingToolCall('');
        streamingAssistantRef.current = '';
        streamingReasoningRef.current = '';
        streamingToolCallRef.current = '';
      }
    },
  });

  const isSending = stream.isStreaming;

  // ---- 导航 ----
  const enterConversation = useCallback((conversationId: number) => {
    setActiveConversationId(conversationId);
    setViewState('chat');
    setContent('');
    setSendError(null);
    setIsNearBottom(true);
    isNearBottomRef.current = true;
    forceScrollToBottomRef.current = true;
    onConversationChange?.(conversationId);
  }, [onConversationChange]);

  const backToList = useCallback(() => {
    setViewState('list');
    setActiveConversationId(null);
    setContent('');
    setSendError(null);
    onConversationChange?.(null);
  }, [onConversationChange]);

  const handleStartNewChat = useCallback(() => {
    setActiveConversationId(TEMP_CONVERSATION_ID);
    setViewState('chat');
    setContent('');
    setSendError(null);
    setPendingUserMessage(null);
    setStreamingAssistantMessage('');
    setStreamingReasoning('');
    setStreamingToolCall('');
    streamingAssistantRef.current = '';
    streamingReasoningRef.current = '';
    streamingToolCallRef.current = '';
    setIsNearBottom(true);
    isNearBottomRef.current = true;
    forceScrollToBottomRef.current = true;
  }, []);

  const handleSend = useCallback(async (value?: string) => {
    const textToSend = typeof value === 'string' ? value : content;
    if (!textToSend.trim() || isSending) return;

    forceScrollToBottomRef.current = true;
    setSendError(null);
    setContent('');
    streamingAssistantRef.current = '';
    streamingReasoningRef.current = '';
    streamingToolCallRef.current = '';
    setStreamingReasoning('');
    setStreamingToolCall('');
    setPendingUserMessage(textToSend);
    setStreamingAssistantMessage('');
    setIsReasoningExpanded(true);

    onMessageSent?.(textToSend);
    onStreamStart?.();

    const requestBody: Record<string, unknown> = { input: textToSend };
    if (typeof activeConversationId === 'number' && activeConversationId > 0) {
      requestBody.conversation_id = activeConversationId;
    }
    if (activeConversationId === TEMP_CONVERSATION_ID || !activeConversationId) {
      const resolvedAgentId = selectedAgentId ?? defaultAgentId;
      if (resolvedAgentId) requestBody.agent_id = resolvedAgentId;
    }
    if (reasoningMode === 'thinking') {
      requestBody.reasoning = true;
    }
    if (currentMode) {
      requestBody.mode = currentMode;
    }

    try {
      const streamUrl = `${adapter.baseUrl}/chat/stream`;
      await stream.start(streamUrl, requestBody);
    } catch (error: unknown) {
      const err = error as { message?: unknown };
      const errorMsg = typeof err.message === 'string' ? err.message : '发送失败，请稍后重试';
      setSendError(errorMsg);
      setPendingUserMessage(null);
      setStreamingAssistantMessage('');
      setStreamingReasoning('');
      streamingAssistantRef.current = '';
      streamingReasoningRef.current = '';
      onError?.(errorMsg);
    }
  }, [content, isSending, adapter, activeConversationId, selectedAgentId, defaultAgentId, reasoningMode, currentMode, stream, onMessageSent, onStreamStart, onError]);

  const handleStopStream = useCallback(() => {
    stream.stop();
    setPendingUserMessage(null);
    setStreamingAssistantMessage('');
    setStreamingReasoning('');
    streamingAssistantRef.current = '';
    streamingReasoningRef.current = '';
  }, [stream]);

  // ---- 删除 ----
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    visible: boolean;
    conversationId: number | null;
    loading: boolean;
    hasDependencies: boolean;
    dependencyCount: number;
  }>({ visible: false, conversationId: null, loading: false, hasDependencies: false, dependencyCount: 0 });

  const handleDeleteConversation = async (conversationId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeleteConfirmState({ visible: true, conversationId, loading: false, hasDependencies: false, dependencyCount: 0 });
  };

  const handleConfirmDelete = async () => {
    const { conversationId } = deleteConfirmState;
    if (!conversationId) return;
    // TODO: deleteConversationMutation
    if (activeConversationId === conversationId) backToList();
    setDeleteConfirmState({ visible: false, conversationId: null, loading: false, hasDependencies: false, dependencyCount: 0 });
  };

  // ---- Agent 信息 ----
  const defaultAgentId = useMemo(() => {
    const def = agents.find(a => a.is_default);
    return def?.id ?? agents[0]?.id ?? null;
  }, [agents]);

  useEffect(() => {
    if (selectedAgentId !== null || !defaultAgentId) return;
    setSelectedAgentId(defaultAgentId);
  }, [defaultAgentId, selectedAgentId]);

  const selectedAgent = useMemo(() => {
    return agents.find(a => a.id === selectedAgentId) ?? null;
  }, [agents, selectedAgentId]);

  const currentConversation = conversations.find(c => c.id === activeConversationId);

  const displayAgent = useMemo(() => {
    if (activeConversationId === TEMP_CONVERSATION_ID && selectedAgentId) {
      return agents.find(a => a.id === selectedAgentId);
    }
    if (currentConversation?.ai_agent_id) {
      return agents.find(a => a.id === currentConversation.ai_agent_id);
    }
    return null;
  }, [activeConversationId, agents, currentConversation, selectedAgentId]);

  const displayAgentAvatarSrc = displayAgent?.avatar ? (adapter.mediaUrl(displayAgent.avatar) || undefined) : undefined;

  const adminAvatarSrc = ''; // TODO: 从 adapter 或 props 获取用户头像

  const showWelcome = messages.length === 0 && !isMessagesLoading && activeConversationId === TEMP_CONVERSATION_ID;
  const showScrollToBottom = viewState === 'chat' && !isNearBottom;

  // ---- 渲染 ----
  const containerStyle = maxHeight ? { height: maxHeight } : undefined;

  // 提示词：自定义或默认
  const displayPrompts = customPrompts ?? suggestedPrompts;
  const handlePromptClick = onPromptClick
    ? (info: { data: { description?: React.ReactNode } }) => {
        if (typeof info.data.description === 'string') onPromptClick(info.data.description);
      }
    : (info: { data: { description?: React.ReactNode } }) => {
        if (typeof info.data.description === 'string') handleSend(info.data.description);
      };

  return (
    <div className={`${styles.pageContainer} ${className ?? ''}`} style={containerStyle}>
      {/* Sidebar + sidebarExtra 插槽 */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        isConversationsLoading={isConversationsLoading}
        isSending={isSending}
        agents={agents}
        mediaUrl={adapter.mediaUrl}
        onStartNewChat={handleStartNewChat}
        onEnterConversation={enterConversation}
        onDeleteConversation={handleDeleteConversation}
        deleteConfirmState={deleteConfirmState}
        locale={locale}
        extra={sidebarExtra}
      />

      <div className={styles.mainContent}>
        {/* Header + headerExtra 插槽 + 模式切换 */}
        <ChatHeader
          viewState={viewState}
          onBackToList={backToList}
          displayAgentAvatarSrc={displayAgentAvatarSrc}
          displayAgent={displayAgent}
          currentConversation={currentConversation}
          title={title}
          extra={headerExtra}
          modes={modes}
          currentMode={currentMode}
          onModeChange={onModeChange}
        />

        <div className={styles.chatBody}>
          <div className={styles.chatContent} ref={scrollRef}>
            {/* 欢迎页（列表视图）+ welcomeExtra 插槽 */}
            {viewState === 'list' && (
              <ChatWelcome
                icon={<RobotOutlined className={styles.welcomeIcon} />}
                title={agents[0] ? `我是 ${agents[0].name}` : 'AI Chat'}
                description={agents[0]?.description || '选择一个历史对话，或直接在下方输入问题开始新对话'}
                extra={welcomeExtra}
              />
            )}

            {/* 欢迎页（聊天视图） */}
            {viewState === 'chat' && showWelcome && (
              <ChatWelcome
                icon={
                  displayAgentAvatarSrc ? (
                    <Avatar src={displayAgentAvatarSrc} size={64} style={{ border: '2px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  ) : (
                    <RobotOutlined className={styles.welcomeIcon} />
                  )
                }
                title={displayAgent ? `我是 ${displayAgent.name}` : '你好！有什么可以帮你的？'}
                description={displayAgent?.description || '我是你的 AI 助手，可以帮你创作内容、优化文案、回答问题。'}
                prompts={displayPrompts}
                onPromptClick={handlePromptClick}
                extra={welcomeExtra}
              />
            )}

            {/* 消息列表 + renderMessage 拦截器 */}
            {viewState === 'chat' && activeConversationId !== null && activeConversationId !== TEMP_CONVERSATION_ID && (
              <MessageList
                messages={messages}
                loading={isMessagesLoading}
                adminAvatar={adminAvatarSrc}
                displayAgent={displayAgent}
                mediaUrl={adapter.mediaUrl}
                renderMessage={renderMessage}
              />
            )}

            {/* 用户待发送消息 */}
            {pendingUserMessage && (
              <div className={styles.messageBubble} data-placement="end">
                <Bubble
                  placement="end"
                  content={pendingUserMessage}
                  avatar={
                    <Avatar
                      src={adminAvatarSrc}
                      className={styles.userAvatar}
                      icon={<UserOutlined />}
                    />
                  }
                />
              </div>
            )}

            {/* 流式响应 */}
            <StreamingBubble
              isSending={isSending}
              streamingAssistantMessage={streamingAssistantMessage}
              streamingReasoning={streamingReasoning}
              streamingToolCall={streamingToolCall}
              isReasoningExpanded={isReasoningExpanded}
              onReasoningToggle={setIsReasoningExpanded}
              displayAgentAvatarSrc={displayAgentAvatarSrc}
            />
          </div>

          {showScrollToBottom && (
            <Tooltip title="回到底部">
              <Button
                type="primary"
                shape="circle"
                icon={<VerticalAlignBottomOutlined />}
                onClick={() => scrollToBottom('smooth')}
                className={styles.scrollToBottomButton}
              />
            </Tooltip>
          )}
        </div>

        {/* 输入区域 + toolbarExtra 插槽 */}
        <div className={styles.senderWrapper}>
          {toolbarExtra && (
            <div className={styles.toolbarExtraWrapper}>
              {toolbarExtra}
            </div>
          )}

          {agentPicker && agents.length > 0 && (
            <SenderToolbar
              selectedAgentId={selectedAgentId}
              onAgentChange={setSelectedAgentId}
              agents={agents}
              isSending={isSending}
              selectedModelKey=""
              onModelChange={() => {}}
              modelOptions={[]}
              reasoningMode={reasoningMode}
              onReasoningModeChange={setReasoningMode}
              mediaUrl={adapter.mediaUrl}
            />
          )}

          <div className={styles.senderContent}>
            <Sender
              value={content}
              onChange={setContent}
              onSubmit={(value) => {
                if (viewState === 'list') handleStartNewChat();
                handleSend(value);
              }}
              loading={isSending}
              onCancel={handleStopStream}
              placeholder="输入你的问题..."
            />
          </div>

          {sendError && (
            <div className={styles.senderError}>
              <Typography.Text type="danger">{sendError}</Typography.Text>
            </div>
          )}
        </div>
      </div>

      <DeleteConversationModal
        open={deleteConfirmState.visible}
        loading={deleteConfirmState.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmState({ visible: false, conversationId: null, loading: false, hasDependencies: false, dependencyCount: 0 })}
        isDeleting={false}
        hasDependencies={deleteConfirmState.hasDependencies}
        dependencyCount={deleteConfirmState.dependencyCount}
      />
    </div>
  );
};
