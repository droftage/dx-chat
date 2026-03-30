import React from 'react';
import { Welcome, Prompts } from '@ant-design/x';
import styles from '../../styles/ChatWindow.module.css';

interface ChatWelcomeProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  prompts?: Array<{ key: string; label: string; description: string; icon?: React.ReactNode }>;
  onPromptClick?: (info: { data: { description?: React.ReactNode } }) => void;
  /** 底部插槽 */
  extra?: React.ReactNode;
}

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({
  icon,
  title,
  description,
  prompts,
  onPromptClick,
  extra,
}) => {
  return (
    <div className={styles.welcomeContainer}>
      <Welcome icon={icon} title={title} description={description} />
      {prompts && prompts.length > 0 && (
        <Prompts
          items={prompts}
          onItemClick={onPromptClick}
          className={styles.welcomePrompts}
        />
      )}
      {extra && <div className={styles.welcomeExtra}>{extra}</div>}
    </div>
  );
};
