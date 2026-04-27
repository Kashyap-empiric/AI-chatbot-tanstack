import { buildContext } from "./context.service";
import { getRecentMessages } from "./memory.service";
import { AIStreamChunk } from "../../adapters/base.adapter";
import { getAdapter } from "../../adapters/ai.adapter";
import { selectModel } from "../ai/routing.service";

type ChatInput = {
    userId: string;
    conversationId: string;
    content: string;
    model?: string;
    signal?: AbortSignal;
};

export const chatService = async function* ({
    userId,
    conversationId,
    content,
    model,
    signal,
}: ChatInput): AsyncGenerator<AIStreamChunk> {
    const selectedModel = selectModel(model);

    console.log("[chat.service]", {
        phase: "stream_start",
        conversationId,
        provider: selectedModel.provider,
        model: selectedModel.model,
    });

    const recentMessages = await getRecentMessages(conversationId);
    const messages = buildContext(recentMessages);

    const adapter = getAdapter(selectedModel.provider);

    // single meta event
    yield {
        type: "meta",
        model: selectedModel.model,
        provider: selectedModel.provider,
    };

    try {
        const stream = adapter.stream({
            model: selectedModel.model,
            messages,
            signal,
        });

        for await (const chunk of stream) {
            if (signal?.aborted) {
                yield { type: "aborted" };
                return;
            }

            yield chunk;

            // IMPORTANT: do NOT break early on done if pacing layer still processing
            if (chunk.type === "error") {
                break;
            }

            if (chunk.type === "aborted") {
                break;
            }
        }
    } catch (error) {
        console.error("[chat.service] stream error", {
            conversationId,
            provider: selectedModel.provider,
            model: selectedModel.model,
            error: error instanceof Error ? error.message : error,
        });

        if (signal?.aborted) {
            yield { type: "aborted" };
            return;
        }

        yield {
            type: "error",
            error: "CHAT_STREAM_FAILED",
        };
    }

    console.log("[chat.service]", {
        phase: "stream_end",
        conversationId,
    });
};
