import { MODELS } from "../../ai/models/model.registry";

export const selectModel = (modelId?: string) => {
    const fallback = "gemini-flash";

    const selected = modelId ? MODELS[modelId] : undefined;

    if (!selected) {
        console.warn("Invalid model, falling back:", modelId);
        return MODELS[fallback];
    }

    return selected;
};

