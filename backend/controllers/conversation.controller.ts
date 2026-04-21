import type { Request, Response } from "express";
import Conversation from "../models/Conversation.ts"
import Message from "../models/Message.ts"
import { getAuth } from "@clerk/express";

export const createConversation = async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    const convo = await Conversation.create({
        userId,
        title: "New Conversation"
    })
    res.json(convo);
}

export const getConversations = async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    const convos = await Conversation.find({ userId }).sort({ createdAt: -1 });
    res.json(convos);
}

export const getMessages = async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    const { id } = req.params;
    const convo = await Conversation.findOne({ _id: id, userId });
    if (!convo) {
        return res.json({ error: "Not found" });
    }
    const messages = await Message.find({ conversationId: id }).sort({ createdAt: 1 });
    res.json(messages);
}

export const deleteConversation = async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    const { id } = req.params;
    const convo = await Conversation.findByIdAndDelete({ _id: id, userId });
    if (!convo) {
        return res.status(404).json({ error: "Not found"})
    }
    await Message.deleteMany({ conversationId: id });
    res.json({ success: true });
}

export const updateConversationTitle = async (req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);
        const { id } = req.params;
        const { title } = req.body;
        const updated = await Conversation.findByIdAndUpdate(
            { _id: id, userId}, { title }, { new: true }
        );
        if (!updated) {
            return res.status(404).json({ error: "Not found" });
        }
        res.json(updated);
    } catch {
        res.status(500).json({ error: "Falied to update title " });
    }
}