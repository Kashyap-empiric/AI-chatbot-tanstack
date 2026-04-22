export const selectModel = (model?: string) => {
    return model || process.env.GEMINI_MODEL || "gemma-3-27b-it";
};
