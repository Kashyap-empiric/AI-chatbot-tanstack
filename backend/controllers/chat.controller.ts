import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { chatService } from "../services/chat/chat.service";
import {
    consumeChatStreamSession,
    createChatStreamSession,
} from "../services/chat/stream-session.service";
import { paceTextStream } from "../services/chat/stream-pacing.service";

const writeSseEvent = (
    res: Response,
    event: string,
    data: Record<string, unknown>
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
    const { conversationId, content, model } = req.body;

    if (!conversationId || !content) {
        return res.status(400).json({
            error: "conversationId and content are required",
        });
    }

    const session = createChatStreamSession({
        userId: userId!,
        conversationId,
        content,
        model,
    });

    return res.status(201).json({
        streamId: session.id,
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

    try {
        console.log("[chat.controller]", {
            phase: "stream_connected",
            conversationId: session.conversationId,
            modelId: session.model || "default",
        });

        /**
         * SSE-only protocol (finalized)
         */
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");

        res.flushHeaders?.();

        /**
         * Stream start event
         */
        writeSseEvent(res, "start", {
            conversationId: session.conversationId,
            model: session.model || "default",
        });

        /**
         * Pure generation layer → pacing layer → SSE
         */
        const stream = chatService({
            userId: session.userId,
            conversationId: session.conversationId,
            content: session.content,
            model: session.model,
        });

        for await (const chunk of paceTextStream(stream)) {
            if (chunk.type === "delta") {
                writeSseEvent(res, "delta", {
                    text: chunk.text,
                });
                continue;
            }

            if (chunk.type === "complete") {
                writeSseEvent(res, "complete", {
                    metadata: chunk.metadata || null,
                });
            }
        }

        console.log("[chat.controller]", {
            phase: "stream_completed",
            conversationId: session.conversationId,
            elapsedMs: Date.now() - startedAt,
        });

        res.end();
    } catch (error: any) {
        const message = error?.message || "Internal Server Error";

        console.error("[chat.controller] error", {
            conversationId: session.conversationId,
            error: message,
            elapsedMs: Date.now() - startedAt,
        });

        if (!res.headersSent) {
            res.status(500).json({ error: message });
        } else {
            writeSseEvent(res, "error", {
                error: message,
            });
            res.end();
        }
    }
};
