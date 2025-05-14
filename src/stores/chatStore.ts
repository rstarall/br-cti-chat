import { create } from 'zustand';
import { persist, type StorageValue } from 'zustand/middleware';

export type RetrievalContext = {
  id: string;
  data: string;
  source: string;
}

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  loading?: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  time: string;
};

export type ConversationMessages = {
  messages: Message[];
};

export type ChatState = {
  apiUrl: string;
  currentConversationId: string;
  conversationHistory: Record<string, Conversation>;
  conversationMessageHistory: Record<string, ConversationMessages>;
  setApiUrl: (url: string) => void;
  setCurrentConversationId: (id: string) => void;
  createConversation: (title: string) => string;
  resetConversationId: (oldId: string, newId: string) => void;
  resetConversationTitle: (conversationId: string, title: string) => void;
  deleteConversation: (conversationId: string) => boolean;
  appendMessage: (conversationId: string, msg: Message) => void;
  updateMessage: (conversationId: string, id: string, update: string | ((msg: Message) => Message)) => void;
  streamRequest: (conversationId: string, input: string) => Promise<void>;
};

const useStore = create<ChatState>()(
  persist(
    (set, get) => ({
      apiUrl: 'http://localhost:8000/chat/stream',
      conversationHistory: {},
      conversationMessageHistory: {},
      currentConversationId: '',

      setApiUrl: (url) => set({ apiUrl: url }),
      setCurrentConversationId: (id: string) => set({ currentConversationId: id }),

      resetConversationId: (oldId: string, newId: string) => {
        const { conversationHistory, conversationMessageHistory } = get();

        // 创建新的记录
        set({
          conversationHistory: {
            ...Object.fromEntries(
              Object.entries(conversationHistory).filter(([id]) => id !== oldId)
            ),
            [newId]: {
              ...conversationHistory[oldId],
              id: newId
            }
          },
          conversationMessageHistory: {
            ...Object.fromEntries(
              Object.entries(conversationMessageHistory).filter(([id]) => id !== oldId)
            ),
            [newId]: conversationMessageHistory[oldId]
          }
        });
      },

      createConversation: (title) => {
        const conversationId = Date.now().toString();
        const welcomeMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '你好！我是安全智能问答助手，有什么可以帮助你的吗？'
        };
        set({
          conversationHistory: {
            ...get().conversationHistory,
            [conversationId]: {
              id: conversationId,
              title,
              time: new Date().getTime().toString(),
            }
          },
          conversationMessageHistory: {
            ...get().conversationMessageHistory,
            [conversationId]: {
              messages: [welcomeMsg]
            }
          }
        });
        set({ currentConversationId: conversationId });
        return conversationId;
      },

      resetConversationTitle: (conversationId, title) => {
        set({
          conversationHistory: {
            ...get().conversationHistory,
            [conversationId]: {
              ...get().conversationHistory[conversationId],
              title
            }
          }
        });
      },

      deleteConversation: (conversationId) => {
        set({
          conversationHistory: Object.fromEntries(
            Object.entries(get().conversationHistory).filter(([id]) => id !== conversationId)
          ),
          conversationMessageHistory: Object.fromEntries(
            Object.entries(get().conversationMessageHistory).filter(([id]) => id !== conversationId)
          )
        });
        return true;
      },

      appendMessage: (conversationId, msg) =>
        set({
          conversationMessageHistory: {
            ...get().conversationMessageHistory,
            [conversationId]: {
              messages: [...get().conversationMessageHistory[conversationId].messages, msg]
            }
          }
        }),

      updateMessage: (conversationId, id, update) =>
        set({
          conversationMessageHistory: {
            ...get().conversationMessageHistory,
            [conversationId]: {
              ...get().conversationMessageHistory[conversationId],
              messages: get().conversationMessageHistory[conversationId].messages.map(msg =>
                msg.id === id
                  ? (typeof update === 'function' ? update(msg) : { ...msg, content: update })
                  : msg
              )
            }
          }
        }),

      streamRequest: async (conversationId: string, input: string) => {
        const { apiUrl, appendMessage, updateMessage, resetConversationId, resetConversationTitle } = get();
        const userMsg = {
          id: Date.now().toString(),
          role: 'user' as const,
          content: input
        };
        const botMsg = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: '',
          streaming: true,
          loading: true
        };

        // 添加用户消息和初始机器人消息
        appendMessage(conversationId, userMsg);
        appendMessage(conversationId, botMsg);

        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ message: input, conversation_id: conversationId })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let isCompleted = false;

          while (reader && !isCompleted) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // 匹配data:后面的内容，考虑多行情况
            const regex = /data:\s*(.*?)(?=\n(?:data:|event:|$)|\n\n|$)/gs;
            let match;
            let lastIndex = 0;

            while ((match = regex.exec(buffer)) !== null) {
              const data = match[1].trim();
              lastIndex = match.index + match[0].length;

              if (data === '[DONE]') {
                isCompleted = true;
                break;
              }

              try {
                // 处理 conversation_id
                if (data.startsWith('[conversation_id]:')) {
                  const returnedConversationId = data.substring('[conversation_id]:'.length).trim();
                  resetConversationId(conversationId, returnedConversationId);
                  conversationId = returnedConversationId;
                  continue;
                }

                // 处理 conversation_title
                if (data.startsWith('[conversation_title]:')) {
                  const returnedConversationTitle = data.substring('[conversation_title]:'.length).trim();
                  resetConversationTitle(conversationId, returnedConversationTitle);
                  continue;
                }

                // 尝试解析 JSON 数据 (通常是完整响应)
                if (data.startsWith('{') && data.endsWith('}')) {
                  try {
                    const jsonData = JSON.parse(data);
                    if (jsonData.type === 'conversation_full' && jsonData.data) {
                      // 这是完整响应，可以选择更新或不更新
                      // 通常不需要更新，因为之前的流式内容已经累加完成
                      continue;
                    }
                  } catch (jsonError) {
                    // JSON解析失败但内容是括号包围的，直接显示
                    updateMessage(conversationId, botMsg.id, (msg) => ({
                      ...msg,
                      loading: false,
                      streaming: true,
                      content: msg.content + data
                    }));
                  }
                } else {
                  // 普通文本，直接追加显示
                  updateMessage(conversationId, botMsg.id, (msg) => ({
                    ...msg,
                    loading: false,
                    streaming: true,
                    content: msg.content + data
                  }));
                }
              } catch (error) {
                console.error('Data processing failed:', error);
              }
            }

            // 保留未处理的部分为新的缓冲区
            if (lastIndex > 0) {
              buffer = buffer.substring(lastIndex);
            }
          }

          // 确保在退出之前设置最终状态
          updateMessage(conversationId, botMsg.id, (msg) => ({
            ...msg,
            streaming: false,
            loading: false
          }));

        } catch (error) {
          updateMessage(conversationId, botMsg.id, (msg) => ({
            ...msg,
            content: '⚠️ 连接服务器失败',
            streaming: false,
            loading: false
          }));
          console.error('流式传输错误:', error);
        }
      }
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        apiUrl: state.apiUrl,
        conversationHistory: state.conversationHistory,
        conversationMessageHistory: state.conversationMessageHistory
      }),
      storage: typeof window !== 'undefined' ? {
        getItem: (name): StorageValue<{
          apiUrl: string,
          conversationHistory: Record<string, Conversation>,
          conversationMessageHistory: Record<string, ConversationMessages>
        }> | null => {
          try {
            const str = localStorage.getItem(name);
            return str ? JSON.parse(str) : null;
          } catch (err) {
            console.warn('存储访问失败:', err);
            return null;
          }
        },
        setItem: (name, value: StorageValue<{
          apiUrl: string,
          conversationHistory: Record<string, Conversation>,
          conversationMessageHistory: Record<string, ConversationMessages>
        }>) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (err) {
            console.warn('存储写入失败:', err);
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch (err) {
            console.warn('存储删除失败:', err);
          }
        }
      } : undefined
    }
  )
);

export const useChatStore = useStore;
