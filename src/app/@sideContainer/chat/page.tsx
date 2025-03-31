'use client';

import { Conversations } from '@ant-design/x';
import { Input, Button, theme, message } from 'antd';
import { SearchOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useChatStore } from '@/stores/chatStore';
import type { ConversationsProps } from '@ant-design/x';
import type { GetProp } from 'antd';
import { useEffect, useState } from 'react';

export default function ChatSideContainer() {
  const [messageApi, contextHolder] = message.useMessage();
  const { token } = theme.useToken();
  const { conversationHistory, currentConversationId, setCurrentConversationId, deleteConversation, createConversation } = useChatStore();
  const [items, setItems] = useState<GetProp<ConversationsProps, 'items'>>([]);
  const [deletedConversationId, setDeletedConversationId] = useState<string | null>(null);

  useEffect(() => {
    const newItems = Object.values(conversationHistory).map(conversation => ({
      key: conversation.id,
      label: conversation.title,
      timestamp: new Date(conversation.time).getTime()
    }));
    setItems(newItems);
  }, [conversationHistory]);

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

  const menuConfig: ConversationsProps['menu'] = (conversation) => ({
    items: [
      {
        label: '编辑',
        key: 'edit',
        icon: <EditOutlined />,
      },
      {
        label: '删除',
        key: 'delete',
        icon: <DeleteOutlined />,
        danger: true,
      }
    ],
    onClick: (menuInfo) => {
      if (menuInfo.key === 'delete') {
        deleteConversation(conversation.key as string);
        setDeletedConversationId(conversation.key as string);
      }
    },
  });

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
      <Conversations
        className="flex-1"
        items={items.filter(item => !item.id && !item.title)}
        menu={menuConfig}
        activeKey={currentConversationId || undefined}
        onActiveChange={(key) => setCurrentConversationId(key)}
        style={{
          background: token.colorBgContainer,
          borderRadius: token.borderRadius,
        }}
      />
      <div className="p-4 border-t">
        <Button onClick={() => createConversation('新对话')} type="primary" block icon={<PlusOutlined />}>
          新建会话
        </Button>
      </div>
    </div>
  );
}