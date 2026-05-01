import { z } from "zod";

export const ChatRequestSchema = z.object({
    conversationId: z.string().optional().or(z.literal("new")),
    content: z.string().min(1).max(10000),
    model: z.string().default("gemini-2.0-flash"),
});

export const toMessageDTO = (doc: any) => ({
    id: doc._id.toString(),
    role: doc.role,
    content: doc.content,
    createdAt: doc.createdAt,
});
