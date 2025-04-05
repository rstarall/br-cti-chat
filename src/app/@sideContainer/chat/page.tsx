'use client';

import { Input, Button, theme, message, Modal, Skeleton } from 'antd';
import { SearchOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useChatStore } from '@/stores/chatStore';
import { useEffect, useState, useCallback, memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

export default function ChatSideContainer() {
  const [messageApi, contextHolder] = message.useMessage();
  const { conversationHistory, currentConversationId, setCurrentConversationId, deleteConversation, createConversation, resetConversationTitle } = useChatStore();
  const [items, setItems] = useState<Array<{ id: string; title: string; created_time: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isInit, setIsInit] = useState(false);
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
  }, [conversationHistory, currentConversationId]);

  const getSortedItems = useCallback(() => {
    // 修改排序逻辑，使最新的对话排在最前面（降序排列）
    const sortedItems = memoizedItems.sort((a, b) => (new Date(b.created_time).getTime() - new Date(a.created_time).getTime()));
    if(!isInit){
      if(sortedItems.length>0){
        setCurrentConversationId(sortedItems[0].id);
        setIsInit(true);
      }
      
    }
    return sortedItems;
  }, [memoizedItems]);

  // 2. 使用 useEffect 更新 items 状态
  useEffect(() => {
    setItems(getSortedItems());
    setLoading(false);
  }, [getSortedItems]);

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
        <div className="flex justify-between items-center ">
          <span className='overflow-hidden text-ellipsis whitespace-nowrap'>{(item.title===''||item.title==null)?'新对话':item.title}</span>
          <div className='flex items-center gap-2'>
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
      const offset = 200; // 根据其他UI元素高度调整
      setListHeight(windowHeight+offset);
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, []);

  return (
    <div className="h-full relative">
      {contextHolder}
      <div className="p-4 pb-3 border-b h-[60px]">
        <Input
          placeholder="搜索聊天记录"
          prefix={<SearchOutlined />}
          allowClear
        />
      </div>
      <div  className="p-2 z-0 h-[calc(100%-100px)] w-full">
      <Skeleton loading={loading} active>
        <List
          className='z-0'
          height={listHeight}
          itemCount={items.length}
          itemSize={50}
          width="100%"
          itemData={items} // 5. 添加itemData属性
          overscanCount={5} // 6. 添加overscanCount提升滚动性能
        >
          {MemoizedRow}
        </List>
        </Skeleton>
      </div>
      <div className="absolute bottom-0 left-0 border-t p-4 bg-white  w-[calc(100%-10px)] h-[90px] z-10">
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