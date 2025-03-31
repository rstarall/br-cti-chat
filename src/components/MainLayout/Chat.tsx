"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  XProvider, 
  Bubble, 
  Sender
} from '@ant-design/x';
import { Avatar } from 'antd';
import { useChatStore, Message } from '../../stores/chatStore';

const Chat: React.FC = () => {
  const [value, setValue] = useState(''); // 受控输入值
  const conversationsRef = useRef<HTMLDivElement>(null);
  const senderRef = useRef<any>(null);
  const { currentConversationId, setCurrentConversationId,appendMessage, streamRequest, createConversation, conversationHistory } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  
  // 初始化消息
  useEffect(() => {
    if(Object.keys(conversationHistory).length === 0){
      const newConversationId = createConversation('新对话');
      setCurrentConversationId(newConversationId);
      appendMessage(newConversationId,{
        id: Date.now().toString(),
        role: 'assistant',
        content: '你好！我是安全智能问答助手，有什么可以帮助你的吗？'
      });
    }else{
      const lastConversationId = Object.keys(conversationHistory).pop();
      if(lastConversationId){
        setCurrentConversationId(lastConversationId);
      }
    }
  }, []);

  // 监听currentConversationId的变化并更新messages
  useEffect(() => {
    if (currentConversationId) {
      const currentMessages = conversationHistory[currentConversationId]?.messages || [];
      setMessages(currentMessages);
    }
  }, [conversationHistory, currentConversationId]);

  // 自动滚动到底部
  useEffect(() => {
    if (conversationsRef.current) {
      const element = conversationsRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);



  const handleSubmit = async (content: string) => {
    console.log('提交消息:', content); // 调试日志
    if (!content.trim()) return;
    //如果当前没有会话，则创建一个
    if(currentConversationId == ''){
      const newConversationId = createConversation(content.slice(0,10));
      setCurrentConversationId(newConversationId);
    }

    // 添加用户消息
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    messages.map(msg => {
      appendMessage(currentConversationId,msg);
    });
    setValue(''); // 清空输入框
    


    // 使用真实接口请求
    try {
      await streamRequest(currentConversationId, content);
    } catch (error) {
      console.error('请求失败:', error);
    }
  };

  

  // 在渲染前添加调试日志
  console.log('当前消息列表:', messages);
  console.log('当前会话ID:', currentConversationId);

  return (
    <XProvider>
      <div className='h-[calc(100vh-50px)] bg-white relative overflow-scroll' style={{ 
        backgroundImage: "url('./Q&A.png')",
        backgroundSize: '85%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        {/* 对话区域 */}
        <div 
          ref={conversationsRef}
          className='bg-white overflow-y-scroll'
          style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: '20px',
            minHeight: '300px', // 添加最小高度
            display: 'flex', // 确保内容可以填充
            flexDirection: 'column', // 垂直排列
            backgroundColor: 'rgba(255, 255, 255, 0.1)', // 添加半透明背景
            opacity:1
          }}
        >
          <Bubble.List
            className='bg-white overflow-y-scroll'
            items={messages.map((msg, index) => ({
              key: index,
              content: msg.content,
              placement: msg.role === 'user' ? 'end' :'start',
              variant: msg.role === 'user' ? 'filled' : 'outlined',
              loading: msg.loading,
              typing: msg.role === 'assistant' && msg.streaming && !msg.loading,
              shape: 'round',
              avatar: msg.role === 'assistant' ? <Avatar>AI</Avatar> : undefined
            }))}
            autoScroll={true}
          />
          
          {/* 显示消息数量 */}
          <div style={{ position: 'absolute', top: 0, right: 0, background: '#f0f0f0', padding: '2px 5px', fontSize: '12px' }}>
            消息数: {messages.length}
          </div>
        </div>
        
        {/* 输入区域 */}
        <div className='fixed bottom-[0]  right-0 w-[calc(100%-400px)] bg-white' style={{ padding: '20px', borderTop: '1px solid #eee' }}>
          <Sender
            ref={senderRef}
            value={value}
            onChange={(val) => setValue(val)}
            onSubmit={handleSubmit}
            placeholder="请输入消息..."
            submitType="enter"
          />
        </div>
      </div>
    </XProvider>
  );
};

export default Chat; 