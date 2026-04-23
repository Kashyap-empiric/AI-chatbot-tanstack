import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true
    },
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    status: {
      type: String,
      enum: ["pending", "sent", "error"],
      default: "sent"
    },
    // tokens: {
    //   input: { type: Number, default: 0 },
    //   output: { type: Number, default: 0 }
    // },
    parentMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null
    }
}, {timestamps: true});

messageSchema.index({ conversationId: 1, createdAt: -1 });
export default mongoose.model("Message", messageSchema);