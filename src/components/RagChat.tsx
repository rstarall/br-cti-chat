import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { XProvider, Bubble, Sender } from '@ant-design/x';
import { Typography, message } from 'antd';
import { useRAGStore } from '../stores/ragstore';
import type { Message, RetrievalContext } from '../stores/ragstore';
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
        <Typography.Text strong style={{ fontSize: '14px' }}>
          相关信息({retrievalContexts.length})
        </Typography.Text>
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

const RAGChat: React.FC<{ siderWidth?: number }> = ({ siderWidth = 300 }) => {
  const [value, setValue] = useState('');
  const containerRef = useRef<any>(null);
  const senderRef = useRef<any>(null);
  const { messages, streamRequest } = useRAGStore();

  useEffect(() => {
    autoScrollToBottom();
  }, [messages]);

  const autoScrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  const handleSubmit = async (content: string) => {
    if (!content.trim()) return;
    setValue('');
    try {
      await streamRequest(content);
    } catch (error) {
      console.error('请求失败:', error);
      message.error('请求失败！');
    }
  };

  const messageRenderer = useMemo(() => {
    return (content: string) => {
      const cleanedContent = content.replace(/\{"type":\s*"conversation_full",\s*"data":\s*".*"\}$/g, '');
      return <MemoizedMarkdownRenderer content={cleanedContent} />;
    };
  }, []);

  const retrievalContextRenderer = useMemo(() => {
    return (retrievalContexts: RetrievalContext[]) => (
      <MemoizedRetrievalContextRenderer retrievalContexts={retrievalContexts} />
    );
  }, []);

  const commonBubble = useCallback(
    (msg: Message) => {
      return {
        key: msg.id,
        content: msg.content,
        messageRender: messageRenderer,
        placement: msg.role === 'user' ? 'end' as const : 'start' as const,
        variant: msg.role === 'user' ? 'filled' as const : 'outlined' as const,
        loading: msg.loading,
        typing: msg.role === 'assistant' && msg.streaming && !msg.loading,
        shape: 'round' as const,
        className: 'p-0',
        contentClassName: 'flex justify-center items-center mb-[-12px]',
        header: msg.retrievalContexts ? retrievalContextRenderer(msg.retrievalContexts) : undefined,
      };
    },
    [messageRenderer, retrievalContextRenderer]
  );

  return (
    <XProvider>
      <div className='h-full w-full relative bg-white'>
        {/* 聊天内容区 */}
        <div
          ref={containerRef}
          className='h-full overflow-auto pr-1 pb-[120px] pl-4 pt-4'
          style={{
            backgroundImage: "url('./Q&A.png')",
            backgroundSize: '85%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <Bubble.List
            className='bg-white'
            items={messages.map((msg) => commonBubble(msg))}
          />
          <div className='absolute top-2 right-2 text-xs bg-gray-100 px-2 py-1 rounded'>
            消息数: {messages.length}
          </div>
        </div>

        {/* 固定输入框 */}
        <div
          className='fixed bottom-0 right-0 bg-white z-10'
          style={{
            width: `calc(100% - ${siderWidth}px)`,
            padding: '10px',
            borderTop: '1px solid #eee',
          }}
        >
          <Sender
            ref={senderRef}
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder='请输入知识库相关问题...'
            submitType='enter'
          />
        </div>
      </div>
    </XProvider>
  );
};

export default RAGChat;
