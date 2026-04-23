import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createConversation,
  deleteConversation,
  fetchConversation,
  updateConversationTitle,
} from "../api";
import type { Conversation } from "../types";

const conversationsKey = ["conversations"] as const;

export const useConversations = () => {
  return useQuery({
    queryKey: conversationsKey,
    queryFn: fetchConversation,
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createConversation,
    onSuccess: (newConversation) => {
      queryClient.setQueryData<Conversation[]>(conversationsKey, (current = []) => [
        newConversation,
        ...current,
      ]);
    },
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Conversation[]>(conversationsKey, (current = []) =>
        current.filter((conversation) => conversation.id !== deletedId)
      );
    },
  });
};

export const useUpdateConversationTitle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateConversationTitle(id, title),
    onSuccess: (updatedConversation) => {
      queryClient.setQueryData<Conversation[]>(conversationsKey, (current = []) =>
        current.map((conversation) =>
          conversation.id === updatedConversation.id
            ? updatedConversation
            : conversation
        )
      );
    },
  });
};
