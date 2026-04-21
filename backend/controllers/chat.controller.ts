import type { Request, Response } from "express";
import Message from "../models/Message.ts";
import Conversation from "../models/Conversation.ts";
import { GoogleGenAI } from "@google/genai";
import { getAuth } from "@clerk/express";

const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined");
    }
    return new GoogleGenAI({ apiKey });
};

const toMessageDTO = (doc: any) => ({
    id: doc._id.toString(),
    role: doc.role,
    content: doc.content,
    createdAt: doc.createdAt
})

export const chat = async (req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);
        const gemini = getGeminiClient();
        const { conversationId, content, model } = req.body;
        const conversation = await Conversation.findOne({ _id: conversationId, userId});
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        const selectedModel = model || process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

        const userMsg = await Message.create({
            userId,
            conversationId, role: "user", content, status: "sent"
        });

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessageAt: new Date(),
            $inc: { messageCount: 1 },
        })

        if (conversation && conversation.title === "New Conversation") {
            const newTitle = content.trim().slice(0, 25);
            conversation.title = newTitle || "New Conversation";
            await conversation.save();
        }

        const recentMessages = await Message.find({ conversationId }).sort({ createdAt: -1 }).limit(5).lean();

        const contents = recentMessages.reverse().map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }]
        }));

        let response;

        try {
            response = await gemini.models.generateContent({
                model: selectedModel,
                contents,
            });
        } catch (err: any) {
            console.error("Gemini API Error");
            const errorMsg = await Message.create({
                userId,
                conversationId,
                role: "model",
                content: "Sorry, this model is not available right now.",
                status: "error"
            });
            await Conversation.findByIdAndUpdate(conversationId, {
                lastMessageAt: new Date(),
                $inc: { messageCount: 1 },
            });
            return res.json({
                messages: [toMessageDTO(userMsg), toMessageDTO(errorMsg)],
                model_version: null,
                model_selected: selectedModel,
                error: "MODEL_UNAVAILABLE",
            });
        }

        const reply = response.text;
        const model_version = response?.modelVersion || null;

        const modelMsg = await Message.create({
            userId,
            conversationId, role: "model", content: reply, status: "error"
        })

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessageAt: new Date(),
            $inc: { messageCount: 1}
        })

        res.json({
            messages: [toMessageDTO(userMsg), toMessageDTO(modelMsg)],
            model_version,
            model_selected: selectedModel
        });
    } catch (error: any) {
        console.error("Gemini API Error:", error?.message, error);
        res.status(500).json({ error: error?.message || "Internal Server Error" })
    }
};
