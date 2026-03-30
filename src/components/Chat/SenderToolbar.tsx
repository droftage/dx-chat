import React from 'react';
import { Space, Select, Avatar, Radio } from 'antd';
import { RobotOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { AiAgentBrief } from '../../types';
import styles from '../../styles/ChatWindow.module.css';

interface SenderToolbarProps {
  selectedAgentId: number | null;
  onAgentChange: (id: number) => void;
  agents: AiAgentBrief[];
  isSending: boolean;
  selectedModelKey: string;
  onModelChange: (key: string) => void;
  modelOptions: Array<{ value: string; label: string }>;
  reasoningMode: 'fast' | 'thinking';
  onReasoningModeChange: (mode: 'fast' | 'thinking') => void;
  mediaUrl: (path: string) => string;
}

export const SenderToolbar: React.FC<SenderToolbarProps> = ({
  selectedAgentId,
  onAgentChange,
  agents,
  isSending,
  selectedModelKey,
  onModelChange,
  modelOptions,
  reasoningMode,
  onReasoningModeChange,
  mediaUrl,
}) => {
  return (
    <div className={styles.senderHeader}>
      <Space size="middle" wrap>
        <div className={styles.configGroup}>
          <Select
            size="small"
            value={selectedAgentId}
            onChange={onAgentChange}
            options={agents.map((a) => ({
              label: (
                <Space size={4}>
                  {a.avatar ? (
                    <Avatar src={mediaUrl(a.avatar) || undefined} size={16} />
                  ) : (
                    <RobotOutlined />
                  )}
                  <span>{a.name}</span>
                </Space>
              ),
              value: a.id,
            }))}
            className={styles.agentSwitcher}
            disabled={isSending}
            popupMatchSelectWidth={false}
            title="切换 AI 角色"
            variant="borderless"
          />
          {modelOptions.length > 0 && (
            <>
              <div className={styles.configDivider} />
              <Select
                size="small"
                value={selectedModelKey}
                onChange={onModelChange}
                options={modelOptions}
                className={styles.modelSelect}
                disabled={isSending}
                title="选择模型"
                variant="borderless"
              />
            </>
          )}
        </div>

        <Radio.Group
          value={reasoningMode}
          onChange={(e) => onReasoningModeChange(e.target.value)}
          size="small"
          optionType="button"
          buttonStyle="solid"
          disabled={isSending}
          className={styles.modeSwitch}
        >
          <Radio.Button value="fast">⚡ 快速</Radio.Button>
          <Radio.Button value="thinking">
            <ThunderboltOutlined /> 思考
          </Radio.Button>
        </Radio.Group>
      </Space>
    </div>
  );
};
