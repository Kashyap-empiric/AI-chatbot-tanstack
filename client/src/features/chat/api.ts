import { http } from "../../services/http";
import type { ApiMessage } from "./types";

const API_BASE_URL = "http://localhost:5000/api";

export const fetchMessage = async (
    conversationId: string,
): Promise<ApiMessage[]> => {
    const res = await http.get(`/conversation/${conversationId}`);
    return Array.isArray(res.data) ? res.data : [];
};

export const streamMessage = (
    payload: { conversationId: string; content: string; model?: string },
    onToken: (token: string) => void,
    options?: {
        onDone?: (metadata: unknown) => void;
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

    const stop = () => {
        closed = true;
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

                // Pass the source back to the caller if needed
                options?.onSource?.(source);

                const finish = (
                    resolveFn: (data: {
                        streamId: string;
                        conversationId: string;
                    }) => void,
                ) => {
                    safeCall(() => {
                        cleanup();
                        resolveFn({ streamId, conversationId });
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

            source.addEventListener("delta", (event) => {
                if (closed) return;

                try {
                    const message = JSON.parse((event as MessageEvent).data);
                    if (message?.text) {
                        onToken(message.text);
                    }
                } catch {
                    // ignore malformed chunk
                }
            });

            source.addEventListener("complete", (event) => {
                if (closed) return;

                try {
                    const message = JSON.parse((event as MessageEvent).data);
                    options?.onDone?.(message.metadata);
                } finally {
                    finish(resolve);
                }
            });

            source.addEventListener("error", () => {
                if (closed) return;

                /**
                 * EventSource "error" is NOT always fatal.
                 * But in most server setups without auto-reconnect handling,
                 * we treat it as terminal.
                 */
                fail(new Error("SSE connection failed or closed"));
            });
        });
    })();

    return {
        promise,
        stop,
    };
};
