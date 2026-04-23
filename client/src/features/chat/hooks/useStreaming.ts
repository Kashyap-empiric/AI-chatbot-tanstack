import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../../../app/store/chatStore";
import { useConversationActions } from "../../conversation/services/conversationQueries";
import { streamMessage } from "../api";

type StreamPayload = {
    conversationId: string;
    content: string;
    model?: string;
};

type ActiveStream = {
    assistantId: string;
    rafId: number | null;
    buffer: string;
    stop: (() => void) | null;
};

export const useStreaming = () => {
    const navigate = useNavigate();
    const { invalidateConversations } = useConversationActions();
    const streamsRef = useRef<Map<string, ActiveStream>>(new Map());

    const startStreaming = async ({
        conversationId,
        content,
        model,
    }: StreamPayload) => {
        const store = useChatStore.getState();

        if (
            (store.activeConversationId !== conversationId &&
                conversationId !== "new") ||
            store.isStreaming
        ) {
            return;
        }

        const isNew = conversationId === "new";

        store.appendUserMessage(content);

        const assistantId = store.appendAssistantMessage();

        let buffer = "";
        let rafId: number | null = null;

        const streamState: ActiveStream = {
            assistantId,
            rafId,
            buffer,
            stop: null,
        };

        streamsRef.current.set(conversationId, streamState);

        const flush = (targetId: string) => {
            const current = streamsRef.current.get(targetId);
            const state = useChatStore.getState();

            if (!current) return;
            if (!current.buffer) return;

            // If we've navigated to a new ID, we should still flush to the assistantId we created
            state.appendToken(assistantId, current.buffer);
            current.buffer = "";
        };

        const startFrameLoop = (targetId: string) => {
            const loop = () => {
                const current = streamsRef.current.get(targetId);
                if (!current || !streamsRef.current.has(targetId)) return;

                flush(targetId);

                current.rafId = requestAnimationFrame(loop);
            };

            const current = streamsRef.current.get(targetId);
            if (!current) return;

            current.rafId = requestAnimationFrame(loop);
        };

        const stopStream = (targetId: string) => {
            const current = streamsRef.current.get(targetId);
            if (!current) return;

            if (current.stop) {
                current.stop();
                current.stop = null;
            }

            if (current.rafId) {
                cancelAnimationFrame(current.rafId);
                current.rafId = null;
            }

            const state = useChatStore.getState();

            if (current.buffer) {
                state.appendToken(assistantId, current.buffer);
                current.buffer = "";
            }

            state.finalizeMessage();

            streamsRef.current.delete(targetId);
        };

        try {
            const { promise, stop } = streamMessage(
                { conversationId, content, model },
                (token: string) => {
                    const current = streamsRef.current.get(conversationId);
                    if (!current) return;

                    current.buffer += token;

                    if (!current.rafId) {
                        startFrameLoop(conversationId);
                    }
                },
                {
                    onCreated: ({ conversationId: newId }) => {
                        // Refresh history immediately
                        invalidateConversations();

                        if (isNew && newId) {
                            // Update UI highlight only (prevents MessageList re-render)
                            useChatStore.getState().setUiActiveId(newId);

                            // Update URL without triggering React Router re-render
                            window.history.replaceState(
                                null,
                                "",
                                `/app/chat/${newId}`,
                            );
                        }
                    },
                },
            );

            streamState.stop = stop;
            const result = await promise;

            // Finalize navigation and store state after stream finishes
            if (isNew && result.conversationId) {
                // Sync stream state to new ID
                streamsRef.current.set(result.conversationId, streamState);
                streamsRef.current.delete("new");

                // Update store and trigger formal navigation (no-op since URL is already set)
                useChatStore
                    .getState()
                    .updateActiveConversationId(result.conversationId);
                navigate(`/app/chat/${result.conversationId}`, {
                    replace: true,
                });
            }
        } catch (error) {
            const current = streamsRef.current.get(conversationId);

            if (!current) return;

            const message =
                error instanceof Error ? error.message : "Streaming failed";

            useChatStore
                .getState()
                .setMessageContent(
                    assistantId,
                    `Unable to get a response: ${message}`,
                );
        } finally {
            stopStream(conversationId === "new" ? "new" : conversationId);
        }
    };

    const stopStreaming = (conversationId: string) => {
        const stream = streamsRef.current.get(conversationId);
        if (!stream) return;

        if (stream.stop) {
            stream.stop();
            stream.stop = null;
        }

        if (stream.rafId) {
            cancelAnimationFrame(stream.rafId);
            stream.rafId = null;
        }

        const state = useChatStore.getState();

        if (stream.buffer && state.activeConversationId === conversationId) {
            state.appendToken(stream.assistantId, stream.buffer);
        }

        state.finalizeMessage();

        streamsRef.current.delete(conversationId);
    };

    return {
        startStreaming,
        stopStreaming,
    };
};
