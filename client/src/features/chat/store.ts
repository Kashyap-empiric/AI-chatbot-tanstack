// import { create } from "zustand";
// import { fetchMessage, sendMessage as sendMessageApi } from "./api";
// import type { Message } from "./types";

// interface ChatState {
//   messages: Message[];
//   loading: boolean;
//   sending: boolean;
//   error: string | null;

//   loadMessages: (conversationId: string) => Promise<void>;
//   sendMessage: (conversationId: string, content: string) => Promise<void>;
//   clearMessages: () => void;
// }

// export const useChatStore = create<ChatState>((set) => ({
//   messages: [],
//   loading: false,
//   sending: false,
//   error: null,

//   loadMessages: async (conversationId: string) => {
//     set({ loading: true, error: null });
//     try {
//       const data = await fetchMessage(conversationId);
//       set({
//         messages: data,
//         loading: false,
//       });
//     } catch (err: any) {
//       set({
//         error: err.message || "Failed to load messages",
//         loading: false,
//       });
//     }
//   },

//   sendMessage: async (conversationId: string, content: string) => {
//     set({ sending: true, error: null });
//     const tempId = crypto.randomUUID();
//     const tempUserMessage: Message = {
//       id: tempId,
//       role: "user",
//       content,
//       createdAt: new Date().toISOString(),
//     };

//     set((state) => ({
//       messages: [...state.messages, tempUserMessage],
//     }));

//     try {
//       const response = await sendMessageApi({
//         conversationId,
//         content,
//       });
//       const newMessages: Message[] = response.messages;
//       set((state) => ({
//         messages: [
//           ...state.messages.filter((m) => m.id !== tempUserMessage.id),
//           ...newMessages
//         ],
//         sending: false,
//       }));
//     } catch (err: any) {
//       const fallbackMessage: Message = {
//         id: crypto.randomUUID(),
//         role: "model",
//         content: "Something went wrong. Please try again.",
//         createdAt: new Date().toISOString(),
//       };

//       set((state) => ({
//         messages: [
//           ...state.messages.filter((m) => m.id !== tempUserMessage.id),
//           tempUserMessage,
//           fallbackMessage,
//         ],
//         sending: false,
//         error: err.message || "Request failed",
//       }));
//     }
//   },

//   clearMessages: () => {
//     set({
//       messages: [],
//       loading: false,
//       sending: false,
//       error: null,
//     });
//   },
// }));
