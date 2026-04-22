import Conversation from "../../models/Conversation";
import Message from "../../models/Message";
import { buildContext } from "./context.service";
import { getRecentMessages } from "./memory.service";
import { toMessageDTO } from "../../utils/dto";
import { AIMessage, AIStreamChunk } from "../../adapters/base.adapter";
import { getAdapter } from "../../adapters/ai.adapter";

type ChatInput = {
    userId: string;
    conversationId: string;
    content: string;
    model?: string;
};

export const chatService = async function* ({
    userId,
    conversationId,
    content,
    model = "gemini",
}: ChatInput) {
    const conversation = await Conversation.findOne({
        _id: conversationId,
        userId,
    } as any );
    if (!conversation) {
        throw new Error("Conversation not found");
    }

    const userMsg = await Message.create({
        userId,
        conversationId,
        role: "user",
        content,
        status: "sent",
    } as any );

    yield {
        type: "meta",
        text: "user_message_saved"
    }

    await Conversation.findByIdAndUpdate(conversationId, {
        lastMessageAt: new Date(),
        $inc: { messageCount: 1 },
    } as any);

    if (conversation.title === "New Conversation") {
        const newTitle = content.trim().slice(0, 25);
        conversation.title = newTitle || "New Conversation";
        await conversation.save();
    }

    const recentMessages = await getRecentMessages(conversationId);
    const messages: AIMessage[] = buildContext(recentMessages);

    const adaptor = getAdapter(model as any);

    let fullText = "";

    const stream = adaptor.stream({
        model,
        messages,
    });

    for await (const chunk of stream) {
        fullText += chunk.text;
        yield {
            type: "token",
            text: chunk.text
        };
    }

    const modelMsg = await Message.create({
        userId,
        conversationId,
        role: "model",
        content: fullText,
        status: "success",
    } as any );
    await Conversation.findByIdAndUpdate(conversationId, {
        lastMessageAt: new Date(),
        $inc: { messageCount: 1 },
    } as any);
    yield {
        type: "done",
        text: "",
        metadata: {
            messageId: modelMsg._id,
            model
        }
    }
};
