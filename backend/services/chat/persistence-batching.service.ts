type PersistenceBatchingOptions = {
    flushIntervalMs?: number;
    maxBufferLength?: number;
};

type FlushHandler = (content: string, isFinal: boolean) => Promise<void> | void;

export class PersistenceBatcher {
    private buffer = "";
    private timer: ReturnType<typeof setInterval> | null = null;
    private isFinalized = false;

    private readonly flushIntervalMs: number;
    private readonly maxBufferLength: number;
    private readonly onFlush: FlushHandler;

    constructor(onFlush: FlushHandler, options?: PersistenceBatchingOptions) {
        this.onFlush = onFlush;
        this.flushIntervalMs = options?.flushIntervalMs ?? 1500;
        this.maxBufferLength = options?.maxBufferLength ?? 800;
    }

    start() {
        if (this.timer) return;

        this.timer = setInterval(() => {
            this.flush(false);
        }, this.flushIntervalMs);
    }

    append(text: string) {
        if (this.isFinalized) return;
        if (!text) return;

        this.buffer += text;

        if (this.buffer.length >= this.maxBufferLength) {
            this.flush(false);
        }
    }

    async flush(isFinal: boolean) {
        if (!this.buffer) return;

        const content = this.buffer;
        this.buffer = "";

        try {
            await this.onFlush(content, isFinal);
        } catch (err) {
            console.error("[PersistenceBatcher] flush failed", err);
        }
    }

    async finalize() {
        if (this.isFinalized) return;

        this.isFinalized = true;

        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        await this.flush(true);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}
