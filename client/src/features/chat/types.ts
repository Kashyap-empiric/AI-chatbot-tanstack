export type Role = "user" | "assistant";

export type MessageStatus =
    | "pending"
    | "streaming"
    | "completed"
    | "aborted"
    | "error";

export type Message = {
    id: string;
    role: Role;
    content: string;
    createdAt: string;
    status: MessageStatus;
};

export interface ApiMessage {
    _id: string;
    role: Role;
    content: string;
    createdAt: string;
}
