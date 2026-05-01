import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";

import Conversation from "../models/Conversation";
import Message from "../models/Message";

import { ChatRequestSchema } from "../utils/dto";

import {
    createChatStreamSession,
    getChatStreamSession,
    subscribeToStream,
    abortChatStreamSession,
} from "../services/chat/stream-session.service";

export const createChatStream = async (req: Request, res: Response) => {
    const { userId } = getAuth(req);

    const validated = ChatRequestSchema.safeParse(req.body);
    if (!validated.success) {
        return res.status(400).json({ error: validated.error });
    }

    let { conversationId, content, model } = validated.data;

    if (!conversationId || conversationId === "new") {
        const title =
            content.length > 30 ? `${content.slice(0, 30)}...` : content;

        const convo = await Conversation.create({
            userId: userId!,
            title,
        });

        conversationId = convo._id.toString();
    }

    const userMsg = await Message.create({
        conversationId,
        role: "user",
        content,
    });

    const assistantMsg = await Message.create({
        conversationId,
        role: "assistant",
        content: "",
        parentMessageId: userMsg._id,
        status: "streaming",
    });

    const session = createChatStreamSession({
        userId: userId!,
        conversationId,
        content,
        model,
        assistantMessageId: assistantMsg._id.toString(),
        userMessageId: userMsg._id.toString(),
    });

    (session as any).assistantMessageId = assistantMsg._id;
    (session as any).userMessageId = userMsg._id;

    return res.status(201).json({
        streamId: session.id,
        conversationId,
    });
};

export const streamChat = async (req: Request, res: Response) => {
    const { userId } = getAuth(req);

    const streamId = Array.isArray(req.params.streamId)
        ? req.params.streamId[0]
        : req.params.streamId;

    const session = getChatStreamSession(streamId);

    if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Stream not found" });
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    res.flushHeaders?.();

    const unsubscribe = subscribeToStream(session, res);

    req.on("close", () => {
        unsubscribe();
    });
};

export const stopChatStream = async (req: Request, res: Response) => {
    const { userId } = getAuth(req);

    const streamId = Array.isArray(req.params.streamId)
        ? req.params.streamId[0]
        : req.params.streamId;

    const session = getChatStreamSession(streamId);

    if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Stream not found" });
    }

    const success = abortChatStreamSession(streamId);

    return res.status(200).json({ success });
};
