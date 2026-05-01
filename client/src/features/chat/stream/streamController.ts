// // streamController.ts

// type StreamEvent =
//     | { type: "meta"; [key: string]: any }
//     | { type: "delta"; text: string }
//     | { type: "done" }
//     | { type: "error"; error?: string }
//     | { type: "aborted" };

// type Callback = (event: StreamEvent) => void;

// const API_BASE_URL = "http://localhost:5000/api";

// export class StreamController {
//     private source: EventSource | null = null;

//     private streamId: string;
//     private onEvent: Callback;

//     constructor(streamId: string, onEvent: Callback) {
//         this.streamId = streamId;
//         this.onEvent = onEvent;
//     }

//     start() {
//         this.source = new EventSource(
//             `${API_BASE_URL}/chat/stream/${this.streamId}`,
//             { withCredentials: true },
//         );

//         this.source.addEventListener("meta", (e: any) => {
//             this.onEvent({
//                 type: "meta",
//                 ...JSON.parse(e.data),
//             });
//         });

//         this.source.addEventListener("delta", (e: any) => {
//             this.onEvent({
//                 type: "delta",
//                 text: JSON.parse(e.data)?.text,
//             });
//         });

//         this.source.addEventListener("done", () =>
//             this.onEvent({ type: "done" }),
//         );

//         this.source.addEventListener("aborted", () =>
//             this.onEvent({ type: "aborted" }),
//         );

//         this.source.addEventListener("error", (e: any) => {
//             try {
//                 this.onEvent({
//                     type: "error",
//                     error: JSON.parse(e.data)?.error,
//                 });
//             } catch {
//                 this.onEvent({
//                     type: "error",
//                     error: "stream_error",
//                 });
//             }
//         });
//     }

//     stop() {
//         this.source?.close();
//         this.source = null;
//     }
// }
