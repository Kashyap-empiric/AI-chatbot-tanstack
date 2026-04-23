import { http } from "../../services/http";
import type { Conversation } from "./types";

const normalizeConversation = (c: any): Conversation => {
  return {
    id: c.id || c._id,
    title: c.title || "Untitled Chat",
    createdAt: c.createdAt,
  };
};

export const fetchConversation = async (): Promise<Conversation[]> => {
  const res = await http.get("/conversation");
  return (res.data || []).map(normalizeConversation);
};

export const createConversation = async (): Promise<Conversation> => {
  const res = await http.post("/conversation");
  return normalizeConversation(res.data);
};

export const deleteConversation = async (id: string): Promise<void> => {
  await http.delete(`/conversation/${id}`);
};

export const updateConversationTitle = async (
  id: string,
  title: string,
): Promise<Conversation> => {
  const res = await http.patch(`/conversation/${id}`, { title });
  return normalizeConversation(res.data);
};
