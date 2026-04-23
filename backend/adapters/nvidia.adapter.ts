import { AIAdapter, AIMessage, AIStreamChunk } from "./base.adapter";

const getApiKey = () => {
    const key = process.env.NVIDIA_BUILD_API_KEY;
    if (!key) {
        throw new Error("NVIDIA_BUILD_API_KEY is not defined");
    }
    return key;
};

const BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_TIMEOUT_MS = 20_000;
const NVIDIA_FALLBACK_MODELS = [
    "meta/llama-3.1-8b-instruct",
    "microsoft/phi-4-mini-instruct",
];

const logNvidiaTiming = (
    phase: string,
    startedAt: number,
    details: Record<string, unknown> = {}
) => {
    console.log("[nvidia.stream]", {
        phase,
        elapsedMs: Date.now() - startedAt,
        ...details,
    });
};

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
    temperature: 0.7,
    max_tokens: 4096,
    stream,
});

const formatNvidiaError = async (res: Response, model: string) => {
    const raw = await res.text();
    let detail = raw;

    try {
        const parsed = JSON.parse(raw);
        detail =
            parsed.error?.message ||
            parsed.error?.detail ||
            parsed.detail ||
            raw;
    } catch {
        // Keep the raw text when NVIDIA returns a non-JSON error body.
    }

    const normalizedDetail = detail?.trim();

    if (res.status === 404) {
        return `NVIDIA model unavailable: ${model}. ${normalizedDetail || "The model or endpoint was not found."}`;
    }

    return `NVIDIA request failed: ${res.status}${normalizedDetail ? ` - ${normalizedDetail}` : ""}`;
};

const isAbortError = (error: unknown) =>
    error instanceof Error && error.name === "AbortError";

const getModelCandidates = (model: string) => {
    const candidates = [model, ...NVIDIA_FALLBACK_MODELS];
    return candidates.filter(
        (candidate, index) => candidates.indexOf(candidate) === index
    );
};

export class NvidiaAdapter implements AIAdapter {
    private apikey = getApiKey();

    private async fetchWithTimeout({
        model,
        messages,
        stream = false,
    }: {
        model: string;
        messages: AIMessage[];
        stream?: boolean;
    }) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), NVIDIA_TIMEOUT_MS);

        try {
            return await fetch(`${BASE_URL}/chat/completions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.apikey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(buildRequestBody({ model, messages, stream })),
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private async fetchWithFallback({
        model,
        messages,
        stream = false,
    }: {
        model: string;
        messages: AIMessage[];
        stream?: boolean;
    }) {
        const candidates = getModelCandidates(model);
        let lastError: Error | null = null;

        for (let index = 0; index < candidates.length; index += 1) {
            const candidate = candidates[index];
            const startedAt = Date.now();

            try {
                if (index > 0) {
                    console.warn("[nvidia.fallback]", {
                        phase: "model_selected",
                        requestedModel: model,
                        fallbackModel: candidate,
                        reason: "timeout",
                    });
                }

                const response = await this.fetchWithTimeout({
                    model: candidate,
                    messages,
                    stream,
                });

                logNvidiaTiming("headers_received", startedAt, {
                    model: candidate,
                    requestedModel: model,
                    status: response.status,
                });

                return {
                    response,
                    resolvedModel: candidate,
                };
            } catch (error) {
                if (!isAbortError(error)) {
                    throw error;
                }

                lastError = new Error(
                    `NVIDIA request timed out after ${NVIDIA_TIMEOUT_MS}ms for ${candidate}`
                );

                console.warn("[nvidia.fallback]", {
                    phase: "timeout",
                    requestedModel: model,
                    model: candidate,
                    elapsedMs: Date.now() - startedAt,
                    hasNextFallback: index < candidates.length - 1,
                });
            }
        }

        throw (
            lastError ||
            new Error(`NVIDIA request timed out after ${NVIDIA_TIMEOUT_MS}ms`)
        );
    }

    async generate({
        model,
        messages,
    }: {
        model: string;
        messages: AIMessage[];
    }) {
        const start = Date.now();
        console.log("[nvidia.generate]", {
            phase: "request_started",
            model,
            messageCount: messages.length,
        });

        const { response, resolvedModel } = await this.fetchWithFallback({
            model,
            messages,
        });

        if (!response.ok) {
            throw new Error(await formatNvidiaError(response, resolvedModel));
        }

        const data = await response.json();

        console.log("[nvidia.generate]", {
            phase: "response_parsed",
            model: resolvedModel,
            requestedModel: model,
            elapsedMs: Date.now() - start,
        });

        return {
            text: data.choices?.[0]?.message?.content || "",
            modelVersion: data.model,
        };
    }

    async *stream({
        model,
        messages,
    }: {
        model: string;
        messages: AIMessage[];
    }): AsyncGenerator<AIStreamChunk> {
        const start = Date.now();
        let firstTokenLogged = false;
        logNvidiaTiming("request_started", start, {
            model,
            messageCount: messages.length,
        });

        const {
            response: res,
            resolvedModel,
        } = await this.fetchWithFallback({
            model,
            messages,
            stream: true,
        });

        if (!res.ok) {
            const errorMessage = await formatNvidiaError(res, resolvedModel);
            console.error("NVIDIA API ERROR:", errorMessage);
            throw new Error(errorMessage);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder("utf-8");

        if (!reader) {
            throw new Error("No stream returned");
        }

        let buffer = "";
        let totalTokens = 0;
        let chunkCount = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();

                if (!trimmed || !trimmed.startsWith("data:")) continue;

                const jsonStr = trimmed.replace("data:", "").trim();

                if (jsonStr === "[DONE]") {
                    logNvidiaTiming("stream_complete", start, {
                        model: resolvedModel,
                        requestedModel: model,
                        chunkCount,
                        totalChars: totalTokens,
                    });

                    yield { text: "", done: true };
                    return;
                }

                try {
                    const parsed = JSON.parse(jsonStr);
                    const text = parsed.choices?.[0]?.delta?.content;

                    if (text) {
                        chunkCount += 1;
                        totalTokens += text.length;

                        if (!firstTokenLogged) {
                            logNvidiaTiming("first_token", start, {
                                model: resolvedModel,
                                requestedModel: model,
                                chunkCount,
                                totalChars: totalTokens,
                            });
                            firstTokenLogged = true;
                        }

                        yield { text, done: false };
                    }
                } catch {
                    console.error("CHUNK PARSE ERROR:", jsonStr);
                }
            }
        }

        logNvidiaTiming("stream_closed_without_done", start, {
            model: resolvedModel,
            requestedModel: model,
            chunkCount,
            totalChars: totalTokens,
        });
        yield { text: "", done: true };
    }
}
