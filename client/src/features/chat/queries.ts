import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMessage, streamMessage } from "./api";
import type { ApiMessage, Message } from "./types";

type SendMessagePayload = {
  conversationId: string;
  content: string;
};

const mapMessage = (msg: ApiMessage): Message => ({
  id: msg._id ?? crypto.randomUUID(),
  role: msg.role,
  content: msg.content,
  createdAt: msg.createdAt,
});

export const useMessages = (conversationId?: string) => {
  return useQuery({
    queryKey: ["messages", String(conversationId)],
    queryFn: () => fetchMessage(conversationId!),
    enabled: !!conversationId,
    select: (data) => (Array.isArray(data) ? data.map(mapMessage) : []),
    staleTime: 10_000,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, SendMessagePayload>({
    mutationFn: async (vars) => vars,

    onMutate: async ({ conversationId, content }) => {
      const key = ["messages", String(conversationId)];

      await queryClient.cancelQueries({ queryKey: key });

      const previousMessages = queryClient.getQueryData<Message[]>(key);

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

      queryClient.setQueryData<Message[]>(key, (old = []) => [
        ...old,
        userMessage,
        assistantPlaceholder,
      ]);

      let fullText = "";

      streamMessage(
        { conversationId, content },
        (token) => {
          fullText += token;

          queryClient.setQueryData<Message[]>(key, (old = []) =>
            old.map((m) =>
              m.id === tempAssistantId
                ? { ...m, content: fullText }
                : m
            )
          );
        },
        () => {
          // FINAL COMMIT (prevents UI stuck state)
          queryClient.setQueryData<Message[]>(key, (old = []) =>
            old.map((m) =>
              m.id === tempAssistantId
                ? { ...m, content: fullText }
                : m
            )
          );
        }
      );

      return {
        previousMessages,
        tempAssistantId,
        conversationId,
      };
    },

    onError: (_err, variables, context) => {
      const key = ["messages", String(variables.conversationId)];

      queryClient.setQueryData(
        key,
        context?.previousMessages || []
      );
    },
  });
};
