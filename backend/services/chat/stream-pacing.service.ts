const FRAME_INTERVAL_MS = 35;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

import { AIStreamChunk } from "../../adapters/base.adapter";

type PacingInput = AsyncGenerator<AIStreamChunk>;

export const paceTextStream = async function* (
    source: PacingInput,
): AsyncGenerator<AIStreamChunk> {
    let error: string | null = null;
    let aborted = false;

    const controlQueue: AIStreamChunk[] = [];

    const producerPromise = (async () => {
        try {
            for await (const chunk of source) {
                if (chunk.type === "meta") {
                    controlQueue.push(chunk);
                    continue;
                }

                if (chunk.type === "delta") {
                    controlQueue.push(chunk);
                    continue;
                }

                if (chunk.type === "error") {
                    error = chunk.error || "UNKNOWN_ERROR";
                    controlQueue.push(chunk);
                    return;
                }

                if (chunk.type === "aborted") {
                    aborted = true;
                    controlQueue.push(chunk);
                    return;
                }

                if (chunk.type === "done") {
                    controlQueue.push(chunk);
                    return;
                }
            }
        } catch {
            error = "PACING_SOURCE_ERROR";
        }
    })();

    let done = false;

    while (!done || controlQueue.length > 0) {
        if (controlQueue.length > 0) {
            const event = controlQueue.shift()!;

            yield event;

            if (event.type === "error") {
                return;
            }

            if (event.type === "aborted") {
                return;
            }

            if (event.type === "done") {
                done = true;
            }

            continue;
        }

        await wait(FRAME_INTERVAL_MS);
    }

    await producerPromise;

    if (error) {
        yield { type: "error", error };
        return;
    }

    if (aborted) {
        yield { type: "aborted" };
        return;
    }
};
