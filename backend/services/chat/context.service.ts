import { AIMessage } from "../../adapters/base.adapter";

export const buildContext = (messages: any[]): AIMessage[] => {
    return messages.reverse().map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content
    }));
}