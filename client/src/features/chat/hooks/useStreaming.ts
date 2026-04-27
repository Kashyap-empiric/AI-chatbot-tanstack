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
    finished: boolean;
    isAborted?: boolean;
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

        const streamState: ActiveStream = {
            assistantId,
            rafId: null,
            buffer: "",
            stop: null,
            finished: false,
        };

        streamsRef.current.set(conversationId, streamState);

        const flush = (targetId: string) => {
            const current = streamsRef.current.get(targetId);
            const state = useChatStore.getState();

            if (!current || !current.buffer) return;

            state.appendToken(current.assistantId, current.buffer);
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

        /**
         * CRITICAL FIXES:
         * - never call backend stop after stream is done
         * - avoid double stop
         * - always flush buffer before finalize
         */
        const stopStream = (targetId: string, callBackend = true) => {
            const current = streamsRef.current.get(targetId);
            if (!current) return;

            // prevent duplicate stop
            if (current.finished && callBackend) {
                callBackend = false;
            }

            if (callBackend && current.stop) {
                current.stop(); // backend abort
            }

            current.stop = null;

            if (current.rafId) {
                cancelAnimationFrame(current.rafId);
                current.rafId = null;
            }

            const state = useChatStore.getState();

            if (current.buffer) {
                state.appendToken(current.assistantId, current.buffer);
                current.buffer = "";
            }

            state.finalizeMessage(false);
            streamsRef.current.delete(targetId);
        };

        try {
            const { promise, stop } = streamMessage(
                { conversationId, content, model },

                (event: any) => {
                    const current = streamsRef.current.get(conversationId);
                    if (!current) return;

                    switch (event.type) {
                        case "delta": {
                            if (!event.text) return;

                            current.buffer += event.text;

                            if (!current.rafId) {
                                startFrameLoop(conversationId);
                            }
                            break;
                        }

                        case "meta": {
                            if (event.conversationId) {
                                invalidateConversations();

                                if (isNew) {
                                    useChatStore
                                        .getState()
                                        .setUiActiveId(event.conversationId);

                                    window.history.replaceState(
                                        null,
                                        "",
                                        `/app/chat/${event.conversationId}`,
                                    );
                                }
                            }
                            break;
                        }

                        case "done": {
                            current.finished = true;

                            // FINAL FLUSH (critical)
                            if (current.buffer) {
                                useChatStore
                                    .getState()
                                    .appendToken(
                                        current.assistantId,
                                        current.buffer,
                                    );
                                current.buffer = "";
                            }

                            stopStream(conversationId, false); // NO backend call
                            break;
                        }

                        case "error": {
                            current.finished = true;

                            useChatStore
                                .getState()
                                .setMessageContent(
                                    current.assistantId,
                                    `Error: ${
                                        event.error || "Streaming failed"
                                    }`,
                                );

                            stopStream(conversationId, false);
                            break;
                        }

                        case "aborted": {
                            current.finished = true;
                            current.isAborted = true;
                            stopStream(conversationId, false);
                            useChatStore.getState().finalizeMessage(true);
                            break;
                        }
                    }
                },

                {
                    onCreated: ({ conversationId: newId }) => {
                        invalidateConversations();

                        if (isNew && newId) {
                            useChatStore.getState().setUiActiveId(newId);

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

            if (isNew && result.conversationId) {
                streamsRef.current.set(result.conversationId, streamState);
                streamsRef.current.delete("new");

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
                    current.assistantId,
                    `Unable to get a response: ${message}`,
                );
        } finally {
            // DO NOT call backend stop here
            const current = streamsRef.current.get(conversationId);
            if (current && !current.finished) {
                stopStream(conversationId, true);
            }
        }
    };

    const stopStreaming = (conversationId: string) => {
        const stream = streamsRef.current.get(conversationId);
        if (!stream) return;
        stream.isAborted = true;

        if (stream.stop) {
            stream.stop(); // manual user abort
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

        state.finalizeMessage(true);
        streamsRef.current.delete(conversationId);
    };

    return {
        startStreaming,
        stopStreaming,
    };
};
