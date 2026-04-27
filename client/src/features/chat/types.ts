export type Role = "user" | "assistant";

export type Message = {
    id: string;
    role: Role;
    content: string;
    createdAt: string;
    isStreaming?: boolean;
    isAborted?: boolean;
};

export interface ApiMessage {
    _id: string;
    role: Role;
    content: string;
    createdAt: string;
}
