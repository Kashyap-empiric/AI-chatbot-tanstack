import { GoogleGenAI } from "@google/genai";
import { AIMessage, AIAdapter, AIStreamChunk } from "./base.adapter";
import { aiStream } from "../ai/stream/aiStream";

const getClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined");
    }
    return new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1beta" } });
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
        try {
            const stream = await this.client.models.generateContentStream({
                model,
                contents: toGeminiMessages(messages),
                config: { responseModalities: ["TEXT"] },
                signal,
            });

            yield* aiStream<any>({
                signal,

                factory: async () => stream,

                extract: (chunk: any) => ({
                    text: chunk?.text,
                }),
            });
        } catch (error) {
            if (signal?.aborted) {
                yield { type: "aborted" };
                return;
            }

            yield {
                type: "error",
                error: "STREAM_INIT_FAILED",
            };
        }
    }
}
