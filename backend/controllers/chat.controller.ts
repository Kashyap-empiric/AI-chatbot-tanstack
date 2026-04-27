import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { chatService } from "../services/chat/chat.service";
import {
    getChatStreamSession,
    createChatStreamSession,
    abortChatStreamSession,
    completeChatStreamSession,
    errorChatStreamSession,
    deleteChatStreamSession,
} from "../services/chat/stream-session.service";
import { paceTextStream } from "../services/chat/stream-pacing.service";
import { PersistenceBatcher } from "../services/chat/persistence-batching.service";
import Message from "../models/Message";
import Conversation from "../models/Conversation";

const writeSseEvent = (
    res: Response,
    event: string,
    data: Record<string, unknown>,
) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);

    if (typeof (res as any).flush === "function") {
        (res as any).flush();
    }
};

export const createChatStream = async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    let { conversationId, content, model } = req.body;

    if (!content) {
        return res.status(400).json({ error: "message is required" });
    }

    if (!conversationId || conversationId === "new") {
        const title =
            content.length > 30 ? `${content.slice(0, 30)}...` : content;

        const convo = await Conversation.create({
            userId: userId!,
            title,
        });

        conversationId = convo._id.toString();
    }

    const session = createChatStreamSession({
        userId: userId!,
        conversationId,
        content,
        model,
    });

    return res.status(201).json({
        streamId: session.id,
        conversationId,
    });
};

export const streamChat = async (req: Request, res: Response) => {
    const { userId } = getAuth(req);

    const rawStreamId = req.params.streamId;
    const streamId = Array.isArray(rawStreamId) ? rawStreamId[0] : rawStreamId;

    const session = getChatStreamSession(streamId);

    if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Stream not found" });
    }

    let assistantContent = "";
    let assistantMessageId: any = null;
    let userMsg: any = null;
    let streamFinished = false;
    let isAborted = false;

    let batcher: PersistenceBatcher | null = null;

    try {
        console.log("[chat.controller]", {
            phase: "stream_connected",
            conversationId: session.conversationId,
        });

        userMsg = await Message.create({
            conversationId: session.conversationId,
            role: "user",
            content: session.content,
        });

        batcher = new PersistenceBatcher(
            async (chunkText, isFinal) => {
                assistantContent += chunkText;

                if (!assistantMessageId) {
                    const msg = await Message.create({
                        conversationId: session.conversationId,
                        role: "assistant",
                        content: chunkText,
                        parentMessageId: userMsg._id,
                    });

                    assistantMessageId = msg._id;
                } else {
                    await Message.findByIdAndUpdate(assistantMessageId, {
                        $set: { content: assistantContent },
                    });
                }

                if (isFinal) {
                    await Conversation.findByIdAndUpdate(
                        session.conversationId,
                        {
                            $set: { lastMessageAt: new Date() },
                            $inc: { messageCount: 2 },
                        },
                    );
                }
            },
            {
                flushIntervalMs: 1500,
                maxBufferLength: 800,
            },
        );

        batcher.start();

        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();

        req.on("close", () => {
            abortChatStreamSession(streamId);
            console.log("CLIENT CLOSED");
        });

        writeSseEvent(res, "meta", {
            conversationId: session.conversationId,
            model: session.model || "default",
            userMessageId: userMsg._id,
        });

        const stream = chatService({
            userId: session.userId,
            conversationId: session.conversationId,
            content: session.content,
            model: session.model,
            signal: session.controller.signal,
        });

        for await (const chunk of paceTextStream(stream)) {
            if (chunk.type === "delta") {
                if (chunk.text) {
                    batcher.append(chunk.text);
                    writeSseEvent(res, "delta", { text: chunk.text });
                }
                continue;
            }

            if (chunk.type === "done") {
                streamFinished = true;

                await batcher.finalize();

                writeSseEvent(res, "done", {
                    finishReason: (chunk as any).finishReason ?? "stop",
                    truncated: (chunk as any).truncated ?? false,
                });

                completeChatStreamSession(streamId);
                break;
            }

            if (chunk.type === "error") {
                batcher.stop();

                writeSseEvent(res, "error", {
                    error: chunk.error,
                });

                errorChatStreamSession(streamId);
                break;
            }

            if (chunk.type === "aborted") {
                isAborted = true;
                batcher.stop();

                writeSseEvent(res, "aborted", {
                    reason: "client_abort",
                });

                break;
            }
        }
    } catch (error: any) {
        const message = error?.message || "Internal Server Error";

        console.error("[chat.controller] error", {
            conversationId: session?.conversationId,
            error: message,
        });

        batcher?.stop();
        errorChatStreamSession(streamId);

        if (!res.headersSent) {
            res.status(500).json({ error: message });
        } else {
            writeSseEvent(res, "error", { error: message });
        }
    } finally {
        if (!isAborted && batcher) {
            await batcher.finalize();
        } else {
            batcher?.stop();
        }

        deleteChatStreamSession(streamId);
        res.end();
    }
};

export const stopChatStream = async (req: Request, res: Response) => {
    const { userId } = getAuth(req);

    const rawStreamId = req.params.streamId;
    const streamId = Array.isArray(rawStreamId) ? rawStreamId[0] : rawStreamId;

    const session = getChatStreamSession(streamId);

    if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Stream not found" });
    }

    abortChatStreamSession(streamId);

    return res.status(200).json({ success: true });
};
