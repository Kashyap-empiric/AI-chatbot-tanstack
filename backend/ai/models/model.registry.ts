export type Provider = "gemini" | "nvidia";

export type ModelConfig = {
    provider: Provider;
    model: string;
}

export const MODELS: Record<string, ModelConfig> = {
    "gemini-flash": {
        provider: "gemini",
        model: "gemini-2.5-flash-lite"
    },
    "llama-70b": {
        provider: "nvidia",
        model: "meta/llama-3.3-70b-instruct",
    },
    "llama-8b": {
        provider: "nvidia",
        model: "meta/llama-3.1-8b-instruct",
    },
    "phi-4-mini": {
        provider: "nvidia",
        model: "microsoft/phi-4-mini-instruct",
    },
    "deepseek-r1": {
        provider: "nvidia",
        model: "deepseek-ai/deepseek-v3.2",
    },
    "kimi-k2": {
        provider: "nvidia",
        model: "moonshotai/kimi-k2-instruct",
    },
    "minimax-2.7": {
        provider: "nvidia",
        model: "minimaxai/minimax-m2.7",
    },
    "glm-4.7": {
        provider: "nvidia",
        model: "z-ai/glm-4.7",
    },
}
