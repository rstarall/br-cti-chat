import { create } from 'zustand';
import { persist, type StorageValue } from 'zustand/middleware';
import { ChatAPI, ChatRequest, ChatStreamChunk, RetrievedDocument } from '../api';

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
  reasoning_content?: string;
  refs?: any[];
  retrieved_docs?: RetrievedDocument[];  // 新增召回文档字段
};

export type Conversation = {
  id: string;
  title: string;
  time: string;
  history: any[];
};

export type ConversationMessages = {
  messages: Message[];
};

export type ChatMeta = {
  use_graph?: boolean;
  db_id?: string;
  history_round?: number;
  system_prompt?: string;
  model_provider?: string;
  model_name?: string;
};

export type ChatState = {
  apiUrl: string;
  currentConversationId: string;
  conversationHistory: Record<string, Conversation>;
  conversationMessageHistory: Record<string, ConversationMessages>;
  meta: ChatMeta;
  currentModel: string;
  availableModels: Record<string, string[]>;
  modelProviders: string[];
  isInitialized: boolean;
  setApiUrl: (url: string) => void;
  setCurrentConversationId: (id: string) => void;
  setMeta: (meta: Partial<ChatMeta>) => void;
  setCurrentModel: (model: string) => void;
  setInitialized: (initialized: boolean) => void;
  fetchModels: (provider: string) => Promise<void>;
  createConversation: (title: string) => string;
  resetConversationId: (oldId: string, newId: string) => void;
  resetConversationTitle: (conversationId: string, title: string) => void;
  deleteConversation: (conversationId: string) => boolean;
  initializeApp: () => void;
  appendMessage: (conversationId: string, msg: Message) => void;
  updateMessage: (conversationId: string, id: string, update: string | ((msg: Message) => Message)) => void;
  streamRequest: (conversationId: string, input: string) => Promise<void>;
};

