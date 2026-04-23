import { http } from "../../services/http";
import type { ApiMessage } from "./types";

const API_BASE_URL = "http://localhost:5000/api";

export const fetchMessage = async (
  conversationId: string,
): Promise<ApiMessage[]> => {
  const res = await http.get(`/conversation/${conversationId}`);
  return Array.isArray(res.data) ? res.data : [];
};


export const streamMessage = async (
  payload: { conversationId: string; content: string; model?: string },
  onToken: (token: string) => void,
  onDone?: (metadata: unknown) => void,
) => {
  const sessionRes = await http.post("/chat", payload);
  const streamId = sessionRes.data?.streamId;

  if (!streamId) {
    throw new Error("Unable to start chat stream");
  }

  return new Promise<void>((resolve, reject) => {
    const source = new EventSource(
      `${API_BASE_URL}/chat/stream/${streamId}`,
      { withCredentials: true },
    );

    const close = () => {
      source.close();
    };

    /**
     * Connection established
     * (important for debugging latency perception)
     */
    source.onopen = () => {
      // optional: can log or hook UI "connected" state
    };

    /**
     * Token stream (delta events)
     */
    source.addEventListener("delta", (event) => {
      const message = JSON.parse((event as MessageEvent).data);
      if (message?.text) {
        onToken(message.text);
      }
    });

    /**
     * Completion event
     */
    source.addEventListener("complete", (event) => {
      const message = JSON.parse((event as MessageEvent).data);

      onDone?.(message.metadata);
      close();
      resolve();
    });

    /**
     * Error handling (best-effort, SSE is unreliable here)
     */
    source.addEventListener("error", () => {
      close();
      reject(new Error("SSE connection failed or was closed"));
    });
  });
};
