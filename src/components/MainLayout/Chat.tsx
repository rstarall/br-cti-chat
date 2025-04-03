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
  const conversationsRef = useRef<any>(null);
  const senderRef = useRef<any>(null);
  const containerRef = useRef<any>(null);
  const { currentConversationId, setCurrentConversationId, appendMessage, streamRequest, createConversation, conversationHistory } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const prevMessagesRef = useRef<Message[]>([]);
  
  // 初始化消息
  useEffect(() => {
    // 添加延迟确保数据加载
    const initializeMessages = setTimeout(() => {
      console.log('conversationHistory', conversationHistory);
      if(Object.keys(conversationHistory).length === 0){
        const newConversationId = createConversation('');
        setCurrentConversationId(newConversationId);
        appendMessage(newConversationId, {
          id: Date.now().toString(),
          role: 'assistant',
          content: '你好！我是安全智能问答助手，有什么可以帮助你的吗？'
        });
      } else {
        const lastConversationId = Object.keys(conversationHistory)[Object.keys(conversationHistory).length-1];
        if(lastConversationId){
          setCurrentConversationId(lastConversationId);
        }
      }
    }, 100); // 添加100ms延迟

    // 清理函数
    return () => clearTimeout(initializeMessages);
  }, [conversationHistory]);

  // 监听currentConversationId和conversationHistory的变化并更新messages
  useEffect(() => {
    if (currentConversationId) {
      const currentMessages = conversationHistory[currentConversationId]?.messages || [];
      
      // 只有当消息内容真正发生变化时才更新状态
      const messagesChanged = 
        prevMessagesRef.current.length !== currentMessages.length || 
        currentMessages.some((msg, idx) => 
          !prevMessagesRef.current[idx] || 
          msg.content !== prevMessagesRef.current[idx].content ||
          msg.streaming !== prevMessagesRef.current[idx].streaming ||
          msg.loading !== prevMessagesRef.current[idx].loading
        );
        
      if (messagesChanged) {
        setMessages(currentMessages);
        prevMessagesRef.current = currentMessages;
      }
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
    console.log('提交消息:', content);
    if (!content.trim()) return;
    
    //如果当前没有会话，则创建一个
    if(currentConversationId == ''||currentConversationId == null||currentConversationId == undefined){
      createConversation('');
    }

    setValue(''); // 清空输入框

    // 使用真实接口请求
    try {
      await streamRequest(currentConversationId, content);
      
      // 确保滚动到底部
      if (conversationsRef.current) {
        // 使用 smooth 实现平滑滚动
        conversationsRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' // 或 'center'、'end'
        });
        containerRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' // 或 'center'、'end'
        });

      }
    } catch (error) {
      console.error('请求失败:', error);
    }
  };


  // 在渲染前添加调试日志
  console.log('当前消息列表:', messages);
  console.log('当前会话ID:', currentConversationId);

  return (
    <XProvider>
      <div ref={containerRef} className='h-[calc(100vh-50px)] bg-white relative overflow-scroll' style={{ 
        backgroundImage: "url('./Q&A.png')",
        backgroundSize: '85%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        {/* 对话区域 */}
        <div 
          ref={conversationsRef}
          className='bg-white'
          style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: '20px',
            minHeight: '300px', // 添加最小高度
            display: 'flex', // 确保内容可以填充
            flexDirection: 'column', // 垂直排列
            backgroundColor: 'rgba(255, 255, 255, 0.1)', // 添加半透明背景
            opacity: 1
          }}
        >
          <Bubble.List
            className='bg-white pb-[100px]'
            items={messages.map((msg) => ({
              key: msg.id, // 只使用id作为key，确保稳定
              content: msg.content,
              placement: msg.role === 'user' ? 'end' :'start',
              variant: msg.role === 'user' ? 'filled' : 'outlined',
              loading: msg.loading,
              typing: msg.role === 'assistant' && msg.streaming && !msg.loading,
              shape: 'round',
              avatar: msg.role === 'assistant' ? <Avatar>AI</Avatar> : undefined
            }))}
          />
          
          {/* 显示消息数量 */}
          <div style={{ position: 'absolute', top: 0, right: 0, background: '#f0f0f0', padding: '2px 5px', fontSize: '12px' }}>
            消息数: {messages.length}
          </div>
        </div>
        
        {/* 输入区域 */}
        <div className='fixed bottom-[0] right-0 w-[calc(100%-400px)] bg-white' style={{ padding: '20px', borderTop: '1px solid #eee' }}>
          <Sender
            ref={senderRef}
            value={value}
            onChange={(val) => setValue(val)}
            onSubmit={(content) => {
              handleSubmit(content);
              // 确保在提交后立即滚动到底部
              if (conversationsRef.current) {
                setTimeout(() => {
                  if (conversationsRef.current) {
                    conversationsRef.current.scrollTop = conversationsRef.current.scrollHeight;
                  }
                }, 0);
              }
            }}
            placeholder="请输入消息..."
            submitType="enter"
          />
        </div>
      </div>
    </XProvider>
  );
};

export default Chat; 