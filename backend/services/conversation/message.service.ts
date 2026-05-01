import Conversation from "../../models/Conversation";
import Message from "../../models/Message";

export const getMessagesService = async (
    userId: string,
    conversationId: string,
) => {
    const convo = await Conversation.findOne({ _id: conversationId, userId });
    if (!convo) {
        return { error: "Conversation not found!" };
    }
    return Message.find({ conversationId }).sort({ createdAt: 1 });
};
