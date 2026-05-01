import { http } from "../../services/http";
import type { ApiMessage } from "./types";

const API_BASE_URL = "http://localhost:5000/api";

export const fetchMessage = async (
    conversationId: string,
): Promise<ApiMessage[]> => {
    const res = await http.get(`/conversation/${conversationId}`);
    return Array.isArray(res.data) ? res.data : [];
};

type StreamEvent =
    | { type: "meta"; conversationId?: string; [key: string]: any }
    | { type: "delta"; text: string }
    | { type: "done" }
    | { type: "error"; error?: string }
    | { type: "aborted" };

type StreamOptions = {
    onSource?: (source: EventSource) => void;
    onCreated?: (data: { conversationId: string }) => void;
};

type StreamHandle = {
    streamId: string;
    conversationId: string;
    stop: () => Promise<void>;
};

export const streamMessage = async (
    payload: { conversationId: string; content: string; model?: string },
    onEvent: (event: StreamEvent) => void,
    options?: StreamOptions,
): Promise<StreamHandle> => {
    let closed = false;
    let source: EventSource | null = null;

    const cleanup = () => {
        if (source) {
            source.close();
            source = null;
        }
    };

    /**
     * STEP 1: Create stream session (CRITICAL)
     */
    const sessionRes = await http.post("/chat", payload);

    const streamId = sessionRes.data?.streamId;
    const conversationId = sessionRes.data?.conversationId;

    if (!streamId) {
        throw new Error("Unable to start chat stream");
    }

    if (conversationId) {
        options?.onCreated?.({ conversationId });
    }

    /**
     * STEP 2: Attach SSE
     */
    source = new EventSource(`${API_BASE_URL}/chat/stream/${streamId}`, {
        withCredentials: true,
    });

    options?.onSource?.(source);

    const safeCall = (fn: () => void) => {
        if (!closed) fn();
    };

    source.addEventListener("meta", (event) => {
        if (closed) return;
        try {
            const data = JSON.parse((event as MessageEvent).data);
            onEvent({ type: "meta", ...data });
        } catch {}
    });

    source.addEventListener("delta", (event) => {
        if (closed) return;
        try {
            const data = JSON.parse((event as MessageEvent).data);
            if (data?.text) {
                onEvent({ type: "delta", text: data.text });
            }
        } catch {}
    });

    source.addEventListener("done", () => {
        safeCall(() => {
            onEvent({ type: "done" });
            cleanup();
        });
    });

    source.addEventListener("aborted", () => {
        safeCall(() => {
            onEvent({ type: "aborted" });
            cleanup();
        });
    });

    source.addEventListener("error", (event) => {
        safeCall(() => {
            try {
                const data = JSON.parse((event as MessageEvent).data);
                onEvent({ type: "error", error: data?.error });
            } catch {
                onEvent({ type: "error", error: "Stream error" });
            }
            cleanup();
        });
    });

    source.onerror = () => {
        safeCall(() => {
            onEvent({ type: "error", error: "SSE connection failed" });
            cleanup();
        });
    };

    /**
     * STOP
     */
    const stop = async () => {
        closed = true;

        try {
            await http.post(`/chat/stream/${streamId}/stop`);
        } catch {}

        cleanup();
    };

    return {
        streamId,
        conversationId,
        stop,
    };
};
