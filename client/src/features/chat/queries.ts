import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMessage, sendMessage } from "./api";
import type { ApiMessage, Message } from "./types";

const mapMessage = (msg: ApiMessage): Message => ({
  id: msg._id ?? crypto.randomUUID(),
  role: msg.role,
  content: msg.content,
  createdAt: msg.createdAt,
});

export const useMessages = (conversationId?: string) => {

  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessage(conversationId!),
    enabled: !!conversationId,
    select: (data) => (Array.isArray(data) ? data.map(mapMessage) : []),
    staleTime: 10_000,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessage,

    onMutate: async ({ conversationId, content }) => {
      await queryClient.cancelQueries({
        queryKey: ["messages", conversationId],
      });

      const previousMessages = queryClient.getQueryData<Message[]>([
        "messages",
        conversationId,
      ]);

      const tempAssistantId = `temp-ai-${crypto.randomUUID()}`;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };

      const assistantPlaceholder: Message = {
        id: tempAssistantId,
        role: "model",
        content: "",
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Message[]>(
        ["messages", conversationId],
        (old = []) => [...old, userMessage, assistantPlaceholder],
      );

      return {
        previousMessages,
        tempAssistantId,
        conversationId,
      };
    },

    onSuccess: (data, _vars, context) => {
      const serverMessages = data.messages.map(mapMessage);

      queryClient.setQueryData<Message[]>(
        ["messages", context.conversationId],
        (old = []) => {
          const filtered = old.filter((m) => m.id !== context.tempAssistantId);

          return [...filtered, ...serverMessages.slice(-1)];
        },
      );
    },

    onError: (_err, variables, context) => {
      queryClient.setQueryData(
        ["messages", variables.conversationId],
        context?.previousMessages || [],
      );
    },
  });
};
