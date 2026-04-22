import { GeminiAdapter } from "./gemini.adapter";
import { AIAdapter } from "./base.adapter";

export type Provider = "gemini";

export const getAdapter = (provider: Provider): AIAdapter => {
    switch (provider) {
        case "gemini":
        default:
            return new GeminiAdapter();
    }
}