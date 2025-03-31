'use client';

import React, { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { Input, Button, List, Avatar } from 'antd';

const MCPPage: React.FC = () => {
  const { messages, streamResponse } = useChatStore();
  const [inputValue, setInputValue] = useState('');

  const handleSend = async () => {
    if (inputValue.trim()) {
      await streamResponse(inputValue);
      setInputValue('');
    }
  };

  const renderMessage = (item: any) => (
    <List.Item key={item.id}>
      <List.Item.Meta
        avatar={<Avatar>{item.role === 'user' ? 'U' : 'A'}</Avatar>}
        title={item.role === 'user' ? '用户' : '助手'}
        description={item.content}
      />
    </List.Item>
  );

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">MCP服务</h1>
      <div className="mb-4">
        <Input.TextArea 
          rows={2} 
          value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)} 
          placeholder="输入MCP服务地址..." 
        />
        <Button 
          type="primary" 
          onClick={handleSend} 
          className="mt-2"
        >
          添加
        </Button>
      </div>
      <List
        itemLayout="horizontal"
        dataSource={messages}
        renderItem={renderMessage}
      />
    </div>
  );
};

export default MCPPage;
