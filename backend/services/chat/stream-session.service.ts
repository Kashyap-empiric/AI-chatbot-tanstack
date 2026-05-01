import { chatService } from "./chat.service";
import { paceTextStream } from "./stream-pacing.service";
import { PersistenceBatcher } from "./persistence-batching.service";

import Message from "../../models/Message";
import Conversation from "../../models/Conversation";
import { AIStreamChunk } from "../../adapters/base.adapter";

type StreamChunk = AIStreamChunk;

type ChatStreamStatus = "active" | "completed" | "aborted" | "error";

type Subscriber = {
    res: any;
};


type ChatStreamSession = {
    id: string;
    userId: string;
    conversationId: string;
    content: string;
    model?: string;

    controller: AbortController;
    status: ChatStreamStatus;

    buffer: StreamChunk[];
    subscribers: Set<Subscriber>;

    isRunning: boolean;

    assistantMessageId: string;
    userMessageId: string;
    accumulatedContent: string;
    batcher: PersistenceBatcher | null;

    createdAt: number;
    updatedAt: number;
};

const sessions = new Map<string, ChatStreamSession>();
const SESSION_TTL_MS = 5 * 60 * 1000;

const now = () => Date.now();

const broadcast = (session: ChatStreamSession, event: StreamChunk) => {
    for (const sub of session.subscribers) {
        try {
            sub.res.write(`event: ${event.type}\n`);
            sub.res.write(`data: ${JSON.stringify(event)}\n\n`);
            sub.res.flush?.();
        } catch {}
    }
};

const runStream = async (session: ChatStreamSession) => {
    if (session.isRunning) return;
    session.isRunning = true;

    session.batcher = new PersistenceBatcher(
        async (chunkText, isFinal) => {
            session.accumulatedContent += chunkText;

            await Message.findByIdAndUpdate(session.assistantMessageId, {
                $set: {
                    content: session.accumulatedContent,
                    status: isFinal ? "completed" : "streaming",
                },
            });

            if (isFinal) {
                await Conversation.findByIdAndUpdate(session.conversationId, {
                    $set: { lastMessageAt: new Date() },
                    $inc: { messageCount: 2 },
                });
            }
        },
        {
            flushIntervalMs: 800,
            maxBufferLength: 800,
        },
    );

    session.batcher.start();

    try {
        const stream = chatService({
            userId: session.userId,
            conversationId: session.conversationId,
            content: session.content,
            model: session.model,
            signal: session.controller.signal,
        });

        for await (const chunk of paceTextStream(stream)) {
            if (session.status !== "active") break;

            session.buffer.push(chunk);
            session.updatedAt = now();

            broadcast(session, chunk);

            if (chunk.type === "delta" && chunk.text) {
                session.batcher.append(chunk.text);
                continue;
            }

            if (chunk.type === "done") {
                await session.batcher.finalize();
                session.status = "completed";
                break;
            }

            if (chunk.type === "error") {
                session.batcher.stop();

                await Message.findByIdAndUpdate(session.assistantMessageId, {
                    $set: { status: "error" },
                });

                session.status = "error";
                break;
            }

            if (chunk.type === "aborted") {
                session.batcher.stop();

                await Message.findByIdAndUpdate(session.assistantMessageId, {
                    $set: { status: "aborted" },
                });

                session.status = "aborted";
                break;
            }
        }
    } catch {
        session.status = "error";

        session.batcher?.stop();

        await Message.findByIdAndUpdate(session.assistantMessageId, {
            $set: { status: "error" },
        });
    } finally {
        session.isRunning = false;
    }
};

export const createChatStreamSession = ({
    userId,
    conversationId,
    content,
    model,
    assistantMessageId,
    userMessageId,
}: {
    userId: string;
    conversationId: string;
    content: string;
    model?: string;
    assistantMessageId: string;
    userMessageId: string;
}) => {
    cleanup();

    const id = crypto.randomUUID();

    const session: ChatStreamSession = {
        id,
        userId,
        conversationId,
        content,
        model,

        controller: new AbortController(),
        status: "active",

        buffer: [],
        subscribers: new Set(),

        isRunning: false,

        assistantMessageId,
        userMessageId,
        accumulatedContent: "",
        batcher: null,

        createdAt: now(),
        updatedAt: now(),
    };

    sessions.set(id, session);

    runStream(session);

    return session;
};

export const getChatStreamSession = (id: string) => {
    cleanup();
    return sessions.get(id) || null;
};

export const subscribeToStream = (session: ChatStreamSession, res: any) => {
    const subscriber: Subscriber = { res };
    session.subscribers.add(subscriber);

    for (const event of session.buffer) {
        res.write(`event: ${event.type}\n`);
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.flush?.();

    return () => {
        session.subscribers.delete(subscriber);
    };
};

export const abortChatStreamSession = (id: string) => {
    const session = sessions.get(id);
    if (!session) return false;

    if (session.status !== "active") return false;

    session.controller.abort();
    session.status = "aborted";
    session.updatedAt = now();

    return true;
};

const cleanup = () => {
    const current = now();

    for (const [id, session] of sessions.entries()) {
        const expired = current - session.updatedAt > SESSION_TTL_MS;

        if (
            expired &&
            session.status !== "active" &&
            session.subscribers.size === 0
        ) {
            sessions.delete(id);
        }
    }
};
