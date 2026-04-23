import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { chatService } from "../services/chat/chat.service";
import {
    consumeChatStreamSession,
    createChatStreamSession,
} from "../services/chat/stream-session.service";
import { paceTextStream } from "../services/chat/stream-pacing.service";
import Message from "../models/Message";
import Conversation from "../models/Conversation";

const writeSseEvent = (
    res: Response,
    event: string,
    data: Record<string, unknown>,
) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);

    // best-effort flush for proxies
    if (typeof (res as any).flush === "function") {
        (res as any).flush();
    }
};

export const createChatStream = async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    let { conversationId, content, model } = req.body;

    if (!content) {
        return res.status(400).json({
            error: "message is required",
        });
    }

    // LATE-CREATION: If ID is "new" or missing, create the conversation now
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
    const startedAt = Date.now();
    const { userId } = getAuth(req);
    const { streamId } = req.params;

    const session = consumeChatStreamSession(streamId);

    if (!session || session.userId !== userId) {
        return res.status(404).json({
            error: "Stream not found",
        });
    }

    let assistantContent = "";
    let userMsg: any = null;
    let streamFinished = false;

    try {
        console.log("[chat.controller]", {
            phase: "stream_connected",
            conversationId: session.conversationId,
        });

        // 1. Pre-save User Message (so it's not lost)
        userMsg = await Message.create({
            conversationId: session.conversationId,
            role: "user",
            content: session.content,
        });

        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();

        writeSseEvent(res, "start", {
            conversationId: session.conversationId,
            model: session.model || "default",
            userMessageId: userMsg._id,
        });

        const stream = chatService({
            userId: session.userId,
            conversationId: session.conversationId,
            content: session.content,
            model: session.model,
        });

        for await (const chunk of paceTextStream(stream)) {
            if (chunk.type === "delta") {
                assistantContent += chunk.text;
                writeSseEvent(res, "delta", { text: chunk.text });
                continue;
            }

            if (chunk.type === "complete") {
                writeSseEvent(res, "complete", {
                    metadata: chunk.metadata || null,
                });
                streamFinished = true;
            }
        }
    } catch (error: any) {
        const message = error?.message || "Internal Server Error";
        console.error("[chat.controller] error", {
            conversationId: session?.conversationId,
            error: message,
        });

        if (!res.headersSent) {
            res.status(500).json({ error: message });
        } else {
            writeSseEvent(res, "error", { error: message });
        }
    } finally {
        // 2. Finalize: Save Assistant Message if we have content
        if (userMsg && assistantContent) {
            try {
                await Message.create({
                    conversationId: session.conversationId,
                    role: "assistant",
                    content: assistantContent,
                    parentMessageId: userMsg._id,
                });

                await Conversation.findByIdAndUpdate(session.conversationId, {
                    $set: { lastMessageAt: new Date() },
                    $inc: { messageCount: 2 },
                });

                console.log("[chat.controller] saved assistant response", {
                    conversationId: session.conversationId,
                    charCount: assistantContent.length,
                    isComplete: streamFinished,
                });
            } catch (saveErr) {
                console.error(
                    "[chat.controller] failed to save assistant message",
                    saveErr,
                );
            }
        }

        res.end();
    }
};
