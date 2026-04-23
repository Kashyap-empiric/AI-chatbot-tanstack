import { buildContext } from "./context.service";
import { getRecentMessages } from "./memory.service";
import { AIMessage } from "../../adapters/base.adapter";
import { getAdapter } from "../../adapters/ai.adapter";
import { selectModel } from "../ai/routing.service";

type ChatInput = {
    userId: string;
    conversationId: string;
    content: string;
    model?: string;
};

export const chatService = async function* ({
    userId,
    conversationId,
    content,
    model,
}: ChatInput) {
    const selectedModel = selectModel(model);

    console.log("[chat.service]", {
        phase: "stream_start",
        conversationId,
        provider: selectedModel.provider,
        model: selectedModel.model,
    });

    /**
     * IMPORTANT:
     * No DB writes here.
     * No side effects.
     * This layer is pure generation only.
     */

    const recentMessages = await getRecentMessages(conversationId);
    const messages: AIMessage[] = buildContext(recentMessages);

    const adapter = getAdapter(selectedModel.provider);

    const stream = adapter.stream({
        model: selectedModel.model,
        messages,
    });

    try {
        for await (const chunk of stream) {
            const text = chunk?.text || "";

            if (!text) continue;

            // PURE PASS-THROUGH STREAM
            yield {
                type: "token",
                text,
            };
        }
    } catch (error) {
        console.error("[chat.service] stream error", {
            conversationId,
            provider: selectedModel.provider,
            model: selectedModel.model,
            error: error instanceof Error ? error.message : error,
        });

        throw error;
    }

    console.log("[chat.service]", {
        phase: "stream_end",
        conversationId,
    });
};
