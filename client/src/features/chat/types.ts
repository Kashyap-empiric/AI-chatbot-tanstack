export type Role = "user" | "assistant";

export type Message = {
    id: string;
    role: Role;
    content: string;
    createdAt: string;
    isStreaming?: boolean;
    isAborted?: boolean;
    status?: "streaming" | "completed" | "aborted" | "error";
};

export interface ApiMessage {
    _id: string;
    role: Role;
    content: string;
    createdAt: string;
}
