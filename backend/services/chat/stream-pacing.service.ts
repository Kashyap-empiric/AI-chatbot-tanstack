const FRAME_INTERVAL_MS = 40;

const MIN_CHARS_PER_FRAME = 2;
const MAX_CHARS_PER_FRAME = 12;

const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

type SourceChunk = {
    type: "token" | "done";
    text?: string;
    metadata?: unknown;
};

export const paceTextStream = async function* (
    source: AsyncGenerator<SourceChunk>
) {
    let buffer = "";
    let done = false;
    let error: unknown = null;
    let finalMetadata: unknown = null;

    /**
     * Producer: fills buffer as fast as LLM emits
     * No pacing logic here.
     */
    const producer = (async () => {
        try {
            for await (const chunk of source) {
                if (chunk.type === "token" && chunk.text) {
                    buffer += chunk.text;
                }

                if (chunk.type === "done") {
                    finalMetadata = chunk.metadata;
                    done = true;
                }
            }
        } catch (err) {
            error = err;
        } finally {
            done = true;
        }
    })();

    /**
     * Consumer clock:
     * - fixed interval
     * - fixed max emission per tick
     * - no adaptive sizing
     */
    while (!done || buffer.length > 0) {
        if (buffer.length === 0) {
            await wait(FRAME_INTERVAL_MS);
            continue;
        }

        const charsToEmit = Math.min(
            MAX_CHARS_PER_FRAME,
            Math.max(MIN_CHARS_PER_FRAME, MAX_CHARS_PER_FRAME)
        );

        const chunk = buffer.slice(0, charsToEmit);
        buffer = buffer.slice(charsToEmit);

        yield {
            type: "delta",
            text: chunk,
        };

        await wait(FRAME_INTERVAL_MS);
    }

    await producer;

    if (error) {
        throw error;
    }

    yield {
        type: "complete",
        metadata: finalMetadata,
    };
};
