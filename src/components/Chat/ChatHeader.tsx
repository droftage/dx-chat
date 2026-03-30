import React from 'react';
import { Button, Avatar, Space, Typography, Radio, Tooltip } from 'antd';
import { ArrowLeftOutlined, RobotOutlined } from '@ant-design/icons';
import type { AiAgentBrief, AiConversation } from '../../types';
import styles from '../../styles/ChatWindow.module.css';

const { Title } = Typography;

export interface ChatMode {
  key: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  disabledTooltip?: string;
}

interface ChatHeaderProps {
  viewState: 'list' | 'chat';
  onBackToList: () => void;
  displayAgentAvatarSrc?: string;
  displayAgent?: AiAgentBrief | null;
  currentConversation?: AiConversation | null;
  title?: string;
  extra?: React.ReactNode;
  modes?: ChatMode[];
  currentMode?: string;
  onModeChange?: (mode: string) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  viewState,
  onBackToList,
  displayAgentAvatarSrc,
  displayAgent,
  currentConversation,
  title,
  extra,
  modes,
  currentMode,
  onModeChange,
}) => {
  const displayTitle = title || displayAgent?.name || currentConversation?.title || 'AI Chat';

  return (
    <div className={styles.chatHeader}>
      <Space>
        {viewState === 'chat' && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBackToList}
            className={styles.backButton}
          >
            返回
          </Button>
        )}
        {displayAgentAvatarSrc ? (
          <Avatar src={displayAgentAvatarSrc} size={32} />
        ) : (
          <RobotOutlined />
        )}
        <Title level={5} className={styles.chatTitle}>
          {displayTitle}
        </Title>

        {/* 模式切换 */}
        {modes && modes.length > 0 && currentMode && onModeChange && (
          <Radio.Group
            value={currentMode}
            onChange={(e) => onModeChange(e.target.value)}
            size="small"
            optionType="button"
            buttonStyle="solid"
            className={styles.modeSwitch}
          >
            {modes.map((mode) => {
              const btn = (
                <Radio.Button
                  key={mode.key}
                  value={mode.key}
                  disabled={mode.disabled}
                >
                  {mode.icon} {mode.label}
                </Radio.Button>
              );
              return mode.disabled && mode.disabledTooltip ? (
                <Tooltip key={mode.key} title={mode.disabledTooltip}>
                  {btn}
                </Tooltip>
              ) : btn;
            })}
          </Radio.Group>
        )}
      </Space>
      {extra && <div className={styles.headerExtraSlot}>{extra}</div>}
    </div>
  );
};
