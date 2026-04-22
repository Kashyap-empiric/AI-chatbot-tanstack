import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { chatService } from "../services/chat/chat.service";

export const chat = async (req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);
        const { conversationId, content, model } = req.body;

        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no"); // IMPORTANT for proxies

        res.flushHeaders?.();

        const stream = chatService({
            userId: userId!,
            conversationId,
            content,
            model
        });

        for await (const chunk of stream) {
            res.write(JSON.stringify(chunk) + "\n");
            if (typeof (res as any).flush === "function") {
            (res as any).flush();
        }
            // fallback nudge
            res.socket?.write?.("");
            console.log("TOKEN:", chunk.text);
        }

        console.log("STREAM DONE");
        res.end();

    } catch (error: any) {
        console.error("Chat controller Error:", error?.message);

        if (!res.headersSent) {
            res.status(500).json({
                error: error?.message || "Internal Server Error"
            });
        } else {
            res.end();
        }
    }
};

