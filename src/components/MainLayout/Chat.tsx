"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import type { BubbleProps } from '@ant-design/x';
import { 
  XProvider, 
  Bubble, 
  Sender
} from '@ant-design/x';
import { Avatar, Typography } from 'antd';
import { useChatStore, Message, RetrievalContext } from '../../stores/chatStore';
import MarkdownRenderer from './Markdown';
import { UpOutlined, DownOutlined } from '@ant-design/icons';

const MemoizedMarkdownRenderer = memo(({ content }: { content: string }) => (
  <Typography>
    <MarkdownRenderer content={content} />
  </Typography>
));

const MemoizedRetrievalContextRenderer = memo(({ retrievalContexts }: { retrievalContexts: RetrievalContext[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className='p-2 bg-white rounded-md shadow-md mb-2'>
      <div 
        className='flex justify-between items-center cursor-pointer' 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Typography.Text strong style={{ fontSize: '14px' }}>相关信息({retrievalContexts.length})</Typography.Text>
        <div className='h-[20px] text-gray-500 flex items-center justify-center px-2'>
          {isExpanded ? <UpOutlined /> : <DownOutlined />}
        </div>
      </div>
      {isExpanded && (
        <div className='mt-2'>
          <Typography.Paragraph>
            {retrievalContexts.map((context, index) => (
              <Typography.Text key={index}>
                {context.source}
                {index < retrievalContexts.length - 1 && <br />}
              </Typography.Text>
            ))}
          </Typography.Paragraph>
        </div>
      )}
    </div>
  );
});


const Chat: React.FC = () => {
  const [value, setValue] = useState('');
  const conversationsRef = useRef<any>(null);
  const senderRef = useRef<any>(null);
  const containerRef = useRef<any>(null);
  const bottomRef = useRef<any>(null);
  const { currentConversationId, setCurrentConversationId, appendMessage, streamRequest, createConversation, conversationHistory } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const prevMessagesRef = useRef<Message[]>([]);
  
  // 初始化消息 - 优化初始化逻辑
  useEffect(() => {
    if (!currentConversationId && Object.keys(conversationHistory).length === 0) {
      const newConversationId = createConversation('');
      setCurrentConversationId(newConversationId);
      appendMessage(newConversationId, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '你好！我是安全智能问答助手，有什么可以帮助你的吗？'
      });
    } else if (!currentConversationId) {
      const lastConversationId = Object.keys(conversationHistory)[Object.keys(conversationHistory).length-1];
      if (lastConversationId) {
        setCurrentConversationId(lastConversationId);
      }
    }
    autoScrollToBottom();
  }, []); // 只在组件挂载时执行一次

  // 优化消息更新逻辑
  useEffect(() => {
    if (!currentConversationId) return;
    
    const currentMessages = conversationHistory[currentConversationId]?.messages || [];
    const prevMessages = prevMessagesRef.current;
    
    if (!Array.isArray(currentMessages)) return;
    
    const hasChanged = currentMessages.length !== prevMessages.length ||
      JSON.stringify(currentMessages) !== JSON.stringify(prevMessages);
    
    if (hasChanged) {
      prevMessagesRef.current = currentMessages;
      setMessages(currentMessages);
      
      // 合并滚动逻辑到消息更新中
      autoScrollToBottom();
    }
  }, [currentConversationId, conversationHistory]);

  const autoScrollToBottom = useCallback(() => {
    //延迟100ms后执行
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  // 优化提交处理函数
  const handleSubmit = async (content: string) => {
    if (!content.trim()) return;
    
    if (!currentConversationId) {
      const newConversationId = createConversation('');
      setCurrentConversationId(newConversationId);
    }
    setValue('');
    try {
      await streamRequest(currentConversationId, content);
    } catch (error) {
      console.error('请求失败:', error);
    }
  };

  // 使用 useMemo 缓存消息渲染函数
  const messageRenderer = useMemo(() => {
    return (content: string) => <MemoizedMarkdownRenderer content={content} />;
  }, []);

  const retrievalContextRenderer = useMemo(() => {
    //useMemo避免信息重复计算
    return (retrievalContexts: RetrievalContext[]) => <MemoizedRetrievalContextRenderer retrievalContexts={retrievalContexts} />;
  }, []);

  // 优化 commonBubble，添加 Markdown 到依赖数组
  const commonBubble = useCallback((msg: Message) => {
    return {
      key: msg.id,
      content: msg.content,
      messageRender: messageRenderer, //渲染函数
      placement: msg.role === 'user' ? 'end' as const : 'start' as const,
      variant: msg.role === 'user' ? 'filled' as const : 'outlined' as const,
      loading: msg.loading,
      typing: msg.role === 'assistant' && msg.streaming && !msg.loading,
      shape: 'round' as const,
      avatar: msg.role === 'assistant' ? <Avatar>AI</Avatar> : undefined,
      className: 'p-0',
      contentClassName: 'flex justify-center items-center mb-[-12px]', // 使用contentClassName来控制内容区域的样式
      header: msg.retrievalContexts ? retrievalContextRenderer(msg.retrievalContexts) : undefined
    } as BubbleProps;
  }, [messageRenderer, retrievalContextRenderer]); // 添加retrievalContextRenderer到依赖数组

  return (
    <XProvider>
      <div ref={containerRef} className='h-[calc(100vh-50px)] bg-white relative overflow-auto' style={{ 
        backgroundImage: "url('./Q&A.png')",
        backgroundSize: '85%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        <div 
          ref={conversationsRef}
          className='bg-white'
          style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: '20px',
            minHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            opacity: 1
          }}
        >
          <Bubble.List
            className='bg-white pb-[100px] overflow-hidden'
            items={messages.map((msg) => commonBubble(msg))}
          />
          
          <div style={{ position: 'absolute', top: 0, right: 0, background: '#f0f0f0', padding: '2px 5px', fontSize: '12px' }}>
            消息数: {messages.length}
          </div>
        </div>
        
        <div className='fixed bottom-[0] right-0 w-[calc(100%-400px)] bg-white' style={{ padding: '20px', borderTop: '1px solid #eee' }}>
          <Sender
            ref={senderRef}
            value={value}
            onChange={setValue}
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
