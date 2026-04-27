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

export const streamMessage = (
    payload: { conversationId: string; content: string; model?: string },
    onEvent: (event: StreamEvent) => void,
    options?: {
        onSource?: (source: EventSource) => void;
        onCreated?: (data: { conversationId: string }) => void;
    },
) => {
    let closed = false;
    let source: EventSource | null = null;

    const cleanup = () => {
        if (source) {
            source.close();
            source = null;
        }
    };

    const stop = async () => {
        closed = true;

        try {
            if (source) {
                const match = source.url.match(/\/stream\/([^/]+)/);
                const streamId = match?.[1];

                if (streamId) {
                    // call backend abort endpoint
                    await http.post(`/chat/stream/${streamId}/stop`);
                }
            }
        } catch {
            // ignore stop errors
        }

        cleanup();
    };

    const safeCall = (fn: () => void) => {
        if (!closed) fn();
    };

    const promise = (async () => {
        const sessionRes = await http.post("/chat", payload);
        const streamId = sessionRes.data?.streamId;
        const conversationId = sessionRes.data?.conversationId;

        if (conversationId) {
            options?.onCreated?.({ conversationId });
        }

        if (!streamId) {
            throw new Error("Unable to start chat stream");
        }

        return new Promise<{ streamId: string; conversationId: string }>(
            (resolve, reject) => {
                if (closed)
                    return reject(new Error("Stream cancelled before start"));

                source = new EventSource(
                    `${API_BASE_URL}/chat/stream/${streamId}`,
                    { withCredentials: true },
                );

                options?.onSource?.(source);

                const finish = () => {
                    safeCall(() => {
                        cleanup();
                        resolve({ streamId, conversationId });
                    });
                };

                const fail = (err: Error) => {
                    safeCall(() => {
                        cleanup();
                        reject(err);
                    });
                };

                source.onopen = () => {
                    if (closed) cleanup();
                };

                // META
                source.addEventListener("meta", (event) => {
                    if (closed) return;

                    try {
                        const data = JSON.parse((event as MessageEvent).data);
                        onEvent({ type: "meta", ...data });
                    } catch {
                        // Ignore malformed meta chunks
                    }
                });

                // DELTA
                source.addEventListener("delta", (event) => {
                    if (closed) return;

                    try {
                        const data = JSON.parse((event as MessageEvent).data);
                        if (data?.text) {
                            onEvent({ type: "delta", text: data.text });
                        }
                    } catch {
                        // Ignore malformed delta chunks
                    }
                });

                // DONE
                source.addEventListener("done", () => {
                    if (closed) return;

                    onEvent({ type: "done" });
                    finish();
                });

                // ABORTED
                source.addEventListener("aborted", () => {
                    if (closed) return;

                    onEvent({ type: "aborted" });
                    finish();
                });

                // ERROR (from server)
                source.addEventListener("error", (event) => {
                    if (closed) return;

                    try {
                        const data = JSON.parse((event as MessageEvent).data);
                        onEvent({ type: "error", error: data?.error });
                    } catch {
                        onEvent({ type: "error", error: "Stream error" });
                    }

                    fail(new Error("SSE stream error"));
                });

                // NETWORK ERROR (EventSource internal)
                source.onerror = () => {
                    if (closed) return;
                    fail(new Error("SSE connection failed"));
                };
            },
        );
    })();

    return {
        promise,
        stop,
    };
};
