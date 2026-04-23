import express from "express";
import {
    createChatStream,
    streamChat,
} from "../controllers/chat.controller.ts";

const router = express.Router();

router.post("/", createChatStream);
router.get("/stream/:streamId", streamChat);

export default router;
