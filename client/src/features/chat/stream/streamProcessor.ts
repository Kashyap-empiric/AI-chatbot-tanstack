// // streamProcessor.ts

// type StreamEvent =
//     | { type: "meta"; [key: string]: any }
//     | { type: "delta"; text: string }
//     | { type: "done" }
//     | { type: "error"; error?: string }
//     | { type: "aborted" };

// type ProcessorOutput =
//     | { type: "meta"; data: any }
//     | { type: "chunk"; text: string }
//     | { type: "final" }
//     | { type: "error"; error?: string }
//     | { type: "aborted" };

// type ProcessorConfig = {
//     flushInterval?: number;
//     maxBuffer?: number;
// };

// export class StreamProcessor {
//     private buffer = "";
//     private lastFlush = Date.now();
//     private config: Required<ProcessorConfig>;

//     constructor(config?: ProcessorConfig) {
//         this.config = {
//             flushInterval: config?.flushInterval ?? 80,
//             maxBuffer: config?.maxBuffer ?? 1200,
//         };
//     }

//     push(event: StreamEvent): ProcessorOutput[] {
//         const out: ProcessorOutput[] = [];

//         // META
//         if (event.type === "meta") {
//             out.push({ type: "meta", data: event });
//             return out;
//         }

//         // DELTA (accumulate)
//         if (event.type === "delta") {
//             this.buffer += event.text;

//             const shouldFlush =
//                 this.buffer.length >= this.config.maxBuffer ||
//                 Date.now() - this.lastFlush >= this.config.flushInterval ||
//                 /[.!?\n]$/.test(this.buffer);

//             if (shouldFlush) {
//                 out.push({ type: "chunk", text: this.buffer });
//                 this.buffer = "";
//                 this.lastFlush = Date.now();
//             }

//             return out;
//         }

//         // FINAL FLUSH
//         if (event.type === "done") {
//             if (this.buffer.length) {
//                 out.push({ type: "chunk", text: this.buffer });
//                 this.buffer = "";
//             }
//             out.push({ type: "final" });
//             return out;
//         }

//         if (event.type === "error") {
//             return [{ type: "error", error: event.error }];
//         }

//         if (event.type === "aborted") {
//             return [{ type: "aborted" }];
//         }

//         return out;
//     }
// }
