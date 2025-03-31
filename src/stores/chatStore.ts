// src/stores/chatStore.ts
import { create } from 'zustand';
import { persist, type StorageValue } from 'zustand/middleware';

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
  messages: Message[];
};

export type ChatState = {
  apiUrl: string;
  currentConversationId: string;
  conversationHistory: Record<string, Conversation>;
  setApiUrl: (url: string) => void;
  setCurrentConversationId: (id: string) => void;
  createConversation: (title: string) => string;
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
      currentConversationId: '',
      setApiUrl: (url) => set({ apiUrl: url }),
      setCurrentConversationId: (id: string) => set({ currentConversationId: id }),
      createConversation: (title) =>{
        const conversationId = Date.now().toString();
        set({
          conversationHistory: {
            ...get().conversationHistory,
            [conversationId]: {
              id: conversationId,
              title,
              time: new Date().toLocaleTimeString(),
              messages: []
            }
          }
        });
        set({currentConversationId: conversationId});
        return conversationId;
      },
      deleteConversation: (conversationId) => {
        set({
          conversationHistory: Object.fromEntries(
            Object.entries(get().conversationHistory).filter(([id]) => id !== conversationId)
          )
        });
        return true;
      },
      appendMessage: (conversationId, msg) => 
        set({ conversationHistory: {
          ...get().conversationHistory,
          [conversationId]: {
            id: conversationId,
            title: get().conversationHistory[conversationId]?.title || '',
            time: new Date().toLocaleTimeString(),
            messages: [...get().conversationHistory[conversationId]?.messages || [], msg]
          }
        } }),
      updateMessage: (conversationId, id, update) =>
        set({
          conversationHistory: {
            ...get().conversationHistory,
            [conversationId]: {
              ...get().conversationHistory[conversationId],
              messages: get().conversationHistory[conversationId].messages.map(msg => 
                msg.id === id 
                  ? (typeof update === 'function' ? update(msg) : { ...msg, content: update })
                  : msg
              )
            }
          }
        }),
      streamRequest: async (conversationId, input) => {
        const { apiUrl, conversationHistory, appendMessage, updateMessage } = get();
        const userMsg = { 
          id: Date.now().toString(), 
          role: 'user' as const, 
          content: input 
        };
        const botMsg = { 
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: '',
          streaming: true
        };
        
        // 添加消息到聊天状态
        appendMessage(conversationId, userMsg);
        appendMessage(conversationId, botMsg);

        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'credentials': 'include'
            },
            body: JSON.stringify({ message: input, conversation_id: conversationId })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let fullContent = '';
          
          while (reader) {
            const { done, value } = await reader.read();
            if (done) break;
            const content = decoder.decode(value);
            fullContent += content;
            updateMessage(conversationId, botMsg.id, msg => ({ ...msg, content: fullContent }));
          }
          
          updateMessage(conversationId, botMsg.id, msg => ({ ...msg, streaming: false, loading: false }));
        } catch (error) {
          updateMessage(conversationId, botMsg.id,  msg => ({ ...msg,content: '⚠️ 连接服务器失败', streaming: false, loading: false }));
          console.error('Stream Error:', error);
        }
      }
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({ apiUrl: state.apiUrl, conversationHistory: state.conversationHistory }),
      storage: typeof window !== 'undefined' ? {
        getItem: (name): StorageValue<{ apiUrl: string, conversationHistory: Record<string, Conversation> }> | null => {
          try {
            const str = localStorage.getItem(name);
            return str ? JSON.parse(str) : null;
          } catch (err) {
            console.warn('存储访问失败:', err);
            return null;
          }
        },
        setItem: (name, value: StorageValue<{ apiUrl: string, conversationHistory: Record<string, Conversation> }>) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (err) {
            console.warn('存储写入失败:', err);
          }
        },
        removeItem: (name) => {
          try {
            sessionStorage.removeItem(name);
          } catch (err) {
            console.warn('存储删除失败:', err);
          }
        }
      } : undefined
    }
  )
);

export const useChatStore = useStore;
