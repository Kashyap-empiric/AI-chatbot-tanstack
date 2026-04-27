import type { AIStreamChunk } from "../../adapters/base.adapter";

type StreamFactory<T> = (
    signal?: AbortSignal,
) => AsyncIterable<T> | Promise<AsyncIterable<T>>;
type Extractor<T> = (chunk: T) => {
    text?: string;
    done?: boolean;
    finishReason?: string;
};

export async function* aiStream<T>({
    factory,
    extract,
    signal,
}: {
    factory: StreamFactory<T>;
    extract: Extractor<T>;
    signal?: AbortSignal;
}): AsyncGenerator<AIStreamChunk> {
    try {
        const stream = await factory(signal);

        for await (const chunk of stream) {
            if (signal?.aborted) {
                yield { type: "aborted" };
                return;
            }
            const { text, done, finishReason } = extract(chunk);
            if (text) {
                yield { type: "delta", text };
            }
            if (done) {
                yield {
                    type: "done",
                    finishReason,
                    truncated: finishReason === "length",
                };
                return;
            }
        }
        yield { type: "done" };
    } catch (err) {
        if (signal?.aborted) {
            yield { type: "aborted" };
            return;
        }

        yield {
            type: "error",
            error: err instanceof Error ? err.message : "Stream failed",
        };
    }
}
