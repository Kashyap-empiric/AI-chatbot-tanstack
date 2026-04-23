export type Role = "user" | "model";

export type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  isStreaming?: boolean;
};

export interface ApiMessage {
  _id: string;
  role: Role;
  content: string;
  createdAt: string;
}
