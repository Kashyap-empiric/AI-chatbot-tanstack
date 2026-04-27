import express from "express";
import {
    createChatStream,
    streamChat,
    stopChatStream,
} from "../controllers/chat.controller.ts";

const router = express.Router();

router.post("/", createChatStream);
router.get("/stream/:streamId", streamChat);
router.post("/stream/:streamId/stop", stopChatStream);

export default router;
