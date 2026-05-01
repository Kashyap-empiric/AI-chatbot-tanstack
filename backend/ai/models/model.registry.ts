export type Provider = "gemini" | "nvidia";

export type ModelConfig = {
    provider: Provider;
    model: string;
};

export const MODELS: Record<string, ModelConfig> = {
    "gemini-2.5-flash-lite": {
        provider: "gemini",
        model: "gemini-2.5-flash-lite",
    },
    "gemini-2.5-flash": {
        provider: "gemini",
        model: "gemini-2.5-flash",
    },
    "gemini-2.0-flash": {
        provider: "gemini",
        model: "gemini-2.0-flash",
    },
    "gemini-3.1-flash-lite-preview": {
        provider: "gemini",
        model: "gemini-3.1-flash-lite-preview",
    },
    "llama-70b": {
        provider: "nvidia",
        model: "meta/llama-3.3-70b-instruct",
    },
    "gpt-oss-120b": {
        provider: "nvidia",
        model: "openai/gpt-oss-120b",
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
};