const useStore = create<ChatState>()(
  persist(
    (set, get) => ({
      apiUrl: 'http://localhost:8000/chat/',
      conversationHistory: {},
      conversationMessageHistory: {},
      currentConversationId: '',
      isInitialized: false,
      meta: {
        use_graph: false,
        db_id: '',
        history_round: 5,
        system_prompt: '',
        model_provider: '',
        model_name: ''
      },
      currentModel: '',
      availableModels: {},
      modelProviders: ['deepseek'],

      setApiUrl: (url) => set({ apiUrl: url }),
      setCurrentConversationId: (id: string) => set({ currentConversationId: id }),
      setMeta: (newMeta: Partial<ChatMeta>) =>
        set({ meta: { ...get().meta, ...newMeta } }),
      setCurrentModel: (model: string) => set({ currentModel: model }),
      setInitialized: (initialized: boolean) => set({ isInitialized: initialized }),

      initializeApp: () => {
        const state = get();
        if (state.isInitialized) {
          console.log('应用已经初始化，跳过重复初始化');
          return;
        }

        console.log('开始初始化应用...');
        const historyKeys = Object.keys(state.conversationHistory);

        if (historyKeys.length === 0) {
          // 没有历史会话，创建新会话
          console.log('没有历史会话，创建新会话');
          const newId = state.createConversation('');
          set({ currentConversationId: newId, isInitialized: true });
        } else {
          // 有历史会话，选择最新的一个
          const sortedIds = historyKeys.sort((a, b) => {
            const timeA = parseInt(state.conversationHistory[a].time);
            const timeB = parseInt(state.conversationHistory[b].time);
            return timeB - timeA; // 降序排列，最新的在前
          });
          const latestId = sortedIds[0];
          console.log(`选择最新会话: ${latestId}`);
          set({ currentConversationId: latestId, isInitialized: true });
        }
      },

      fetchModels: async (provider: string) => {
        try {
          const data = await ChatAPI.getModels(provider);
          const models = data.models || [];

          set({
            availableModels: {
              ...get().availableModels,
              [provider]: models
            }
          });
        } catch (error) {
          console.error('获取模型列表失败:', error);
        }
      },

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
          id: (Date.now() + 1).toString(), // 确保ID不重复
          role: 'assistant',
          content: '你好！我是安全智能问答助手，有什么可以帮助你的吗？'
        };

        console.log(`创建新会话: ${conversationId}, 标题: "${title}"`);

        set({
          conversationHistory: {
            ...get().conversationHistory,
            [conversationId]: {
              id: conversationId,
              title,
              time: new Date().getTime().toString(),
              history: []
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
        const { appendMessage, updateMessage, meta, conversationMessageHistory } = get();
        const conversation = get().conversationHistory[conversationId];

        const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: input
        };

        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          streaming: true,
          loading: true
        };

        // 添加用户消息和初始机器人消息
        appendMessage(conversationId, userMsg);
        appendMessage(conversationId, botMsg);

        try {
          // 构建meta参数，从空对象开始
          const cleanMeta: any = {};

          if (meta.use_graph) {
            cleanMeta.use_graph = true;
          }
          if (meta.db_id) {
            cleanMeta.db_id = meta.db_id;
          }
          if (meta.system_prompt) {
            cleanMeta.system_prompt = meta.system_prompt;
          }
          if (meta.model_provider) {
            cleanMeta.model_provider = meta.model_provider;
          }
          if (meta.model_name) {
            cleanMeta.model_name = meta.model_name;
          }
          if (meta.history_round && meta.history_round !== 5) {
            cleanMeta.history_round = meta.history_round;
          }

          const requestBody: ChatRequest = {
            query: input,
            meta: cleanMeta,
            thread_id: conversationId
          };

          // 构建正确格式的history数组
          if (conversation?.history && conversation.history.length > 0) {
            requestBody.history = conversation.history;
          } else {
            // 如果没有服务器返回的history，使用本地消息历史
            const localHistory = conversationMessageHistory[conversationId]?.messages || [];
            const formattedHistory = localHistory
              .filter(msg => msg.role === 'user' || msg.role === 'assistant')
              .slice(-10) // 只取最近10条消息
              .map(msg => ({
                role: msg.role,
                content: msg.content
              }));

            if (formattedHistory.length > 0) {
              requestBody.history = formattedHistory;
            }
          }

          console.log('发送聊天请求:', requestBody);

          let finalContent = '';
          let finalRefs: any[] = [];

          await ChatAPI.streamChat(
            requestBody,
            (data: ChatStreamChunk) => {
              console.log('接收到数据:', data);

              // 保存服务器返回的模型名称
              if (data.meta && data.meta.server_model_name) {
                set({ currentModel: data.meta.server_model_name });
              }

              if (data.status === 'searching') {
                updateMessage(conversationId, botMsg.id, (msg) => ({
                  ...msg,
                  content: '🔍 正在搜索知识库...',
                  loading: true,
                  streaming: true
                }));
              } else if (data.status === 'generating') {
                updateMessage(conversationId, botMsg.id, (msg) => ({
                  ...msg,
                  content: '💭 正在生成回答...',
                  loading: true,
                  streaming: true,
                  retrieved_docs: data.retrieved_docs  // 保存召回文档信息
                }));
              } else if (data.status === 'reasoning') {
                if (data.reasoning_content) {
                  updateMessage(conversationId, botMsg.id, (msg) => ({
                    ...msg,
                    reasoning_content: data.reasoning_content,
                    content: '🤔 正在推理...',
                    loading: true,
                    streaming: true
                  }));
                }
              } else if (data.status === 'loading') {
                if (data.response) {
                  finalContent += data.response;
                  updateMessage(conversationId, botMsg.id, (msg) => ({
                    ...msg,
                    content: finalContent,
                    loading: false,
                    streaming: true
                  }));
                }
              } else if (data.status === 'finished') {
                // 保存对话历史
                if (data.history) {
                  set({
                    conversationHistory: {
                      ...get().conversationHistory,
                      [conversationId]: {
                        ...conversation,
                        history: data.history
                      }
                    }
                  });
                }

                // 保存引用
                if (data.refs) {
                  finalRefs = data.refs;
                }

                updateMessage(conversationId, botMsg.id, (msg) => ({
                  ...msg,
                  content: finalContent || msg.content,
                  refs: finalRefs,
                  streaming: false,
                  loading: false
                }));
              } else if (data.status === 'error') {
                updateMessage(conversationId, botMsg.id, (msg) => ({
                  ...msg,
                  content: `❌ 错误: ${data.message || '未知错误'}`,
                  streaming: false,
                  loading: false
                }));
              }
            },
            (error: Error) => {
              console.error('聊天请求失败:', error);
              updateMessage(conversationId, botMsg.id, (msg) => ({
                ...msg,
                content: '⚠️ 连接服务器失败，请检查服务器是否正常运行',
                streaming: false,
                loading: false
              }));
            },
            () => {
              console.log('流式请求完成');
            }
          );

        } catch (error) {
          console.error('聊天请求失败:', error);
          updateMessage(conversationId, botMsg.id, (msg) => ({
            ...msg,
            content: '⚠️ 连接服务器失败，请检查服务器是否正常运行',
            streaming: false,
            loading: false
          }));
        }
      }
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        apiUrl: state.apiUrl,
        meta: state.meta,
        currentModel: state.currentModel,
        availableModels: state.availableModels,
        conversationHistory: state.conversationHistory,
        conversationMessageHistory: state.conversationMessageHistory
      }),
      storage: typeof window !== 'undefined' ? {
        getItem: (name): StorageValue<{
          apiUrl: string,
          meta: ChatMeta,
          currentModel: string,
          availableModels: Record<string, string[]>,
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
          meta: ChatMeta,
          currentModel: string,
          availableModels: Record<string, string[]>,
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
