import { getAdapter } from "../../adapters/ai.adapter";
import { AIMessage } from "../../adapters/base.adapter";
import { selectModel } from "./routing.service";

type AIInput = {
    messages: AIMessage[];
    model?: string;
};

export const generateAIResponse = async ({ messages, model}: AIInput) => {
    const selectedModel = selectModel(model);
console.log("MODEL INPUT:", model);
console.log("SELECTED:", selectedModel);

    const adapter = getAdapter("gemini");
    try {
        const response = await adapter.generate({
            model: selectedModel.model,
            messages
        });
        return {
            text: response.text,
            modelVersion: response.modelVersion || null,
            model: selectedModel.model,
            provider: selectedModel.provider
        }
    } catch(error) {
        console.error(`${selectedModel.provider}:${selectedModel.model} AI error`, error);

        return {
            text: `Sorry, ${selectedModel.model} is not available right now.`,
            modelVersion: null,
            model: selectedModel.model,
            provider: selectedModel.provider,
            error: "MODEL_UNAVAILABLE"
        }
    }
}