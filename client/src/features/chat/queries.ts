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
    select: (data) =>
      Array.isArray(data) ? data.map(mapMessage) : [],
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

      const optimisticMessage: Message = {
        id: `temp-${crypto.randomUUID()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Message[]>(
        ["messages", conversationId],
        (old = []) => [...old, optimisticMessage]
      );

      return { previousMessages };
    },

    onSuccess: (data, variables) => {
      queryClient.setQueryData<Message[]>(
        ["messages", variables.conversationId],
        data.messages.map(mapMessage)
      );
    },

    onError: (_, variables, context) => {
      queryClient.setQueryData(
        ["messages", variables.conversationId],
        context?.previousMessages || []
      );
    },

    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId],
      });
    },
  });
};
