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
            modelVersion: response?.modelVersion,
        };
    }

    async *stream({
        model,
        messages,
    }: {
        model: string;
        messages: AIMessage[];
    }): AsyncGenerator<AIStreamChunk> {
        const stream = await this.client.models.generateContentStream({
            model,
            contents: toGeminiMessages(messages),
            config: { responseModalities: ["TEXT"] },
        });

        let fullText = "";

        for await (const chunk of stream) {
            const text = chunk?.text || "";
            if (!text) continue;

            fullText += text;
            yield {
                text,
                done: false,
            };
        }

        console.log("STREAM FINISHED, total length:", fullText.length);

        yield {
            text: "",
            done: true,
        };
    }
}
