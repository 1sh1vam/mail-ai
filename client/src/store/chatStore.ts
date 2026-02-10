import { create } from 'zustand';
import type { ChatMessage } from '@/services/chatService';
import type { ToolCall } from '@/hooks/chat';

export type { ChatMessage } from '@/services/chatService';

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
}

interface ChatActions {
  addMessage: (message: ChatMessage) => void;

  updateMessage: (id: string, content: string) => void;

  completeMessage: (id: string, content: string, toolCalls?: ToolCall[]) => void;

  setStreaming: (value: boolean) => void;

  setError: (error: string | null) => void;

  clearMessages: () => void;
}

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  messages: [],
  isStreaming: false,
  error: null,

  addMessage: (message) =>
    set({ messages: [...get().messages, message] }),

  updateMessage: (id, content) =>
    set({
      messages: get().messages.map((m) =>
        m.id === id ? { ...m, content } : m,
      ),
    }),

  completeMessage: (id, content, toolCalls) =>
    set({
      messages: get().messages.map((m) =>
        m.id === id
          ? {
              ...m,
              content,
              isStreaming: false,
              tool_calls: toolCalls?.map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: {
                  name: tc.name,
                  arguments: JSON.stringify(tc.arguments),
                },
              })),
            }
          : m,
      ),
    }),

  setStreaming: (value) => set({ isStreaming: value }),

  setError: (error) => set({ error }),

  clearMessages: () => set({ messages: [], error: null }),
}));
