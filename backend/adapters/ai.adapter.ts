import { GeminiAdapter } from "./gemini.adapter";
import { NvidiaAdapter } from "./nvidia.adapter";
import { AIAdapter } from "./base.adapter";

export type Provider = "gemini" | "nvidia";

export const getAdapter = (provider: Provider): AIAdapter => {
    switch (provider) {
        case "nvidia":
            return new NvidiaAdapter();
        case "gemini":
        default:
            return new GeminiAdapter();
    }
};
