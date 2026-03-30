import React from 'react';
import { Modal, Space, Spin } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import styles from '../../styles/ChatWindow.module.css';

interface DeleteConversationModalProps {
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  hasDependencies?: boolean;
  dependencyCount?: number;
}

export const DeleteConversationModal: React.FC<DeleteConversationModalProps> = ({
  open,
  loading,
  onConfirm,
  onCancel,
  isDeleting,
  hasDependencies = false,
  dependencyCount = 0,
}) => {
  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleFilled className={styles.warningIcon} />
          <span>确认删除对话</span>
        </Space>
      }
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      confirmLoading={isDeleting}
      okText="确认删除"
      cancelText="取消"
      okButtonProps={{ danger: true }}
    >
      {loading ? (
        <div className={styles.modalLoading}>
          <Spin tip="正在检查关联数据..." />
        </div>
      ) : hasDependencies && dependencyCount > 0 ? (
        <div>
          此对话关联了 {dependencyCount} 个报告。删除后这些报告的 AI 分析记录将被清除，但报告本身会保留。
          确定要删除吗？
        </div>
      ) : (
        <div>确定要删除此对话吗？删除后将无法恢复。</div>
      )}
    </Modal>
  );
};
