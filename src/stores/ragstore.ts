import { create } from 'zustand';

export type RetrievalContext = {
  id: string;
  data: string;
  source: string;
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  loading?: boolean;
  retrievalContexts?: RetrievalContext[];
};

type RAGStore = {
  messages: Message[];
  appendMessage: (msg: Message) => void;
  updateMessage: (id: string, update: Partial<Message> | ((msg: Message) => Message)) => void;
  streamRequest: (input: string) => Promise<void>;
};

export const useRAGStore = create<RAGStore>((set, get) => ({
  messages: [],

  // Append message to the list
  appendMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),

  // Update message by id
  updateMessage: (id, update) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id
          ? typeof update === 'function'
            ? update(m)
            : { ...m, ...update }
          : m
      ),
    })),

  // Stream request for RAG
  streamRequest: async (input: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      streaming: true,
      loading: true,
    };

    get().appendMessage(userMsg);
    get().appendMessage(botMsg);

    try {
      // Send the request to backend (RAG stream)
      const response = await fetch('http://localhost:8000/rag/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: input,
          conversation_id: 'rag-session',
          use_rag: true,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Process stream data
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Split buffer by lines (data blocks)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

        for (const line of lines) {
          const match = line.match(/^data:\s*(.*)$/);
          if (match) {
            const data = match[1].trim();

            // Handle control fields and metadata
            if (
              data === '[DONE]' ||
              data.startsWith('[conversation_id]:') ||
              data.startsWith('[conversation_title]:') ||
              data.startsWith('[rag_context]:')
            ) {
              // If the data is a control field, handle it accordingly
              if (data.startsWith('[conversation_id]:')) {
                const conversationId = data.substring('[conversation_id]:'.length).trim();
                console.log('Conversation ID:', conversationId);
              }

              if (data.startsWith('[conversation_title]:')) {
                const conversationTitle = data.substring('[conversation_title]:'.length).trim();
                console.log('Conversation Title:', conversationTitle);
              }

              if (data.startsWith('[rag_context]:')) {
                const ragContext = data.substring('[rag_context]:'.length).trim();
                const contextData = JSON.parse(ragContext);
                console.log('RAG Context:', contextData);
                get().updateMessage(botMsg.id, (msg) => ({
                  ...msg,
                  retrievalContexts: contextData,
                }));
              }
              continue;
            }

            // Process the actual message content
            try {
              // 检查并处理JSON格式的元数据，如果是JSON则不追加到内容中
              if (!data.startsWith('{') || !data.endsWith('}')) {
                get().updateMessage(botMsg.id, (msg) => ({
                  ...msg,
                  loading: false,
                  content: msg.content + data,
                }));
              } else {
                console.log('Metadata JSON received:', data);
                // 如果是JSON元数据，可以在这里处理但不添加到显示内容中
              }
            } catch (e) {
              console.error('Data processing failed:', e);
            }
          }
        }
      }

      // Finalize the message when the streaming is done
      get().updateMessage(botMsg.id, { loading: false, streaming: false });
    } catch (err) {
      // Error handling: Update message with failure content
      get().updateMessage(botMsg.id, {
        loading: false,
        streaming: false,
        content: '⚠️ 请求失败',
      });
      console.error('Request failed:', err);
    }
  },
}));
