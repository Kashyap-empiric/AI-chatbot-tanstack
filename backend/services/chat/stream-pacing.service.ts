const FRAME_INTERVAL_MS = 35;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type PacingInput = AsyncGenerator<{
    type: "meta" | "delta" | "done" | "error" | "aborted";
    text?: string;
    error?: string;
    [key: string]: any;
}>;

export const paceTextStream = async function* (
    source: PacingInput,
): AsyncGenerator<{
    type: "meta" | "delta" | "done" | "error" | "aborted";
    text?: string;
    error?: string;
    [key: string]: any;
}> {
    let error: string | null = null;
    let aborted = false;

    const controlQueue: any[] = [];

    /**
     * PRODUCER (lossless ingestion layer)
     */
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

    /**
     * CONSUMER LOOP
     */
    while (!done || controlQueue.length > 0) {
        /**
         * 1. flush control events first
         */
        if (controlQueue.length > 0) {
            const event = controlQueue.shift();

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

        /**
         * 2. idle wait for next frame
         */
        await wait(FRAME_INTERVAL_MS);
    }

    /**
     * ensure producer fully resolves
     */
    await producerPromise;

    /**
     * final terminal state
     */
    if (error) {
        yield { type: "error", error };
        return;
    }

    if (aborted) {
        yield { type: "aborted" };
        return;
    }

    /**
     * IMPORTANT:
     * DO NOT emit synthetic "done"
     * upstream owns termination
     */
};
