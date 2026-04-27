import { AIAdapter, AIMessage, AIStreamChunk } from "./base.adapter";

const getApiKey = () => {
    const key = process.env.NVIDIA_BUILD_API_KEY;
    if (!key) {
        throw new Error("NVIDIA_BUILD_API_KEY is not defined");
    }
    return key;
};

const BASE_URL = "https://integrate.api.nvidia.com/v1";

const buildRequestBody = ({
    model,
    messages,
    stream = false,
}: {
    model: string;
    messages: AIMessage[];
    stream?: boolean;
}) => ({
    model,
    messages,
    temperature: 0.5,
    max_tokens: 8192,
    stream,
});

const formatNvidiaError = async (res: Response, model: string) => {
    const raw = await res.text();

    try {
        const parsed = JSON.parse(raw);
        return (
            parsed.error?.message ||
            parsed.error?.detail ||
            `NVIDIA error (${res.status}) for ${model}`
        );
    } catch {
        return `NVIDIA error (${res.status}) for ${model}`;
    }
};

export class NvidiaAdapter implements AIAdapter {
    private apikey = getApiKey();

    async generate({
        model,
        messages,
    }: {
        model: string;
        messages: AIMessage[];
    }) {
        const res = await fetch(`${BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apikey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(buildRequestBody({ model, messages })),
        });

        if (!res.ok) {
            throw new Error(await formatNvidiaError(res, model));
        }

        const data = await res.json();

        return {
            text: data.choices?.[0]?.message?.content || "",
            modelVersion: data.model,
        };
    }

    async *stream({
        model,
        messages,
        signal,
    }: {
        model: string;
        messages: AIMessage[];
        signal?: AbortSignal;
    }): AsyncGenerator<AIStreamChunk> {
        console.log("[nvidia.stream]", {
            phase: "request_start",
            model,
            messageCount: messages.length,
        });

        let res: Response;

        try {
            res = await fetch(`${BASE_URL}/chat/completions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.apikey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(
                    buildRequestBody({ model, messages, stream: true }),
                ),
                signal,
            });
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") {
                console.log("[nvidia.stream]", {
                    phase: "aborted_before_response",
                });
                yield { type: "aborted" };
                return;
            }

            yield {
                type: "error",
                error: "Failed to connect to NVIDIA API",
            };
            return;
        }

        if (!res.ok) {
            const errorMsg = await formatNvidiaError(res, model);

            console.log("[nvidia.stream]", {
                phase: "response_error",
                status: res.status,
                error: errorMsg,
            });

            yield {
                type: "error",
                error: errorMsg,
            };
            return;
        }

        console.log("[nvidia.stream]", {
            phase: "response_received",
            status: res.status,
        });

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            yield {
                type: "error",
                error: "No stream returned from NVIDIA",
            };
            return;
        }

        let buffer = "";
        let firstToken = false;
        let finishReason: string | null = null;

        try {
            while (true) {
                if (signal?.aborted) {
                    console.log("[nvidia.stream]", {
                        phase: "aborted_mid_stream",
                    });
                    yield { type: "aborted" };
                    return;
                }

                const { done, value } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith("data:")) continue;

                    const jsonStr = trimmed.replace("data:", "").trim();

                    if (jsonStr === "[DONE]") {
                        console.log("[nvidia.stream]", {
                            phase: "done_received",
                        });

                        yield {
                            type: "done",
                            finishReason: finishReason ?? "stop",
                            truncated: finishReason === "length",
                        };

                        return;
                    }

                    try {
                        const parsed = JSON.parse(jsonStr);
                        const choice = parsed.choices?.[0];

                        const text = choice?.delta?.content;

                        if (choice?.finish_reason) {
                            finishReason = choice.finish_reason;
                        }

                        if (text) {
                            if (!firstToken) {
                                console.log("[nvidia.stream]", {
                                    phase: "first_token",
                                });
                                firstToken = true;
                            }

                            yield {
                                type: "delta",
                                text,
                            };
                        }
                    } catch {
                        // Instead of silent ignore, at least preserve visibility in logs
                        console.log("[nvidia.stream]", {
                            phase: "malformed_chunk",
                            raw: jsonStr,
                        });
                    }
                }
            }

            // Stream ended without explicit [DONE]
            console.log("[nvidia.stream]", {
                phase: "stream_end_without_done",
                finishReason,
            });

            yield {
                type: "done",
                finishReason: finishReason ?? "unknown",
                truncated: !finishReason || finishReason === "length",
            };
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") {
                console.log("[nvidia.stream]", {
                    phase: "aborted_during_read",
                });
                yield { type: "aborted" };
                return;
            }

            console.log("[nvidia.stream]", {
                phase: "stream_error",
                error: err instanceof Error ? err.message : err,
            });

            yield {
                type: "error",
                error: "Stream parsing failed",
            };
        }
    }
}
