import { useEffect, useRef, useLayoutEffect } from "react";
import { useParams } from "react-router-dom";
import { useChatStore } from "../../../app/store/chatStore";
import MessageItem from "./MessageItem";
import { useMessages } from "../services/chatQueries";
import { useStreaming } from "../hooks/useStreaming";

const MessageList = () => {
    const { id: conversationId } = useParams();

    const bottomRef = useRef<HTMLDivElement | null>(null);
    const hydratedConversationRef = useRef<string | null>(null);

    const messages = useChatStore((state) => state.messages);
    const activeConversationId = useChatStore(
        (state) => state.activeConversationId,
    );

    const streamingId = useChatStore((state) => state.streamingId);

    const setActiveConversation = useChatStore(
        (state) => state.setActiveConversation,
    );
    const setMessages = useChatStore((state) => state.setMessages);

    const { data: fetchedMessages = [], isLoading } =
        useMessages(conversationId);
    const { reconnectStream } = useStreaming();
    /**
     * Set active conversation ONLY
     */
    useEffect(() => {
        if (activeConversationId === (conversationId ?? null)) return;

        hydratedConversationRef.current = null;
        setActiveConversation(conversationId ?? null);
    }, [conversationId, setActiveConversation, activeConversationId]);

    /**
     * Hydration (safe against streaming race conditions)
     */
    useEffect(() => {
        if (
            !conversationId ||
            isLoading ||
            activeConversationId !== conversationId ||
            hydratedConversationRef.current === conversationId
        ) {
            return;
        }

        setMessages(fetchedMessages);
        hydratedConversationRef.current = conversationId;
        reconnectStream(conversationId);
    }, [
        activeConversationId,
        conversationId,
        fetchedMessages,
        isLoading,
        setMessages,
        streamingId,
        reconnectStream,
    ]);

    /**
     * Scroll management
     */
    useLayoutEffect(() => {
        bottomRef.current?.scrollIntoView({
            behavior: "auto",
            block: "end",
        });
    }, [messages, streamingId]);

    if (!conversationId) {
        return (
            <div className="flex-1 flex items-center justify-center text-neutral-400">
                Select a conversation
            </div>
        );
    }

    if (isLoading && messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-neutral-400">
                Loading messages...
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto flex justify-center w-full bg-[#212121]">
            <div className="max-w-4xl w-full px-4 md:px-6 space-y-4">
                {messages.map((msg) => (
                    <MessageItem key={msg.id} message={msg} />
                ))}

                <div
                    key={streamingId ?? "idle"}
                    ref={bottomRef}
                    className="h-1"
                />
            </div>
        </div>
    );
};

export default MessageList;
