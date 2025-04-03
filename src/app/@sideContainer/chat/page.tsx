'use client';

import { Input, Button, theme, message, Modal } from 'antd';
import { SearchOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useChatStore } from '@/stores/chatStore';
import { useEffect, useState, useCallback, memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

export default function ChatSideContainer() {
  const [messageApi, contextHolder] = message.useMessage();
  const { token } = theme.useToken();
  const { conversationHistory, currentConversationId, setCurrentConversationId, deleteConversation, createConversation, resetConversationTitle } = useChatStore();
  const [items, setItems] = useState<Array<{ id: string; title: string; created_time: string }>>([]);
  const [deletedConversationId, setDeletedConversationId] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState('');
  const [deletingConversationId, setDeletingConversationId] = useState('');
  const [newTitle, setNewTitle] = useState('');

  // 1. 使用 useMemo 优化 items 列表
  const memoizedItems = useMemo(() => {
    return Object.values(conversationHistory).map(conversation => ({
      id: conversation.id,
      title: conversation.title,
      created_time: conversation.time
    }));
  }, [conversationHistory,currentConversationId]);

  // 2. 使用 useEffect 更新 items 状态
  useEffect(() => {
    setItems(memoizedItems);
  }, [memoizedItems]);

  // 处理删除成功提示
  useEffect(() => {
    if (deletedConversationId) {
      messageApi.open({
        type: 'success',
        content: '删除成功',
      });
      setDeletedConversationId(null);
    }
  }, [deletedConversationId, messageApi]);

  const handleDelete = useCallback((id: string) => {
    setDeletingConversationId(id);
    setIsDeleteModalVisible(true);
  }, []);

  const confirmDelete = useCallback(() => {
    deleteConversation(deletingConversationId);
    setDeletedConversationId(deletingConversationId);
    setIsDeleteModalVisible(false);
  }, [deletingConversationId, deleteConversation]);

  const handleEdit = useCallback((id: string) => {
    const conversation = conversationHistory[id];
    if (conversation) {
      setEditingConversationId(id);
      setNewTitle(conversation.title);
      setIsEditModalVisible(true);
    }
  }, [conversationHistory]);

  const handleSaveTitle = useCallback(() => {
    if (newTitle.trim()) {
      resetConversationTitle(editingConversationId, newTitle);
      messageApi.success('修改成功');
    } else {
      messageApi.error('标题不能为空');
      return;
    }
    setIsEditModalVisible(false);
  }, [editingConversationId, newTitle, resetConversationTitle, messageApi]);

  // 3. 使用 memo 优化 Row 组件
  const MemoizedRow = memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    return (
      <div
        style={style}
        className={`rounded-md p-2 cursor-pointer ${item.id === currentConversationId ? 'bg-blue-100' : ''}`}
        onClick={() => setCurrentConversationId(item.id)}
      >
        <div className="flex justify-between items-center">
          <span>{(item.title===''||item.title==null)?'新对话':item.title}</span>
          <div>
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(item.id);
              }} 
            />
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(item.id);
              }} 
            />
          </div>
        </div>
      </div>
    );
  });

  // 4. 添加列表高度动态计算
  const [listHeight, setListHeight] = useState(500);

  useEffect(() => {
    const calculateHeight = () => {
      const windowHeight = window.innerHeight;
      const offset = 120; // 根据其他UI元素高度调整
      setListHeight(windowHeight - offset);
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, []);

  return (
    <div className="overflow-scroll h-full">
      {contextHolder}
      <div className="m-4 mb-0 border-b">
        <Input
          placeholder="搜索聊天记录"
          prefix={<SearchOutlined />}
          allowClear
        />
      </div>
      <div className="flex-1 p-2" style={{ height: 'calc(100% - 120px)' }}>
        <List
          height={listHeight}
          itemCount={items.length}
          itemSize={50}
          width="100%"
          itemData={items} // 5. 添加itemData属性
          overscanCount={5} // 6. 添加overscanCount提升滚动性能
        >
          {MemoizedRow}
        </List>
      </div>
      <div className="p-4 border-t">
        <Button onClick={() => createConversation('')} type="primary" block icon={<PlusOutlined />}>
          新建会话
        </Button>
      </div>

      <Modal
        title="修改会话名称"
        open={isEditModalVisible}
        onOk={handleSaveTitle}
        onCancel={() => setIsEditModalVisible(false)}
      >
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="请输入新的会话名称"
        />
      </Modal>

      <Modal
        title="确认删除"
        open={isDeleteModalVisible}
        onOk={confirmDelete}
        onCancel={() => setIsDeleteModalVisible(false)}
      >
        <p>确定要删除这个会话吗？此操作不可恢复。</p>
      </Modal>
    </div>
  );
}