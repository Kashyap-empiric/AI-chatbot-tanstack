import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },
        role: {
            type: String,
            enum: ["user", "assistant"],
            required: true,
        },
        content: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["streaming", "completed", "aborted", "error"],
            default: "completed", // user messages default to completed
        },
        parentMessageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null,
        },
    },
    { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);
