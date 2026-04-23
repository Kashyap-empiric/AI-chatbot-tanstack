import { useChatStore } from "../../../app/store/chatStore";
import { streamMessage } from "../api";

type StreamPayload = {
    conversationId: string;
    content: string;
    model?: string;
};

export const useStreaming = () => {
    const startStreaming = async ({
        conversationId,
        content,
        model,
    }: StreamPayload) => {
        const initialState = useChatStore.getState();

        if (
            initialState.activeConversationId !== conversationId ||
            initialState.isStreaming
        ) {
            return;
        }

        initialState.appendUserMessage(content);

        const userMessage = useChatStore.getState().messages.at(-1);
        if (!userMessage) return;

        const assistantId = useChatStore.getState().appendAssistantMessage();

        let buffer = "";

        let rafId: number | null = null;
        let isStreamingActive = true;

        const flush = () => {
            const state = useChatStore.getState();

            if (buffer && state.activeConversationId === conversationId) {
                state.appendToken(assistantId, buffer);
                buffer = "";
            }
        };

        const startFrameLoop = () => {
            const loop = () => {
                if (!isStreamingActive) return;

                flush();
                rafId = requestAnimationFrame(loop);
            };

            rafId = requestAnimationFrame(loop);
        };

        try {
            await streamMessage(
                { conversationId, content, model },
                (token) => {
                    const state = useChatStore.getState();
                    if (state.activeConversationId !== conversationId) return;

                    buffer += token;

                    // start RAF loop only once
                    if (!rafId) {
                        startFrameLoop();
                    }
                }
            );
        } catch (error) {
            console.error("Streaming error:", error);

            const message =
                error instanceof Error ? error.message : "Streaming failed";

            useChatStore.getState().setMessageContent(
                assistantId,
                `Unable to get a response: ${message}`
            );
        } finally {
            isStreamingActive = false;

            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }

            const finalState = useChatStore.getState();

            if (buffer && finalState.activeConversationId === conversationId) {
                finalState.appendToken(assistantId, buffer);
                buffer = "";
            }

            finalState.finalizeMessage();
        }
    };

    return {
        startStreaming,
    };
};
