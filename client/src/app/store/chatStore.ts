import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Message } from "../../features/chat/types";

export type MessageStatus =
    | "pending"
    | "streaming"
    | "completed"
    | "aborted"
    | "error";

type ChatState = {
    activeConversationId: string | null;
    uiActiveId: string | null;

    messages: Message[];

    streamingId: string | null;
    stopRequested: boolean;

    streamMap: Record<string, string>;

    setActiveConversation: (id: string | null) => void;
    updateActiveConversationId: (id: string | null) => void;
    setUiActiveId: (id: string | null) => void;

    reset: () => void;
    setMessages: (messages: Message[]) => void;

    appendUserMessage: (content: string) => void;
    appendAssistantMessage: () => string;

    appendToken: (id: string, token: string) => void;
    setMessageContent: (id: string, content: string) => void;

    finalizeMessage: (isAborted?: boolean) => void;

    requestStop: () => void;
    clearStop: () => void;

    setStreamId: (conversationId: string, streamId: string) => void;
    clearStreamId: (conversationId: string) => void;
};

const initialState = {
    activeConversationId: null,
    uiActiveId: null,

    messages: [],

    streamingId: null,
    stopRequested: false,

    streamMap: {},
};

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            ...initialState,

            setActiveConversation: (id) => {
                set({
                    activeConversationId: id,
                    uiActiveId: id,
                    messages: [],
                    streamingId: null,
                    stopRequested: false,
                });
            },

            setUiActiveId: (id) => set({ uiActiveId: id }),

            updateActiveConversationId: (id) =>
                set({ activeConversationId: id }),

            reset: () =>
                set({
                    messages: [],
                    streamingId: null,
                    stopRequested: false,
                }),

            setMessages: (messages) => set({ messages }),

            /**
             * USER MESSAGE
             */
            appendUserMessage: (content) => {
                const msg: Message = {
                    id: crypto.randomUUID(),
                    role: "user",
                    content,
                    createdAt: new Date().toISOString(),
                    status: "completed",
                };

                set((s) => ({
                    messages: [...s.messages, msg],
                }));
            },

            /**
             * ASSISTANT MESSAGE (START STATE = pending)
             */
            appendAssistantMessage: () => {
                const id = `ai-${crypto.randomUUID()}`;

                const msg: Message = {
                    id,
                    role: "assistant",
                    content: "",
                    createdAt: new Date().toISOString(),
                    status: "pending",
                };

                set((s) => ({
                    messages: [...s.messages, msg],
                    streamingId: id,
                    stopRequested: false,
                }));

                return id;
            },

            /**
             * TOKEN APPEND
             */
            appendToken: (id, token) => {
                const { streamingId, stopRequested } = get();

                if (stopRequested || streamingId !== id) return;

                set((s) => ({
                    messages: s.messages.map((m) => {
                        if (m.id !== id) return m;

                        const nextContent = m.content + token;

                        return {
                            ...m,
                            content: nextContent,
                            status:
                                m.status === "pending" ? "streaming" : m.status,
                        };
                    }),
                }));
            },

            /**
             * DIRECT OVERRIDE (errors, etc.)
             */
            setMessageContent: (id, content) => {
                set((s) => ({
                    messages: s.messages.map((m) =>
                        m.id === id ? { ...m, content } : m,
                    ),
                }));
            },

            /**
             * FINALIZE STREAM
             */
            finalizeMessage: (isAborted: boolean = false) => {
                const { streamingId } = get();

                set((s) => ({
                    streamingId: null,
                    stopRequested: false,

                    messages: s.messages.map((m) =>
                        m.id === streamingId
                            ? {
                                  ...m,
                                  status: isAborted ? "aborted" : "completed",
                              }
                            : m,
                    ),
                }));
            },

            requestStop: () =>
                set({
                    stopRequested: true,
                }),

            clearStop: () => set({ stopRequested: false }),

            /**
             * STREAM MAPPING (reconnect support)
             */
            setStreamId: (conversationId, streamId) => {
                set((s) => ({
                    streamMap: {
                        ...s.streamMap,
                        [conversationId]: streamId,
                    },
                }));
            },

            clearStreamId: (conversationId) => {
                set((s) => {
                    const copy = { ...s.streamMap };
                    delete copy[conversationId];
                    return { streamMap: copy };
                });
            },
        }),
        {
            name: "chat-store",
            partialize: (state) => ({
                streamMap: state.streamMap,
            }),
        },
    ),
);
