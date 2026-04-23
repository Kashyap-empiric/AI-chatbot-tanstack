type ChatStreamSession = {
    id: string;
    userId: string;
    conversationId: string;
    content: string;
    model?: string;
    createdAt: number;
};

const SESSION_TTL_MS = 5 * 60 * 1000;
const sessions = new Map<string, ChatStreamSession>();

const removeExpiredSessions = () => {
    const now = Date.now();

    for (const [id, session] of sessions.entries()) {
        if (now - session.createdAt > SESSION_TTL_MS) {
            sessions.delete(id);
        }
    }
};

export const createChatStreamSession = ({
    userId,
    conversationId,
    content,
    model,
}: Omit<ChatStreamSession, "id" | "createdAt">) => {
    removeExpiredSessions();

    const id = crypto.randomUUID();
    const session: ChatStreamSession = {
        id,
        userId,
        conversationId,
        content,
        model,
        createdAt: Date.now(),
    };

    sessions.set(id, session);
    return session;
};

export const consumeChatStreamSession = (id: string) => {
    removeExpiredSessions();

    const session = sessions.get(id);
    if (!session) {
        return null;
    }

    sessions.delete(id);
    return session;
};
