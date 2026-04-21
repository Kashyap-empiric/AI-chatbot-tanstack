import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchConversation, createConversation, deleteConversation, updateConversationTitle, } from "./api";
import type { Conversation } from "./types";

export const useConversations = () => {
    return useQuery({
        queryKey: ["conversations"],
        queryFn: fetchConversation,
    });
};

export const useCreateConversation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createConversation,
        onSuccess: (newConv) => {
            queryClient.setQueryData<Conversation[]>(["conversations"], (old = []) => [newConv, ...old],);
        },
    });
};

export const useDeleteConversation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteConversation,
        onSuccess: (_, id) => {
            queryClient.setQueryData<Conversation[]>(["conversations"], (old = []) =>
                old.filter((c) => c.id !== id),
            );
        },
    });
};

export const useUpdateConversationTitle = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, title }: { id: string; title: string }) =>
            updateConversationTitle(id, title),
        onSuccess: (updated) => {
            queryClient.setQueryData<Conversation[]>(["conversations"], (old = []) => old.map((c) => (c.id === updated.id ? updated : c)),);
        },
    });
};