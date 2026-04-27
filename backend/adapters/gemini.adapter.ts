import { GoogleGenAI } from "@google/genai";
import { AIMessage, AIAdapter, AIStreamChunk } from "./base.adapter";

const getClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined");
    }
    return new GoogleGenAI({ apiKey });
};

const toGeminiMessages = (messages: AIMessage[]) => {
    return messages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : msg.role,
        parts: [{ text: msg.content }],
    }));
};

type StreamOptions = {
    model: string;
    messages: AIMessage[];
    signal?: AbortSignal;
};

export class GeminiAdapter implements AIAdapter {
    private client = getClient();

    async generate({
        model,
        messages,
    }: {
        model: string;
        messages: AIMessage[];
    }) {
        const response = await this.client.models.generateContent({
            model,
            contents: toGeminiMessages(messages),
        });

        return {
            text: response.text || "",
            modelVersion: response?.modelVersion || null,
        };
    }

    async *stream({
        model,
        messages,
        signal,
    }: StreamOptions): AsyncGenerator<AIStreamChunk> {
        let stream;

        try {
            stream = await this.client.models.generateContentStream({
                model,
                contents: toGeminiMessages(messages),
                config: { responseModalities: ["TEXT"] },
                signal, // critical for abort
            });
        } catch (error) {
            yield {
                type: "error",
                error: "STREAM_INIT_FAILED",
            };
            return;
        }

        try {
            for await (const chunk of stream) {
                if (signal?.aborted) {
                    yield { type: "aborted" };
                    return;
                }

                const text = chunk?.text || "";
                if (!text) continue;

                yield {
                    type: "delta",
                    text,
                };
            }

            yield {
                type: "done",
            };
        } catch (error) {
            if (signal?.aborted) {
                yield { type: "aborted" };
                return;
            }

            yield {
                type: "error",
                error: "STREAM_RUNTIME_ERROR",
            };
        }
    }
}
