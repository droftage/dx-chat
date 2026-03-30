import React from 'react';
import { Button, Tooltip, Avatar, Empty, Spin, Tag } from 'antd';
import { UserOutlined, RobotOutlined, CopyOutlined } from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AiMessage, AiAgentBrief } from '../../types';
import styles from '../../styles/ChatWindow.module.css';

interface MessageListProps {
  messages: AiMessage[];
  adminAvatar?: string;
  onAdminAvatarError?: () => boolean;
  displayAgent?: AiAgentBrief | null;
  loading: boolean;
  mediaUrl: (path: string) => string;
  onCopy?: (content: string) => void;
  /** 自定义消息渲染拦截器 */
  renderMessage?: (message: AiMessage, defaultRender: React.ReactNode) => React.ReactNode;
}

export const MessageList = React.memo(({
  messages,
  adminAvatar,
  onAdminAvatarError,
  displayAgent,
  loading,
  mediaUrl,
  onCopy,
  renderMessage,
}: MessageListProps) => {
  const getAssistantAvatarSrc = (msg: AiMessage) => {
    const avatar = msg.agent?.avatar ?? displayAgent?.avatar ?? '';
    const url = mediaUrl(avatar);
    return url || undefined;
  };

  const handleCopy = (content: string) => {
    if (!content) return;
    if (onCopy) {
      onCopy(content);
    } else {
      navigator.clipboard.writeText(content).catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <Spin size="large" />
        <div className={styles.loadingText}>加载消息中...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="此对话暂无消息" />;
  }

  return (
    <>
      {messages.map((msg) => {
        const defaultContent = (
          <div className={styles.messageContent}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        );

        const renderedContent = renderMessage
          ? renderMessage(msg, defaultContent)
          : defaultContent;

        return (
          <div
            key={msg.id}
            className={styles.messageBubble}
            data-placement={msg.role === 'user' ? 'end' : 'start'}
          >
            <div className={styles.messageHeader}>
              <span className={styles.messageName}>
                {msg.role === 'user' ? '我' : (msg.agent?.name || displayAgent?.name || 'AI')}
              </span>
            </div>
            <div className={styles.toolbarWrapper}>
              <div className={styles.toolbar}>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopy(msg.content)}
                  title="复制内容"
                />
              </div>
            </div>
            <Bubble
              placement={msg.role === 'user' ? 'end' : 'start'}
              avatar={
                msg.role === 'user' ? (
                  <Avatar
                    src={adminAvatar}
                    className={styles.userAvatar}
                    onError={onAdminAvatarError}
                    icon={<UserOutlined />}
                  />
                ) : (
                  <Avatar
                    src={getAssistantAvatarSrc(msg)}
                    className={styles.assistantAvatar}
                    icon={<RobotOutlined />}
                  />
                )
              }
              content={renderedContent}
            />
          </div>
        );
      })}
    </>
  );
});
