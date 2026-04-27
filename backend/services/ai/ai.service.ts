import { getAdapter } from "../../adapters/ai.adapter";
import { AIMessage, AIStreamChunk } from "../../adapters/base.adapter";
import { selectModel } from "./routing.service";

type AIInput = {
    messages: AIMessage[];
    model?: string;
};

type AIStreamInput = {
    messages: AIMessage[];
    model?: string;
    signal?: AbortSignal;
};

export const generateAIResponse = async ({ messages, model }: AIInput) => {
    const selectedModel = selectModel(model);
    const adapter = getAdapter(selectedModel.provider);

    try {
        const response = await adapter.generate({
            model: selectedModel.model,
            messages,
        });

        return {
            text: response.text,
            modelVersion: response.modelVersion || null,
            model: selectedModel.model,
            provider: selectedModel.provider,
        };
    } catch (error) {
        return {
            text: `Sorry, ${selectedModel.model} is not available right now.`,
            modelVersion: null,
            model: selectedModel.model,
            provider: selectedModel.provider,
            error: "MODEL_UNAVAILABLE",
        };
    }
};

export async function* streamAIResponse({
    messages,
    model,
    signal,
}: AIStreamInput): AsyncGenerator<AIStreamChunk> {
    const selectedModel = selectModel(model);
    const adapter = getAdapter(selectedModel.provider);

    // emit meta once at start
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

            if (chunk.type === "done") {
                return;
            }

            if (chunk.type === "error") {
                return;
            }
        }
    } catch (error) {
        if (signal?.aborted) {
            yield { type: "aborted" };
            return;
        }

        yield {
            type: "error",
            error: "STREAM_FAILED",
        };
    }
}
