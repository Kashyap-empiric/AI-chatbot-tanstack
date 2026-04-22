export interface AIAdapter {
    generate( input: {
        model: string,
        messages: AIMessage[];
    }): Promise<{
        text: string;
        modelVersion?: string;
    }>;

    stream(input: {
        model: string;
        messages: AIMessage[];
    }): AsyncGenerator<AIStreamChunk>;
}

export type AIMessage = {
    role: "system" | "user" | "assistant",
    content: string;
}

export type AIStreamChunk = {
    text: string;
    done: boolean;
}