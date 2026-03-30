import React from 'react';
import { Avatar, Collapse, Space, Tag } from 'antd';
import { InfoCircleOutlined, RobotOutlined } from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '../../styles/ChatWindow.module.css';

interface StreamingBubbleProps {
  isSending: boolean;
  streamingAssistantMessage: string;
  streamingReasoning: string;
  streamingToolCall: string;
  isReasoningExpanded: boolean;
  onReasoningToggle: (expanded: boolean) => void;
  displayAgentAvatarSrc?: string;
}

export const StreamingBubble: React.FC<StreamingBubbleProps> = ({
  isSending,
  streamingAssistantMessage,
  streamingReasoning,
  streamingToolCall,
  isReasoningExpanded,
  onReasoningToggle,
  displayAgentAvatarSrc,
}) => {
  if (!isSending && !streamingAssistantMessage && !streamingReasoning && !streamingToolCall) return null;

  const hasAssistantContent = streamingAssistantMessage.length > 0;
  const hasReasoningContent = streamingReasoning.length > 0;
  const hasToolCallContent = streamingToolCall.length > 0;

  const avatar = displayAgentAvatarSrc ? (
    <Avatar src={displayAgentAvatarSrc} />
  ) : (
    <Avatar icon={<RobotOutlined />} className={styles.assistantAvatar} />
  );

  return (
    <div className={styles.streamingBubble}>
      <Bubble
        placement="start"
        avatar={avatar}
        content={
          <div className={styles.streamingContent}>
            {hasReasoningContent && (
              <Collapse
                size="small"
                activeKey={isReasoningExpanded ? ['reasoning'] : []}
                onChange={(keys) => onReasoningToggle(Array.isArray(keys) ? keys.includes('reasoning') : keys === 'reasoning')}
                className={styles.reasoningCollapse}
                items={[
                  {
                    key: 'reasoning',
                    label: (
                      <Space size={8}>
                        <InfoCircleOutlined />
                        <span>查看思考过程</span>
                        <Tag color="default">默认折叠</Tag>
                      </Space>
                    ),
                    children: (
                      <div className={styles.reasoningText}>{streamingReasoning}</div>
                    ),
                  },
                ]}
              />
            )}

            {hasToolCallContent && !hasAssistantContent && (
              <div className={styles.streamingText}>
                <Tag color="processing">工具调用中...</Tag>
                <div>{streamingToolCall}</div>
              </div>
            )}

            {hasAssistantContent && (
              <div className={styles.streamingText}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {streamingAssistantMessage}
                </ReactMarkdown>
                {isSending && <span className={styles.cursor}></span>}
              </div>
            )}
          </div>
        }
      />
    </div>
  );
};
