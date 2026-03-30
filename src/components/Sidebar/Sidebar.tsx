import React from 'react';
import { Button, Tooltip, Avatar, Empty, Spin } from 'antd';
import { PlusOutlined, RobotOutlined, ClearOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { AiConversation, AiAgentBrief } from '../../types';
import styles from '../../styles/ChatWindow.module.css';

interface SidebarProps {
  conversations: AiConversation[];
  activeConversationId: number | null;
  isConversationsLoading: boolean;
  isSending: boolean;
  agents: AiAgentBrief[];
  mediaUrl: (path: string) => string;
  onStartNewChat: () => void;
  onEnterConversation: (id: number) => void;
  onDeleteConversation: (id: number, e: React.MouseEvent) => void;
  deleteConfirmState: { conversationId: number | null; loading: boolean };
  locale?: 'zh' | 'en';
  /** 底部插槽 */
  extra?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  isConversationsLoading,
  isSending,
  agents,
  mediaUrl,
  onStartNewChat,
  onEnterConversation,
  onDeleteConversation,
  deleteConfirmState,
  locale = 'zh',
  extra,
}) => {
  const isNewChat = locale === 'zh' ? '新建对话' : 'New Chat';
  const noConversations = locale === 'zh' ? '暂无对话记录' : 'No conversations';
  const untitled = locale === 'zh' ? '未命名对话' : 'Untitled';
  const newConv = locale === 'zh' ? '新对话' : 'New';

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          block
          onClick={onStartNewChat}
          loading={isSending}
        >
          {isNewChat}
        </Button>
      </div>
      <div className={styles.conversationList}>
        {isConversationsLoading ? (
          <div className={styles.loadingWrapper}><Spin /></div>
        ) : conversations.length > 0 ? (
          conversations.map((conv) => {
            const lastAgentAvatar = conv.last_agent?.avatar;
            const fallbackAgent = conv.ai_agent_id ? agents.find(a => a.id === conv.ai_agent_id) : null;
            const avatarSrc = mediaUrl(lastAgentAvatar ?? fallbackAgent?.avatar ?? '') || undefined;
            const agentName = conv.last_agent?.name ?? fallbackAgent?.name;

            return (
              <Tooltip key={conv.id} title={conv.title || untitled} placement="right" mouseEnterDelay={0.5}>
                <div
                  className={`${styles.conversationItem} ${activeConversationId === conv.id ? styles.conversationItemActive : ''}`}
                  onClick={() => onEnterConversation(conv.id)}
                >
                  <Tooltip title={agentName} placement="top">
                    {avatarSrc ? (
                      <Avatar src={avatarSrc} size={40} className={styles.conversationAvatar} />
                    ) : (
                      <Avatar icon={<RobotOutlined />} size={40} className={styles.conversationAvatar} />
                    )}
                  </Tooltip>
                  <div className={styles.conversationInfo}>
                    <div className={styles.conversationTitle}>{conv.title || newConv}</div>
                    <div className={styles.conversationTime}>
                      {conv.last_message_at
                        ? dayjs(conv.last_message_at).format('MM-DD HH:mm')
                        : dayjs(conv.created_at).format('MM-DD HH:mm')}
                    </div>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<ClearOutlined />}
                    className={styles.deleteButton}
                    onClick={(e) => onDeleteConversation(conv.id, e)}
                    loading={deleteConfirmState.conversationId === conv.id && deleteConfirmState.loading}
                  />
                </div>
              </Tooltip>
            );
          })
        ) : (
          <div className={styles.emptyWrapper}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={noConversations} />
          </div>
        )}
      </div>
      {extra && <div className={styles.sidebarExtra}>{extra}</div>}
    </div>
  );
};
