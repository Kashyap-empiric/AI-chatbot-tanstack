import { useQuery } from "@tanstack/react-query";
import { fetchMessage } from "../api";
import type { ApiMessage, Message } from "../types";

const mapMessage = (message: ApiMessage): Message => ({
    id: message._id ?? crypto.randomUUID(),
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    status: "completed",
});

export const useMessages = (conversationId?: string) => {
    return useQuery({
        queryKey: ["messages", conversationId],
        queryFn: () => fetchMessage(conversationId!),
        enabled: !!conversationId && conversationId !== "new",
        select: (data): Message[] => {
            if (!Array.isArray(data)) return [];
            return data.map(mapMessage);
        },
        staleTime: 1000 * 30,
    });
};
