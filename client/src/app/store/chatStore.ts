import { create } from "zustand";
import type { Message } from "../../features/chat/types";

type ChatState = {
  activeConversationId: string | null;
  messages: Message[];
  streamingId: string | null;
  isStreaming: boolean;

  setActiveConversation: (id: string | null) => void;
  reset: () => void;
  setMessages: (messages: Message[]) => void;

  appendUserMessage: (content: string) => void;
  appendAssistantMessage: () => string;

  appendToken: (id: string, token: string) => void;
  setMessageContent: (id: string, content: string) => void;

  finalizeMessage: () => void;
};

const initialState = {
  activeConversationId: null,
  messages: [],
  streamingId: null,
  isStreaming: false,
};

export const useChatStore = create<ChatState>((set, get) => ({
  ...initialState,

  setActiveConversation: (id) => {
    set({
      activeConversationId: id,
      messages: [],
      streamingId: null,
      isStreaming: false,
    });
  },

  reset: () => {
    set({
      messages: [],
      streamingId: null,
      isStreaming: false,
    });
  },

  setMessages: (messages) => {
    set({ messages });
  },

  appendUserMessage: (content) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, msg],
    }));
  },

  appendAssistantMessage: () => {
    const id = `ai-${crypto.randomUUID()}`;

    const msg: Message = {
      id,
      role: "model",
      content: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    set((s) => ({
      messages: [...s.messages, msg],
      streamingId: id,
      isStreaming: true,
    }));

    return id;
  },

  appendToken: (id, token) => {
    const { streamingId, messages } = get();

    if (streamingId !== id) return;

    // IMPORTANT: avoid recreating entire string per render spike
    const updated = messages.map((m) => {
      if (m.id !== id) return m;
      return {
        ...m,
        content: m.content + token,
      };
    });

    set({ messages: updated });
  },

  setMessageContent: (id, content) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content } : m
      ),
    }));
  },

  finalizeMessage: () => {
    const { streamingId } = get();

    set((s) => ({
      isStreaming: false,
      streamingId: null,
      messages: s.messages.map((m) =>
        m.id === streamingId
          ? { ...m, isStreaming: false }
          : m
      ),
    }));
  },
}));
