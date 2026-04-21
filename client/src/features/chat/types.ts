export type Role = "user" | "model";

export type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  status?: "pending" | "sent" | "failed"; // optional if you want UI state
};

export interface ApiMessage {
  _id: string;
  role: Role;
  content: string;
  createdAt: string;
}
