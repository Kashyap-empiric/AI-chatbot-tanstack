type ChatStreamStatus = "active" | "completed" | "aborted" | "error";

type ChatStreamSession = {
    id: string;
    userId: string;
    conversationId: string;
    content: string;
    model?: string;

    controller: AbortController;
    status: ChatStreamStatus;

    createdAt: number;
    updatedAt: number;
};

const SESSION_TTL_MS = 5 * 60 * 1000;

const sessions = new Map<string, ChatStreamSession>();

const now = () => Date.now();

const removeExpiredSessions = () => {
    const current = now();

    for (const [id, session] of sessions.entries()) {
        const isExpired = current - session.updatedAt > SESSION_TTL_MS;

        // Do not kill active streams prematurely
        if (isExpired && session.status !== "active") {
            sessions.delete(id);
        }
    }
};

export const createChatStreamSession = ({
    userId,
    conversationId,
    content,
    model,
}: {
    userId: string;
    conversationId: string;
    content: string;
    model?: string;
}) => {
    removeExpiredSessions();

    const id = crypto.randomUUID();
    const controller = new AbortController();

    const session: ChatStreamSession = {
        id,
        userId,
        conversationId,
        content,
        model,
        controller,
        status: "active",
        createdAt: now(),
        updatedAt: now(),
    };

    sessions.set(id, session);
    return session;
};

export const getChatStreamSession = (id: string) => {
    removeExpiredSessions();

    const session = sessions.get(id);
    if (!session) return null;

    session.updatedAt = now();
    return session;
};

export const consumeChatStreamSession = (id: string) => {
    const session = getChatStreamSession(id);
    return session;
};

export const abortChatStreamSession = (id: string) => {
    const session = sessions.get(id);
    if (!session) return false;

    if (session.status !== "active") {
        return false;
    }

    session.controller.abort();
    session.status = "aborted";
    session.updatedAt = now();

    return true;
};

export const completeChatStreamSession = (id: string) => {
    const session = sessions.get(id);
    if (!session) return;

    session.status = "completed";
    session.updatedAt = now();
};

export const errorChatStreamSession = (id: string) => {
    const session = sessions.get(id);
    if (!session) return;

    session.status = "error";
    session.updatedAt = now();
};

export const deleteChatStreamSession = (id: string) => {
    sessions.delete(id);
};
