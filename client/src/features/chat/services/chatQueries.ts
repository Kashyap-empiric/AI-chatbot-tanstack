import { useQuery } from "@tanstack/react-query";
import { fetchMessage } from "../api";
import type { ApiMessage, Message } from "../types";

const mapMessage = (message: ApiMessage): Message => ({
    id: message._id ?? crypto.randomUUID(),
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
});

export const useMessages = (conversationId?: string) => {
    return useQuery({
        queryKey: ["messages", conversationId],
        queryFn: () => fetchMessage(conversationId!),
        enabled: !!conversationId && conversationId !== "new",
        select: (data) => (Array.isArray(data) ? data.map(mapMessage) : []),
        staleTime: 10_000,
    });
};
