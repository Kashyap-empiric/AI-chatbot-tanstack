import { create } from "zustand";
import type { Message } from "../../features/chat/types";

type ChatState = {
  activeConversationId: string | null;
  messages: Message[];

  streamingId: string | null;
  isStreaming: boolean;

  // NEW: allows external cancel coordination
  stopRequested: boolean;
  uiActiveId: string | null;

  setActiveConversation: (id: string | null) => void;
  updateActiveConversationId: (id: string) => void;
  setUiActiveId: (id: string | null) => void;
  reset: () => void;
  setMessages: (messages: Message[]) => void;

  appendUserMessage: (content: string) => void;
  appendAssistantMessage: () => string;

  appendToken: (id: string, token: string) => void;
  setMessageContent: (id: string, content: string) => void;

  finalizeMessage: () => void;

  // NEW: explicit stop signal
  requestStop: () => void;
  clearStop: () => void;
};

const initialState = {
  activeConversationId: null,
  messages: [],
  streamingId: null,
  isStreaming: false,
  stopRequested: false,
};

export const useChatStore = create<ChatState>((set, get) => ({
  ...initialState,

  setActiveConversation: (id) => {
    set({
      activeConversationId: id,
      uiActiveId: id,
      messages: [],
      streamingId: null,
      isStreaming: false,
      stopRequested: false,
    });
  },

  setUiActiveId: (id) => {
    set({ uiActiveId: id });
  },

  updateActiveConversationId: (id) => {
    set({ activeConversationId: id });
  },


  reset: () => {
    set({
      messages: [],
      streamingId: null,
      isStreaming: false,
      stopRequested: false,
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
      stopRequested: false,
    }));

    return id;
  },

  appendToken: (id, token) => {
    const { streamingId, stopRequested } = get();

    // CRITICAL: stop blocks all incoming tokens
    if (stopRequested || streamingId !== id) return;

    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id
          ? { ...m, content: m.content + token }
          : m
      ),
    }));
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
      stopRequested: false,
      messages: s.messages.map((m) =>
        m.id === streamingId
          ? { ...m, isStreaming: false }
          : m
      ),
    }));
  },

  requestStop: () => {
    set({
      stopRequested: true,
      isStreaming: false,
    });
  },

  clearStop: () => {
    set({
      stopRequested: false,
    });
  },
}));
