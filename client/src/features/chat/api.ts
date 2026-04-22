import { http } from "../../services/http";
import type { ApiMessage } from "./types";

export const fetchMessage = async (
  conversationId: string
): Promise<ApiMessage[]> => {
  const res = await http.get(`/conversation/${conversationId}`);
  return Array.isArray(res.data) ? res.data : [];
};

export const streamMessage = async (
  payload: { conversationId: string; content: string },
  onToken: (token: string) => void,
  onDone: () => void
) => {
  const res = await fetch("http://localhost:5000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) continue;

      console.log("RAW CHUNK:", line);
const chunk = JSON.parse(line);
console.log("PARSED CHUNK:", chunk);


      if (chunk.type === "token") {
        onToken(chunk.text);
      }

      if (chunk.type === "done") {
        onDone();
      }
    }
  }
};
