import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../../../app/store/chatStore";
import { useConversationActions } from "../../conversation/services/conversationQueries";
import { useAuth } from "@clerk/react";
import { streamMessage } from "../api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

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
    const { getToken } = useAuth();
    const { invalidateConversations } = useConversationActions();

    const streamsRef = useRef<Map<string, ActiveStream>>(new Map());

    const flush = (conversationId: string) => {
        const stream = streamsRef.current.get(conversationId);
        const store = useChatStore.getState();

        if (!stream || !stream.buffer) return;

        store.appendToken(stream.assistantId, stream.buffer);
        stream.buffer = "";
    };

    const startFrameLoop = (conversationId: string) => {
        const loop = () => {
            const stream = streamsRef.current.get(conversationId);
            if (!stream) return;

            flush(conversationId);
            stream.rafId = requestAnimationFrame(loop);
        };

        const stream = streamsRef.current.get(conversationId);
        if (!stream || stream.rafId) return;

        stream.rafId = requestAnimationFrame(loop);
    };

    const cleanupStream = (conversationId: string) => {
        const stream = streamsRef.current.get(conversationId);
        if (!stream) return;

        if (stream.rafId) cancelAnimationFrame(stream.rafId);
        streamsRef.current.delete(conversationId);
    };

    const resolveAssistantMessage = () => {
        const store = useChatStore.getState();

        const existing = store.messages.find(
            (m) =>
                m.role === "assistant" &&
                (m.status === "pending" || m.status === "streaming"),
        );

        return existing ? existing.id : store.appendAssistantMessage();
    };

    /**
     * RECONNECT STREAM
     */
    const reconnectStream = (conversationId: string) => {
        const store = useChatStore.getState();
        const streamId = store.streamMap[conversationId];

        if (!streamId) return;
        if (streamsRef.current.has(conversationId)) return;

        const assistantId = resolveAssistantMessage();

        const stream: ActiveStream = {
            assistantId,
            rafId: null,
            buffer: "",
            stop: null,
        };

        streamsRef.current.set(conversationId, stream);

        void (async () => {
            const token = await getToken();
            const url = token
                ? `${API_BASE_URL}/chat/stream/${streamId}?token=${token}`
                : `${API_BASE_URL}/chat/stream/${streamId}`;

            const source = new EventSource(url, { withCredentials: true });

            source.addEventListener("delta", (e) => {
                const data = JSON.parse((e as MessageEvent).data);
                if (!data?.text) return;

                stream.buffer += data.text;
                startFrameLoop(conversationId);
            });

            source.addEventListener("done", () => {
                flush(conversationId);
                store.finalizeMessage(false);
                store.clearStreamId(conversationId);
                cleanupStream(conversationId);
            });

            source.addEventListener("aborted", () => {
                flush(conversationId);
                store.finalizeMessage(true);
                store.clearStreamId(conversationId);
                cleanupStream(conversationId);
            });

            source.addEventListener("error", () => {
                flush(conversationId);
                cleanupStream(conversationId);
            });
        })();
    };

    /**
     * START STREAM
     */
    const startStreaming = async ({
        conversationId,
        content,
        model,
    }: StreamPayload) => {
        const store = useChatStore.getState();

        if (streamsRef.current.has(conversationId)) return;

        const isNew = conversationId === "new";

        store.appendUserMessage(content);
        const assistantId = store.appendAssistantMessage();

        const stream: ActiveStream = {
            assistantId,
            rafId: null,
            buffer: "",
            stop: null,
        };

        streamsRef.current.set(conversationId, stream);

        try {
            const token = await getToken();
            const handle = await streamMessage(
                { conversationId, content, model },
                (event) => {
                    const current = streamsRef.current.get(conversationId);
                    if (!current) return;

                    switch (event.type) {
                        case "delta":
                            if (!event.text) return;
                            current.buffer += event.text;
                            startFrameLoop(conversationId);
                            break;

                        case "meta":
                            if (event.conversationId) {
                                invalidateConversations();

                                if (isNew) {
                                    const oldStreamId = store.streamMap["new"];

                                    if (oldStreamId) {
                                        store.clearStreamId("new");
                                        store.setStreamId(
                                            event.conversationId,
                                            oldStreamId,
                                        );
                                    }

                                    store.setUiActiveId(event.conversationId);

                                    window.history.replaceState(
                                        null,
                                        "",
                                        `/app/chat/${event.conversationId}`,
                                    );
                                }
                            }
                            break;

                        case "done":
                            flush(conversationId);
                            store.finalizeMessage(false);
                            store.clearStreamId(conversationId);
                            cleanupStream(conversationId);
                            break;

                        case "aborted":
                            flush(conversationId);
                            store.finalizeMessage(true);
                            store.clearStreamId(conversationId);
                            cleanupStream(conversationId);
                            break;

                        case "error":
                            flush(conversationId);
                            store.setMessageContent(
                                current.assistantId,
                                `Error: ${event.error || "Streaming failed"}`,
                            );
                            cleanupStream(conversationId);
                            break;
                    }
                },
                { token: token ?? undefined },
            );

            store.setStreamId(
                handle.conversationId || conversationId,
                handle.streamId,
            );

            stream.stop = handle.stop;

            if (isNew && handle.conversationId) {
                navigate(`/app/chat/${handle.conversationId}`, {
                    replace: true,
                });
            }
        } catch {
            cleanupStream(conversationId);
        }
    };

    const stopStreaming = async (conversationId: string) => {
        const store = useChatStore.getState();
        const stream = streamsRef.current.get(conversationId);

        if (stream?.stop) {
            await stream.stop();
        }

        store.clearStreamId(conversationId);
        store.requestStop();
        store.finalizeMessage(true);

        cleanupStream(conversationId);
    };

    return {
        startStreaming,
        reconnectStream,
        stopStreaming,
    };
};
